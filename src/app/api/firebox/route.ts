import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

// Supabase project (iambrew@gmail.com account — firebox project)
const SUPABASE_URL      = (process.env.SUPABASE_URL      ?? "https://bdgmpkbbohbucwoiucyw.supabase.co");
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZ21wa2Jib2hidWN3b2l1Y3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1Nzk3ODEsImV4cCI6MjA5MDE1NTc4MX0.WAuh1vJsqxkdQKoBQ6i_qfHiJyKM-TSJ9BLtn8EyUws");

// Shared secret the Pi must include when POSTing transcripts
const INGEST_KEY = (process.env.FIREBOX_INGEST_KEY ?? "firebox-pi-secret");

const TABLE = `${SUPABASE_URL}/rest/v1/firebox_transcripts`;
const HEADERS = {
  apikey:        SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};

// ── GET — return recent transcripts for the page ──────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const channelFilter = searchParams.get("channel");

  const url = new URL(TABLE);
  url.searchParams.set("order", "recorded_at.desc");
  url.searchParams.set("limit", "100");
  if (channelFilter) url.searchParams.set("channel", `eq.${channelFilter}`);

  const res = await fetch(url.toString(), { headers: HEADERS });
  if (!res.ok) return NextResponse.json({ transcripts: [] });

  const rows: Array<{
    channel: string; filename: string; recorded_at: string;
    speaker: string | null; transcript: string;
  }> = await res.json();

  const transcripts = rows.map((r) => ({
    channel:    r.channel,
    filename:   r.filename,
    timestamp:  r.recorded_at,
    speaker:    r.speaker ?? undefined,
    transcript: r.transcript,
  }));

  return NextResponse.json({ transcripts });
}

// ── POST — receive a new transcript from the Pi ───────────────────────────────
export async function POST(request: NextRequest) {
  if (request.headers.get("x-firebox-key") !== INGEST_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    channel: string; filename: string; timestamp: string;
    transcript: string; speaker?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.channel || !body.transcript || !body.timestamp) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const res = await fetch(TABLE, {
    method: "POST",
    headers: { ...HEADERS, Prefer: "return=minimal" },
    body: JSON.stringify({
      channel:     body.channel,
      filename:    body.filename,
      recorded_at: body.timestamp,
      speaker:     body.speaker ?? null,
      transcript:  body.transcript,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
