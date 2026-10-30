import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

// The Rainbow Bridge (/bridge): an AI pet medium.
// mode "chat"    → the medium's next gentle question, plus ready=true once it has enough.
// mode "reading" → the final reading as JSON for the reveal and the shareable card.
// Rate limits live in the BRIDGE KV namespace (skipped in `next dev`, where there is no KV).

type KV = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
};
type Turn = { role: "medium" | "visitor"; text: string };

const MODEL = "claude-sonnet-5-5";
const MAX_TURNS = 24;
const MAX_TEXT = 1200;
const MAX_IMAGE_B64 = 2_000_000;
const LIMITS = { chat: 80, reading: 3 };
const READY = "[[READY]]";

const PERSONA = `You are the Keeper of the Rainbow Bridge, a gentle, old-souled medium who sits by a single candle and listens for animals who have crossed over. You speak to a person whose pet has died.

Voice: warm, unhurried, softly poetic. Short paragraphs. Sensory and impressionistic (light, warmth, scent, the weight of a paw), never clinical, never theatrical. No emojis. No em-dashes.

Rules:
- Never claim certainty about how or why the pet died, and never suggest the owner was at fault. Offer peace about any guilt.
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

function cfEnv(): Record<string, unknown> {
  try {
    return getRequestContext().env as Record<string, unknown>;
  } catch {
    return {};
  }
}

const kv = () => (cfEnv().BRIDGE as KV) ?? null;

async function overLimit(store: KV | null, ip: string, mode: "chat" | "reading"): Promise<boolean> {
  if (!store) return false;
  const key = `rl:${mode}:${ip}:${new Date().toISOString().slice(0, 10)}`;
  const used = parseInt((await store.get(key)) ?? "0", 10) || 0;
  if (used >= LIMITS[mode]) return true;
  await store.put(key, String(used + 1), { expirationTtl: 60 * 60 * 26 });
  return false;
}

function parseImage(raw: unknown) {
  if (typeof raw !== "string") return null;
  const m = raw.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!m || m[2].length > MAX_IMAGE_B64) return null;
  return { type: "image", source: { type: "base64", media_type: m[1], data: m[2] } };
}

export async function POST(req: NextRequest) {
  let body: { mode?: string; turns?: Turn[]; image?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const mode = body.mode === "reading" ? "reading" : "chat";
  const turns = Array.isArray(body.turns) ? body.turns.slice(-MAX_TURNS) : [];
  const clean = turns
    .filter((t) => t && (t.role === "medium" || t.role === "visitor") && typeof t.text === "string")
    .map((t) => ({ role: t.role, text: t.text.slice(0, MAX_TEXT).trim() }))
    .filter((t) => t.text);

  // Pages secrets arrive on the request context in production; `next dev` reads .env.local.
  const apiKey = (cfEnv().ANTHROPIC_API_KEY as string | undefined) ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? "local";
  if (await overLimit(kv(), ip, mode)) {
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
    return NextResponse.json({ reply: raw.replace(READY, "").trim(), ready });
  }

  const match = raw.match(/\{[\s\S]*\}/);
  try {
    const reading = JSON.parse(match ? match[0] : "");
    if (!reading.remembers) throw new Error("incomplete");
    return NextResponse.json({ ...reading, tier: "free" });
  } catch {
    // Not JSON: usually the medium stepped out of character (crisis care). Pass it through as plain words.
    return NextResponse.json({ message: raw, tier: "free" });
  }
}
