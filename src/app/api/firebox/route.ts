import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

// Shared secret the Pi must include when POSTing transcripts.
// Set this as FIREBOX_INGEST_KEY in Cloudflare Pages environment variables.
const INGEST_KEY = (process.env.FIREBOX_INGEST_KEY as string) ?? "firebox-pi-secret";

// How many transcripts to keep in the live feed (most recent N)
const MAX_ENTRIES = 100;

// Minimal KV type — Cloudflare provides the real implementation at runtime
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

interface Env {
  FIREBOX_TRANSCRIPTS: KVNamespace;
}

// ── GET — return recent transcripts for the page to display ──────────────────
export async function GET(request: NextRequest) {
  const env = (process.env as unknown) as Env;
  const kv = env.FIREBOX_TRANSCRIPTS;

  // Optional: filter by channel via ?channel=wfd-dispatch
  const { searchParams } = new URL(request.url);
  const channelFilter = searchParams.get("channel");

  // Fetch the index of transcript keys (most recent first)
  const indexRaw = await kv.get("index");
  if (!indexRaw) {
    return NextResponse.json({ transcripts: [] });
  }

  const index: string[] = JSON.parse(indexRaw);

  // Fetch each transcript entry
  const entries = await Promise.all(
    index.map(async (key) => {
      const raw = await kv.get(key);
      return raw ? JSON.parse(raw) : null;
    })
  );

  const transcripts = entries
    .filter(Boolean)
    .filter((e) => !channelFilter || e.channel === channelFilter);

  return NextResponse.json({ transcripts });
}

// ── POST — receive a new transcript from the Pi ──────────────────────────────
export async function POST(request: NextRequest) {
  const env = (process.env as unknown) as Env;
  const kv = env.FIREBOX_TRANSCRIPTS;

  // Verify the ingest key so random internet traffic can't pollute the feed
  const authHeader = request.headers.get("x-firebox-key");
  if (authHeader !== INGEST_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    channel: string;
    filename: string;
    timestamp: string; // ISO 8601
    transcript: string;
    speaker?: string; // e.g. "Dispatch", "Engine 1", "Whistler Ranger 1"
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.channel || !body.transcript || !body.timestamp) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Store each transcript under a unique key
  const key = `tx_${body.timestamp}_${body.channel}`;
  await kv.put(key, JSON.stringify(body), {
    // Keep transcripts for 30 days then auto-expire
    expirationTtl: 60 * 60 * 24 * 30,
  });

  // Update the index — prepend new key, trim to MAX_ENTRIES
  const indexRaw = await kv.get("index");
  const index: string[] = indexRaw ? JSON.parse(indexRaw) : [];
  const updated = [key, ...index.filter((k) => k !== key)].slice(0, MAX_ENTRIES);
  await kv.put("index", JSON.stringify(updated));

  return NextResponse.json({ ok: true, key });
}
