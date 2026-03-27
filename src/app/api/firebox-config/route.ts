import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://bdgmpkbbohbucwoiucyw.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZ21wa2Jib2hidWN3b2l1Y3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1Nzk3ODEsImV4cCI6MjA5MDE1NTc4MX0.WAuh1vJsqxkdQKoBQ6i_qfHiJyKM-TSJ9BLtn8EyUws";
const INGEST_KEY = process.env.FIREBOX_INGEST_KEY ?? "firebox-pi-secret";
const TABLE = `${SUPABASE_URL}/rest/v1/firebox_config`;

const HEADERS = {
  "apikey": SUPABASE_ANON_KEY,
  "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};

// GET /api/firebox-config — returns current active_channels list
export async function GET() {
  const res = await fetch(`${TABLE}?key=eq.active_channels&select=value`, {
    headers: HEADERS,
    cache: "no-store",
  });
  if (!res.ok) return NextResponse.json({ error: "Failed to read config" }, { status: 502 });
  const rows = await res.json();
  const active_channels: string[] = rows[0]?.value ?? ["wfd-ch2-scene", "wfd-ch6-ce"];
  return NextResponse.json({ active_channels });
}

// POST /api/firebox-config — update active_channels list
// Body: { active_channels: string[] }
// Requires x-firebox-key header
export async function POST(req: NextRequest) {
  if (req.headers.get("x-firebox-key") !== INGEST_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const channels: string[] = body.active_channels ?? [];

  const res = await fetch(`${TABLE}?key=eq.active_channels`, {
    method: "PATCH",
    headers: { ...HEADERS, "Prefer": "return=minimal" },
    body: JSON.stringify({ value: channels, updated_at: new Date().toISOString() }),
  });

  if (!res.ok && res.status !== 204) {
    return NextResponse.json({ error: "Failed to update config" }, { status: 502 });
  }
  return NextResponse.json({ ok: true, active_channels: channels });
}
