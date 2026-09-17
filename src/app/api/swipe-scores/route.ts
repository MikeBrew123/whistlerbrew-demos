import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

// Swipe School arcade high scores, stored in the SWIPE_SCHOOL KV namespace.
// Boards: "speed" (Speed Round), "daily:YYYY-MM-DD" (today's Daily Challenge)
// and "alltime" (best Daily Challenge score per player, kept forever).

type Entry = { n: string; s: number; w: number; t: number };
type KV = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
};

const MAX_ENTRIES = 10;
const MAX_SCORE = 20000;
const BLOCKED_EXACT = new Set([
  "ASS", "FUK", "FUC", "FCK", "SHT", "CUM", "DIK", "DIC", "COK", "KKK",
  "NIG", "FAG", "SEX", "TIT", "CNT", "KYS", "WTF", "STD", "PUS", "POO",
]);
const BLOCKED_PARTS = [
  "FUCK", "SHIT", "CUNT", "NIGG", "FAGG", "DICK", "COCK", "PUSSY", "BITCH",
  "SLUT", "WHORE", "RAPE", "NAZI", "PENIS", "VAGIN", "ANUS", "TWAT", "WANK", "HITLER",
];

function cleanName(raw: unknown): string | null {
  const name = String(raw ?? "").toUpperCase().replace(/\s+/g, " ").trim();
  if (!/^[A-Z0-9 ]{1,10}$/.test(name)) return null;
  const squashed = name.replace(/ /g, "");
  if (BLOCKED_EXACT.has(squashed) || BLOCKED_PARTS.some((w) => squashed.includes(w))) return null;
  return name;
}

function kv(): KV | null {
  try {
    return (getRequestContext().env as Record<string, unknown>).SWIPE_SCHOOL as KV;
  } catch {
    return null;
  }
}

function boardKey(board: string | null, date: string | null): string | null {
  if (board === "speed") return "board:speed";
  if (board === "alltime") return "board:alltime";
  if (board !== "daily" || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  // Allow the player's local date to differ from UTC by a day either way.
  const diff = Math.abs(Date.parse(date + "T12:00:00Z") - Date.now());
  if (!(diff < 2 * 24 * 3600 * 1000)) return null;
  return `board:daily:${date}`;
}

async function read(store: KV, key: string): Promise<Entry[]> {
  try {
    return JSON.parse((await store.get(key)) ?? "[]");
  } catch {
    return [];
  }
}

function bestPerName(entries: Entry[]): Entry[] {
  const best = new Map<string, Entry>();
  for (const e of entries) {
    const seen = best.get(e.n);
    if (!seen || e.s > seen.s) best.set(e.n, e);
  }
  return [...best.values()].sort((a, b) => b.s - a.s || a.t - b.t).slice(0, MAX_ENTRIES);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = boardKey(searchParams.get("board"), searchParams.get("date"));
  const store = kv();
  if (!key) return NextResponse.json({ error: "Bad board" }, { status: 400 });
  if (!store) return NextResponse.json({ scores: [] });
  return NextResponse.json(
    { scores: await read(store, key) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const store = kv();
  if (!store) return NextResponse.json({ error: "Storage unavailable" }, { status: 503 });

  let body: { board?: string; date?: string; name?: string; score?: number; wpm?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const key = boardKey(body.board ?? null, body.date ?? null);
  const name = cleanName(body.name);
  const score = Math.round(Number(body.score));
  const wpm = Math.round(Number(body.wpm) || 0);
  if (!key) return NextResponse.json({ error: "Bad board" }, { status: 400 });
  if (!name) {
    return NextResponse.json({ error: "Letters and numbers only, and keep it clean" }, { status: 400 });
  }
  if (!Number.isFinite(score) || score <= 0 || score > MAX_SCORE || wpm < 0 || wpm > 250) {
    return NextResponse.json({ error: "Bad score" }, { status: 400 });
  }

  // Light rate limit: 6 submissions per minute per IP.
  const ip = request.headers.get("cf-connecting-ip") ?? "anon";
  const rlKey = `rl:${ip}:${Math.floor(Date.now() / 60000)}`;
  const hits = parseInt((await store.get(rlKey)) ?? "0");
  if (hits >= 6) return NextResponse.json({ error: "Slow down" }, { status: 429 });
  await store.put(rlKey, String(hits + 1), { expirationTtl: 120 });

  const entry: Entry = { n: name, s: score, w: wpm, t: Date.now() };
  const scores = (await read(store, key))
    .concat(entry)
    .sort((a, b) => b.s - a.s || a.t - b.t)
    .slice(0, MAX_ENTRIES);
  const rank = scores.indexOf(entry) + 1;
  if (rank > 0) {
    const ttl = key.startsWith("board:daily") ? { expirationTtl: 45 * 24 * 3600 } : undefined;
    await store.put(key, JSON.stringify(scores), ttl);
  }

  // Daily scores also feed the all-time board, which keeps one row per player.
  if (key.startsWith("board:daily")) {
    const all = bestPerName((await read(store, "board:alltime")).concat(entry));
    await store.put("board:alltime", JSON.stringify(all));
  }
  return NextResponse.json({ scores, rank });
}
