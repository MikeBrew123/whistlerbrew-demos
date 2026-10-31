import { NextRequest } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import type { KV } from "./purchase";

// Helpers shared by /api/bridge and /api/bridge/voice.

export function cfEnv(): Record<string, unknown> {
  try {
    return getRequestContext().env as Record<string, unknown>;
  } catch {
    return {};
  }
}

export const kv = () => (cfEnv().BRIDGE as KV) ?? null;

// Pages secrets arrive on the request context in production; `next dev` reads .env.local.
export const secret = (name: string) => (cfEnv()[name] as string | undefined) ?? process.env[name];

export const clientIp = (req: NextRequest) =>
  req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? "local";

const LIMITS = { chat: 80, reading: 3, feedback: 10, speak: 200, listen: 120 };

export async function overLimit(store: KV | null, ip: string, mode: keyof typeof LIMITS): Promise<boolean> {
  if (!store) return false;
  const key = `rl:${mode}:${ip}:${new Date().toISOString().slice(0, 10)}`;
  const used = parseInt((await store.get(key)) ?? "0", 10) || 0;
  if (used >= LIMITS[mode]) return true;
  await store.put(key, String(used + 1), { expirationTtl: 60 * 60 * 26 });
  return false;
}

// The voice endpoint only reads words the medium actually said: /api/bridge signs each reply,
// /api/bridge/voice checks the signature. Keeps the speech endpoint from being a free TTS service.
async function signingKey() {
  const raw = `${secret("ANTHROPIC_API_KEY") ?? ""}:bridge-voice`;
  return crypto.subtle.importKey("raw", new TextEncoder().encode(raw), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

export async function signText(text: string): Promise<string> {
  const sig = await crypto.subtle.sign("HMAC", await signingKey(), new TextEncoder().encode(text));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/[+/=]/g, (c) => ({ "+": "-", "/": "_", "=": "" })[c]!);
}

export const verifyText = async (text: string, sig: unknown) => typeof sig === "string" && sig === (await signText(text));
