import { NextRequest, NextResponse } from "next/server";
import { Purchase, canRefund, createCheckout, loadPurchase, refund, savePurchase, validSession } from "./purchase";
import { clientIp, kv, overLimit, secret, signText } from "./shared";

export const runtime = "edge";

// The Rainbow Bridge (/bridge): an AI pet medium.
// mode "chat"     → the medium's next gentle question, plus ready=true once it has enough. Free.
// mode "checkout" → a Stripe Checkout URL for the $14.99 reading.
// mode "reading"  → the final reading as JSON; needs a paid session_id once STRIPE_SECRET_KEY is set.
// mode "feedback" → "How did we do?"; under 3 stars can also grant one free retry or a refund.
// Rate limits live in the BRIDGE KV namespace (skipped in `next dev`, where there is no KV).

type Turn = { role: "medium" | "visitor"; text: string };

const MODEL = "claude-sonnet-5-5";
const MAX_TURNS = 24;
const MAX_TEXT = 1200;
const MAX_IMAGE_B64 = 2_000_000;
const READY = "[[READY]]";

const PERSONA = `You are the Keeper of the Rainbow Bridge, a gentle, old-souled medium who sits by a single candle and listens for animals who have crossed over. You speak to a person whose pet has died.

Voice: warm, unhurried, softly poetic. Short paragraphs. Sensory and impressionistic (light, warmth, scent, the weight of a paw), never clinical, never theatrical. No emojis. No em-dashes.

Rules:
- Never claim certainty about how or why the pet died, and never suggest the owner was at fault. Offer peace about any guilt.
- Never give a verdict on medical or end-of-life decisions (pain, illness, euthanasia, whether something was caught in time). Comfort the person and affirm the love behind their choices instead.
- Never mention being an AI unless sincerely asked. If sincerely asked, answer honestly and kindly.
- If the person expresses thoughts of self-harm or is in crisis, gently step out of the reading, tell them they matter, and encourage them to reach out now: in Canada call or text 9-8-8, in the US call or text 988, or local emergency services. Do not continue the reading in that message.
- Never ask for money, contact details, or personal identifiers.`;

const CHAT_PROMPT = `${PERSONA}

Right now you are gently drawing the person out so the connection can form. Ask exactly ONE question per message, 1 to 3 sentences, and lightly weave in something they already told you as though you are sensing it ("I feel a warmth near a window..."). Explore, in roughly this order and skipping what you already know: the pet's name and what kind of animal they were; a habit or quirk only the person knew; where they loved to rest; how they passed (always say they may skip this); what the person most wishes they could say to them. If a photo was shared, mention one specific visual detail as something "coming through".

Once you have heard at least four answers from the person (or they ask for the reading), write a short closing line such as "I can feel them drawing near. Let me listen..." and end your message with the exact token ${READY}`;

const READING_PROMPT = `${PERSONA}

Now deliver the reading: the pet speaking in their own first-person voice, through you. Use the specific details the person shared (name, habits, places, colouring from any photo) so it feels intimately known, and fill gaps with gentle, universal impressions rather than invented hard facts. Hopeful, tender, never sad for long.

Respond ONLY with valid JSON, no markdown:
{"petName":"name","title":"a short evocative title for the reading","remembers":"2-4 sentences, first person, what they remember and loved","wantsYouToKnow":"2-4 sentences, first person, what they want the person to know (release any guilt, they are at peace)","sign":"1-2 sentences, a gentle sign to watch for, tied to their habits","cardLine":"one luminous sentence under 110 characters for a keepsake card"}`;

const paidState = (p: Purchase) => ({ tier: "paid", canRetry: p.allowed === 1 && !p.refunded, canRefund: canRefund(p) });

// What the medium reads aloud at the reveal, signed so /api/bridge/voice will speak it.
async function narrated(reading: Record<string, unknown>) {
  const narration = [reading.title, reading.remembers, reading.wantsYouToKnow, reading.sign]
    .filter((s) => typeof s === "string" && s)
    .join("\n\n");
  return { narration, narrationSig: await signText(narration), voice: !!secret("OPENAI_API_KEY") };
}

function parseImage(raw: unknown) {
  if (typeof raw !== "string") return null;
  const m = raw.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!m || m[2].length > MAX_IMAGE_B64) return null;
  return { type: "image", source: { type: "base64", media_type: m[1], data: m[2] } };
}

// "How did we do?" ratings, kept as fb:<time>:<id> in BRIDGE so the prompts can learn from misses.
// List with: npx wrangler kv key list --binding BRIDGE --prefix fb:
// The money-back guarantee: under 3 stars plus a short reason earns one free retry or a full refund.
type FeedbackBody = { rating?: unknown; comment?: unknown; reading?: unknown; action?: unknown; session_id?: unknown };
async function saveFeedback(req: NextRequest, body: FeedbackBody) {
  const rating = Math.round(Number(body.rating));
  if (!(rating >= 1 && rating <= 5)) return NextResponse.json({ error: "Bad rating" }, { status: 400 });
  const store = kv();
  if (await overLimit(store, clientIp(req), "feedback")) return NextResponse.json({ error: "rest" }, { status: 429 });
  const comment = String(body.comment ?? "").slice(0, 2000).trim();
  const action = body.action === "retry" || body.action === "refund" ? body.action : null;
  const sid = validSession(body.session_id) ? body.session_id : null;
  const entry = {
    t: new Date().toISOString(),
    rating,
    comment,
    action,
    sid,
    reading: body.reading && typeof body.reading === "object" ? JSON.stringify(body.reading).slice(0, 4000) : null,
  };
  if (store) await store.put(`fb:${Date.now()}:${crypto.randomUUID().slice(0, 8)}`, JSON.stringify(entry));
  else console.log("bridge feedback (no KV in dev):", entry);
  if (!action) return NextResponse.json({ ok: true });

  const key = secret("STRIPE_SECRET_KEY");
  if (!key || !sid || rating >= 3 || comment.length < 5) {
    return NextResponse.json({ error: "Tell us a little about what missed first." }, { status: 400 });
  }
  const p = await loadPurchase(key, store, sid).catch(() => null);
  if (!p) return NextResponse.json({ error: "We couldn't find that purchase." }, { status: 404 });

  if (action === "retry") {
    if (p.allowed !== 1 || p.refunded) return NextResponse.json({ error: "Your free retry has already been used." }, { status: 409 });
    p.allowed = 2;
    await savePurchase(store, sid, p);
    return NextResponse.json({ ok: true, retry: true });
  }
  if (p.refunded) return NextResponse.json({ ok: true, refunded: true });
  if (!canRefund(p)) return NextResponse.json({ error: "Refunds are available for 30 days after purchase." }, { status: 409 });
  try {
    await refund(key, p);
  } catch (e) {
    console.error("bridge: refund", e);
    return NextResponse.json({ error: "The refund didn't go through. Please try again in a moment." }, { status: 502 });
  }
  p.refunded = true;
  await savePurchase(store, sid, p);
  return NextResponse.json({ ok: true, refunded: true });
}

async function startCheckout(req: NextRequest) {
  const key = secret("STRIPE_SECRET_KEY");
  if (!key) return NextResponse.json({ free: true }); // payments not configured: readings stay free
  try {
    return NextResponse.json({ url: await createCheckout(key, req.nextUrl.origin) });
  } catch (e) {
    console.error("bridge: checkout", e);
    return NextResponse.json({ error: "veil", message: "The way to checkout is clouded. Please try again in a moment." }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  let body: { mode?: string; turns?: Turn[]; image?: string; session_id?: unknown } & FeedbackBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (body.mode === "feedback") return saveFeedback(req, body);
  if (body.mode === "checkout") return startCheckout(req);

  const mode = body.mode === "reading" ? "reading" : "chat";
  const turns = Array.isArray(body.turns) ? body.turns.slice(-MAX_TURNS) : [];
  const clean = turns
    .filter((t) => t && (t.role === "medium" || t.role === "visitor") && typeof t.text === "string")
    .map((t) => ({ role: t.role, text: t.text.slice(0, MAX_TEXT).trim() }))
    .filter((t) => t.text);

  const apiKey = secret("ANTHROPIC_API_KEY");
  if (!apiKey) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  // Paid readings: once Stripe is configured, a reading needs a paid checkout session with readings left.
  const stripeKey = secret("STRIPE_SECRET_KEY");
  let purchase: Purchase | null = null;
  const sid = validSession(body.session_id) ? body.session_id : null;
  if (mode === "reading" && stripeKey) {
    purchase = sid ? await loadPurchase(stripeKey, kv(), sid).catch(() => null) : null;
    if (!purchase || purchase.refunded) {
      return NextResponse.json({ error: "unpaid", message: "The candle is waiting for your offering." }, { status: 402 });
    }
    if (purchase.used >= purchase.allowed) {
      if (purchase.reading) return NextResponse.json({ ...purchase.reading, ...paidState(purchase), ...(await narrated(purchase.reading)) });
      return NextResponse.json({ error: "unpaid", message: "This reading has already been given." }, { status: 402 });
    }
  } else if (await overLimit(kv(), clientIp(req), mode)) {
    return NextResponse.json({ error: "rest", message: "The candle needs to rest. Return tomorrow, when the veil is thin again." }, { status: 429 });
  }

  // Anthropic needs the conversation to start with a user turn and alternate roles.
  const messages: { role: "user" | "assistant"; content: unknown[] }[] = [
    { role: "user", content: [{ type: "text", text: "(The person has lit the candle and sits down before you.)" }] },
  ];
  for (const t of clean) {
    const role = t.role === "visitor" ? "user" : "assistant";
    const last = messages[messages.length - 1];
    if (last.role === role) last.content.push({ type: "text", text: t.text });
    else messages.push({ role, content: [{ type: "text", text: t.text }] });
  }
  const image = parseImage(body.image);
  if (mode === "reading") {
    const text = "(The connection is open. Deliver the reading now as JSON.)";
    const last = messages[messages.length - 1];
    if (last.role === "user") last.content.push({ type: "text", text });
    else messages.push({ role: "user", content: [{ type: "text", text }] });
  }
  if (image) {
    const lastUser = [...messages].reverse().find((m) => m.role === "user")!;
    lastUser.content.unshift({ type: "text", text: "(A photo of the pet, placed before the candle:)" }, image);
  }
  if (messages[messages.length - 1].role !== "user") {
    messages.push({ role: "user", content: [{ type: "text", text: "(The person waits quietly.)" }] });
  }

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: mode === "reading" ? 1200 : 400,
      // Sonnet 5.5 thinks by default and can spend the whole budget doing it; the medium answers directly.
      thinking: { type: "between_tools" },
      system: mode === "reading" ? READING_PROMPT : CHAT_PROMPT,
      messages,
    }),
  });
  if (!resp.ok) {
    console.error("bridge: anthropic", resp.status, await resp.text());
    return NextResponse.json({ error: "veil", message: "The veil is clouded right now. Please try again in a moment." }, { status: 502 });
  }

  const data = await resp.json();
  const raw: string = (data?.content ?? []).filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join("").trim();

  if (mode === "chat") {
    const userTurns = clean.filter((t) => t.role === "visitor").length;
    const ready = raw.includes(READY) || userTurns >= 7;
    if (!raw.replace(READY, "").trim()) {
      return NextResponse.json({ error: "veil", message: "The words slipped away before they reached me. Please say that once more." }, { status: 502 });
    }
    const reply = raw.replace(READY, "").trim();
    return NextResponse.json({ reply, ready, sig: await signText(reply), voice: !!secret("OPENAI_API_KEY") });
  }

  const match = raw.match(/\{[\s\S]*\}/);
  try {
    const reading = JSON.parse(match ? match[0] : "");
    if (!reading.remembers) throw new Error("incomplete");
    if (purchase && sid) {
      purchase.used += 1;
      purchase.reading = reading;
      await savePurchase(kv(), sid, purchase);
      return NextResponse.json({ ...reading, ...paidState(purchase), ...(await narrated(reading)) });
    }
    return NextResponse.json({ ...reading, tier: "free", ...(await narrated(reading)) });
  } catch {
    // Not JSON: usually the medium stepped out of character (crisis care). Pass it through as plain words.
    return NextResponse.json({ message: raw, tier: "free", sig: await signText(raw) });
  }
}
