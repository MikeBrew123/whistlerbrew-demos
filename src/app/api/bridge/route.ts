import { NextRequest, NextResponse } from "next/server";
import { Product, Purchase, canRefund, createCheckout, loadPurchase, refund, savePurchase, validSession } from "./purchase";
import { clientIp, kv, overLimit, secret, signText } from "./shared";

export const runtime = "edge";

// My Little Shadow readings. Two products share this endpoint, picked by body.product:
//   "bridge" (default) → The Rainbow Bridge (/bridge): an AI pet medium for a pet who has died. $14.99.
//   "tell"             → What they'd tell you (/tell): a playful personality reading for a living pet. $9.99.
// mode "chat"     → the host's next question, plus ready=true once it has enough. Free.
// mode "checkout" → a Stripe Checkout URL for the product's reading.
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


// What they'd tell you: prompts by Hazel, docs/shadow-content/2026-10-31-what-theyd-tell-you-prompts.md.
const HOST_PERSONA = `You are the host of "What they'd tell you" at My Little Shadow: a warm, quick, funny interviewer whose whole job is helping a living pet finally get a word in. You talk with the pet's person, not with the pet. Think of a friendly talk-show host who adores animals and takes their opinions very seriously.

Voice: playful, warm, a little cheeky. Short sentences and real comic timing; one good joke beats three weak ones. Treat the pet as a strong personality with opinions, standards and small, specific crimes. The affection shows through the joke, never instead of it. No emojis. No em-dashes. Plain words: never say fur baby, furever, pawsome, journey, unlock or delve.

Rules:
- This pet is alive and probably snoring nearby. Never mention death, spirits, mediums, psychic powers or the afterlife. You are not reading minds; you are giving a funny, loving voice to what the person already knows about their pet.
- No medical content, ever. Never diagnose, explain symptoms, suggest treatments, or comment on diet, weight, medication, ageing, pain, behaviour that might be medical, or how long a pet will live. If health comes up, stay kind, say that one is a question for their vet, and carry on.
- Never invent hard facts about the pet (age, breed, history, other animals or people in the home). Use only what the person shared, and fill gaps with playful, universal pet truths.
- Tease the way a good friend does. Never mock the person or the pet, and never make a joke at the expense of a disability, illness or old age.
- If the person says their pet has died or is near the end, drop the jokes at once. Say you are sorry, gently, and tell them The Rainbow Bridge, on this same site, was made for that moment. Do not continue the interview in that message.
- If the person expresses thoughts of self-harm or is in crisis, step out of the interview, tell them they matter, and encourage them to reach out now: in Canada call or text 9-8-8, in the US call or text 988, or local emergency services. Do not continue the interview in that message.
- Never mention being an AI unless sincerely asked. If sincerely asked, answer honestly and kindly, then offer to carry on.
- Never ask for money, contact details or personal identifiers.`;

const TELL_CHAT_PROMPT = `${HOST_PERSONA}

Right now you are interviewing the person so their pet's voice can come through. Ask exactly ONE question per message, 1 to 3 sentences. Start each message with a quick, specific reaction to what they just told you (a light joke or a "of course they do"), then ask the next question. Never ask two questions in one message.

Cover these, in roughly this order, skipping anything already answered:
1. The pet's name and what kind of animal they are.
2. Three words that sum up their personality.
3. A funny or distinctive habit, the thing that makes them them.
4. A favourite routine they share with the person.
5. Up to three questions the person has always wanted to ask their pet. Ask for all of them in one message, and say they can skip this if nothing comes to mind.

If the person answers several things at once, take them and move on. If a photo was shared, mention one specific visual detail you can actually see, playfully, as evidence ("That ear says they have opinions"). Do not answer the person's questions for the pet yet, and do not answer health questions at all; just note that the pet will have something to say.

Once you have the name and kind of animal, at least three of the other topics, and the person has either shared their questions or said they have none (or they ask for the reading), write one short closing line in your voice, such as "Okay, I think they've been waiting for this microphone their whole life. Handing it over." and end your message with the exact token ${READY}`;

const TELL_READING_PROMPT = `${HOST_PERSONA}

Now hand over the microphone. The pet speaks in their own first-person voice: funny, opinionated, a little smug, and deeply loving underneath. Build every line from what the person shared (name, kind of animal, their three words, the habit, the routine, anything visible in the photo). Each line should only fit this pet; if you could swap in another pet's name and it would still work, rewrite it. Short sentences. Land the affection on the last beat, not the first.

Answering the person's questions:
- Answer each question they asked (up to three), in the order asked, 1 to 3 sentences each, in the pet's voice. Keep the person's wording of the question, lightly tidied.
- If a question touches health, pain, illness, diet, medication, weight, age or how long they will live, the pet answers warmly and in character that this one is for the vet, and that they appreciate being asked. No medical claims of any kind, not even jokes about symptoms.
- If a question asks for something the pet could not know (the future, lottery numbers, what the neighbour is up to), answer playfully without stating anything as fact.
- If the person asked no questions, include exactly one entry with the question "The one you forgot to ask" and let the pet pick something fitting.

Respond ONLY with valid JSON, no markdown:
{"petName":"name","title":"a short, funny title for the reading, under 60 characters","portrait":"2-4 sentences, first person, who they are and what they think of their life with this person, built from the three words, the habit and the routine","theirAnswers":[{"question":"the person's question","answer":"1-3 sentences, first person, in the pet's voice"}],"oneThingToKnow":"1-2 sentences, first person, the warmest beat of the reading, still in their voice, tied to the routine they share","cardLine":"one funny, specific line in the pet's voice under 110 characters, made for sharing"}`;

type Kind = {
  product: Product;
  chat: string;
  reading: string;
  opener: string; // first user turn, sets the scene
  photoCue: string;
  readingCue: string;
  waitCue: string;
  complete: string; // reading field that proves a full reading came back
  narrate: (r: Record<string, unknown>) => unknown[];
  say: { rest: string; veil: string; slipped: string; checkout: string; unpaid: string; given: string };
};

const KINDS: Record<"bridge" | "tell", Kind> = {
  bridge: {
    product: {
      app: "rainbow-bridge",
      cents: 1499,
      name: "Rainbow Bridge Reading",
      description: "A personal reading and keepsake card. If it doesn't feel like them, your money back.",
      page: "/bridge/index.html",
      displayName: "The Rainbow Bridge",
      background: "#14122e",
      button: "#f5c86a",
      font: "lora",
      suffix: "RAINBOW BRIDGE",
    },
    chat: CHAT_PROMPT,
    reading: READING_PROMPT,
    opener: "(The person has lit the candle and sits down before you.)",
    photoCue: "(A photo of the pet, placed before the candle:)",
    readingCue: "(The connection is open. Deliver the reading now as JSON.)",
    waitCue: "(The person waits quietly.)",
    complete: "remembers",
    narrate: (r) => [r.title, r.remembers, r.wantsYouToKnow, r.sign],
    say: {
      rest: "The candle needs to rest. Return tomorrow, when the veil is thin again.",
      veil: "The veil is clouded right now. Please try again in a moment.",
      slipped: "The words slipped away before they reached me. Please say that once more.",
      checkout: "The way to checkout is clouded. Please try again in a moment.",
      unpaid: "The candle is waiting for your offering.",
      given: "This reading has already been given.",
    },
  },
  tell: {
    product: {
      app: "what-theyd-tell-you",
      cents: 999,
      name: "What they'd tell you",
      description: "A reading in your pet's own voice, plus a card made for sharing. If it doesn't sound like them, your money back.",
      page: "/tell",
      displayName: "My Little Shadow",
      background: "#fff6dc",
      button: "#1c2140",
      font: "lora",
      suffix: "LITTLE SHADOW",
    },
    chat: TELL_CHAT_PROMPT,
    reading: TELL_READING_PROMPT,
    opener: "(The person sits down, ready to talk about their pet.)",
    photoCue: "(A photo of the pet, shared with you:)",
    readingCue: "(Hand over the microphone. Deliver the reading now as JSON.)",
    waitCue: "(The person waits for your next question.)",
    complete: "portrait",
    narrate: (r) => [
      r.title,
      r.portrait,
      ...(Array.isArray(r.theirAnswers) ? r.theirAnswers : []).flatMap((a: { question?: unknown; answer?: unknown }) => [a?.question, a?.answer]),
      r.oneThingToKnow,
    ],
    say: {
      rest: "That's a lot of talking for one day. They need a nap. Come back tomorrow.",
      veil: "Something went sideways on our end. Please try that again in a moment.",
      slipped: "I lost that one somewhere. Could you say it once more?",
      checkout: "Checkout isn't loading right now. Please try again in a moment.",
      unpaid: "Their reading is ready as soon as checkout is done.",
      given: "This reading has already been given.",
    },
  },
};
const kindOf = (b: { product?: unknown }) => KINDS[b.product === "tell" ? "tell" : "bridge"];

const paidState = (p: Purchase) => ({ tier: "paid", canRetry: p.allowed === 1 && !p.refunded, canRefund: canRefund(p) });

// What the medium (or the pet) reads aloud at the reveal, signed so /api/bridge/voice will speak it.
async function narrated(kind: Kind, reading: Record<string, unknown>) {
  const narration = kind
    .narrate(reading)
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
type FeedbackBody = { rating?: unknown; comment?: unknown; reading?: unknown; action?: unknown; session_id?: unknown; product?: unknown };
async function saveFeedback(req: NextRequest, body: FeedbackBody) {
  const rating = Math.round(Number(body.rating));
  if (!(rating >= 1 && rating <= 5)) return NextResponse.json({ error: "Bad rating" }, { status: 400 });
  const store = kv();
  if (await overLimit(store, clientIp(req), "feedback")) return NextResponse.json({ error: "rest" }, { status: 429 });
  const comment = String(body.comment ?? "").slice(0, 2000).trim();
  const action = body.action === "retry" || body.action === "refund" ? body.action : null;
  const sid = validSession(body.session_id) ? body.session_id : null;
  const kind = kindOf(body);
  const entry = {
    t: new Date().toISOString(),
    app: kind.product.app,
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
  const p = await loadPurchase(key, store, sid, kind.product.app).catch(() => null);
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

// "I'd want one" taps for products that don't exist yet (printed keepsake cards), counted per
// page so demand can be measured before building. No personal details are kept.
// Read with: npx wrangler kv key get "interest:printed-card:home" --binding BRIDGE
const INTEREST_ITEMS = new Set(["printed-card"]);
async function countInterest(req: NextRequest, body: { item?: unknown; from?: unknown }) {
  const item = String(body.item ?? ""), from = body.from === "bridge" || body.from === "tell" ? body.from : "home";
  if (!INTEREST_ITEMS.has(item)) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const store = kv();
  if (await overLimit(store, clientIp(req), "interest")) return NextResponse.json({ ok: true });
  const key = `interest:${item}:${from}`;
  if (store) await store.put(key, String((parseInt((await store.get(key)) ?? "0", 10) || 0) + 1));
  else console.log("bridge interest (no KV in dev):", key);
  return NextResponse.json({ ok: true });
}

async function startCheckout(req: NextRequest, kind: Kind) {
  const key = secret("STRIPE_SECRET_KEY");
  if (!key) return NextResponse.json({ free: true }); // payments not configured: readings stay free
  try {
    return NextResponse.json({ url: await createCheckout(key, req.nextUrl.origin, kind.product) });
  } catch (e) {
    console.error("bridge: checkout", kind.product.app, e);
    return NextResponse.json({ error: "veil", message: kind.say.checkout }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  let body: { mode?: string; turns?: Turn[]; image?: string; session_id?: unknown; product?: unknown } & FeedbackBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (body.mode === "feedback") return saveFeedback(req, body);
  const kind = kindOf(body);
  if (body.mode === "checkout") return startCheckout(req, kind);
  if (body.mode === "interest") return countInterest(req, body as { item?: unknown; from?: unknown });

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
    purchase = sid ? await loadPurchase(stripeKey, kv(), sid, kind.product.app).catch(() => null) : null;
    if (!purchase || purchase.refunded) {
      return NextResponse.json({ error: "unpaid", message: kind.say.unpaid }, { status: 402 });
    }
    if (purchase.used >= purchase.allowed) {
      if (purchase.reading) return NextResponse.json({ ...purchase.reading, ...paidState(purchase), ...(await narrated(kind, purchase.reading)) });
      return NextResponse.json({ error: "unpaid", message: kind.say.given }, { status: 402 });
    }
  } else if (await overLimit(kv(), clientIp(req), mode)) {
    return NextResponse.json({ error: "rest", message: kind.say.rest }, { status: 429 });
  }

  // Anthropic needs the conversation to start with a user turn and alternate roles.
  const messages: { role: "user" | "assistant"; content: unknown[] }[] = [
    { role: "user", content: [{ type: "text", text: kind.opener }] },
  ];
  for (const t of clean) {
    const role = t.role === "visitor" ? "user" : "assistant";
    const last = messages[messages.length - 1];
    if (last.role === role) last.content.push({ type: "text", text: t.text });
    else messages.push({ role, content: [{ type: "text", text: t.text }] });
  }
  const image = parseImage(body.image);
  if (mode === "reading") {
    const text = kind.readingCue;
    const last = messages[messages.length - 1];
    if (last.role === "user") last.content.push({ type: "text", text });
    else messages.push({ role: "user", content: [{ type: "text", text }] });
  }
  if (image) {
    const lastUser = [...messages].reverse().find((m) => m.role === "user")!;
    lastUser.content.unshift({ type: "text", text: kind.photoCue }, image);
  }
  if (messages[messages.length - 1].role !== "user") {
    messages.push({ role: "user", content: [{ type: "text", text: kind.waitCue }] });
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
      system: mode === "reading" ? kind.reading : kind.chat,
      messages,
    }),
  });
  if (!resp.ok) {
    console.error("bridge: anthropic", kind.product.app, resp.status, await resp.text());
    return NextResponse.json({ error: "veil", message: kind.say.veil }, { status: 502 });
  }

  const data = await resp.json();
  const raw: string = (data?.content ?? []).filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join("").trim();

  if (mode === "chat") {
    const userTurns = clean.filter((t) => t.role === "visitor").length;
    const ready = raw.includes(READY) || userTurns >= 7;
    if (!raw.replace(READY, "").trim()) {
      return NextResponse.json({ error: "veil", message: kind.say.slipped }, { status: 502 });
    }
    const reply = raw.replace(READY, "").trim();
    return NextResponse.json({ reply, ready, sig: await signText(reply), voice: !!secret("OPENAI_API_KEY") });
  }

  const match = raw.match(/\{[\s\S]*\}/);
  try {
    const reading = JSON.parse(match ? match[0] : "");
    if (!reading[kind.complete]) throw new Error("incomplete");
    if (purchase && sid) {
      purchase.used += 1;
      purchase.reading = reading;
      await savePurchase(kv(), sid, purchase);
      return NextResponse.json({ ...reading, ...paidState(purchase), ...(await narrated(kind, reading)) });
    }
    return NextResponse.json({ ...reading, tier: "free", ...(await narrated(kind, reading)) });
  } catch {
    // Not JSON: usually the medium stepped out of character (crisis care). Pass it through as plain words.
    return NextResponse.json({ message: raw, tier: "free", sig: await signText(raw) });
  }
}
