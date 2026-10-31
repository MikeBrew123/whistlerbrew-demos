import { NextRequest, NextResponse } from "next/server";
import { clientIp, kv, overLimit, secret, verifyText } from "../shared";

export const runtime = "edge";

// The Rainbow Bridge voice, via OpenAI.
// POST JSON {text, sig}  → checks /api/bridge signed the text, parks it briefly, returns {id}.
// GET ?id=               → streams the medium speaking it (audio/mpeg), so <audio> starts playing at once.
// POST form {audio}      → the visitor's spoken answer, transcribed to {text}.

const VOICE = "sage";
const SPEAK_MODEL = "gpt-4o-mini-tts";
const LISTEN_MODEL = "gpt-4o-mini-transcribe";
const MAX_SPEAK = 4000;
const MAX_AUDIO = 8 * 1024 * 1024;
const INSTRUCTIONS =
  "Speak slowly and softly, warm and hushed, like a gentle old-souled medium sitting by candlelight. " +
  "Leave small pauses between sentences. Tender, never cheerful or salesy.";
const PARKED_SECONDS = 600;
const devParked = new Map<string, string>(); // `next dev` has no KV

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const key = secret("OPENAI_API_KEY");
  if (!key || !/^[0-9a-f-]{36}$/.test(id)) return new Response(null, { status: 400 });
  const store = kv();
  const text = store ? await store.get(`say:${id}`) : devParked.get(id);
  if (!text) return new Response(null, { status: 404 });
  const resp = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: SPEAK_MODEL, voice: VOICE, input: text, instructions: INSTRUCTIONS, response_format: "mp3" }),
  });
  if (!resp.ok || !resp.body) {
    console.error("bridge voice: speak", resp.status, await resp.text());
    return new Response(null, { status: 502 });
  }
  return new Response(resp.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=600" } });
}

export async function POST(req: NextRequest) {
  const key = secret("OPENAI_API_KEY");
  if (!key) return NextResponse.json({ error: "Voice is not set up." }, { status: 500 });
  const isUpload = (req.headers.get("content-type") ?? "").startsWith("multipart/form-data");
  if (await overLimit(kv(), clientIp(req), isUpload ? "listen" : "speak")) {
    return NextResponse.json({ error: "The candle needs to rest. Please type for now." }, { status: 429 });
  }
  return isUpload ? listen(req, key) : park(req);
}

async function park(req: NextRequest) {
  const { text, sig } = await req.json().catch(() => ({}));
  if (typeof text !== "string" || !text.trim() || text.length > MAX_SPEAK || !(await verifyText(text, sig))) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const id = crypto.randomUUID();
  const store = kv();
  if (store) await store.put(`say:${id}`, text, { expirationTtl: PARKED_SECONDS });
  else devParked.set(id, text);
  return NextResponse.json({ id });
}

async function listen(req: NextRequest, key: string) {
  const form = await req.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof Blob) || !audio.size || audio.size > MAX_AUDIO || !audio.type.startsWith("audio/")) {
    return NextResponse.json({ error: "I couldn't hear that. Please try again." }, { status: 400 });
  }
  // OpenAI picks the decoder from the file name, so keep the browser's container format.
  const ext = audio.type.includes("mp4") || audio.type.includes("aac") ? "m4a" : audio.type.includes("mpeg") ? "mp3" : audio.type.includes("ogg") ? "ogg" : audio.type.includes("wav") ? "wav" : "webm";
  const out = new FormData();
  out.append("file", audio, `answer.${ext}`);
  out.append("model", LISTEN_MODEL);
  out.append("prompt", "Someone speaking gently about a beloved pet who has died: their name, habits and memories.");
  const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: out,
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    console.error("bridge voice: listen", resp.status, data);
    return NextResponse.json({ error: "I couldn't hear that. Please try again or type it." }, { status: 502 });
  }
  return NextResponse.json({ text: String(data.text ?? "").trim() });
}
