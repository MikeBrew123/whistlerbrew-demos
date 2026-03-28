import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const SUPABASE_URL  = process.env.SUPABASE_URL      ?? "https://bdgmpkbbohbucwoiucyw.supabase.co";
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZ21wa2Jib2hidWN3b2l1Y3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1Nzk3ODEsImV4cCI6MjA5MDE1NTc4MX0.WAuh1vJsqxkdQKoBQ6i_qfHiJyKM-TSJ9BLtn8EyUws";
const OUTBOX_URL    = `${SUPABASE_URL}/rest/v1/firebox_outbox`;
const HEADERS = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_ANON,
  "Authorization": `Bearer ${SUPABASE_ANON}`,
  "Prefer": "return=minimal",
};

// Validate call sign — allow 3–8 alphanumeric chars (e.g. VE7ABC, SPS145, W7X)
const CALLSIGN_RE = /^[A-Z0-9]{2,8}$/;

export async function POST(request: NextRequest) {
  let body: { node_id: string; call_sign: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const nodeId   = (body.node_id   ?? "").trim().replace(/^!/, "").toLowerCase();
  const callSign = (body.call_sign ?? "").trim().toUpperCase();

  if (!/^[0-9a-f]{8}$/.test(nodeId))
    return NextResponse.json({ error: "Invalid node ID" }, { status: 400 });
  if (!CALLSIGN_RE.test(callSign))
    return NextResponse.json({ error: "Call sign must be 2–8 letters/numbers (e.g. VE7ABC)" }, { status: 400 });

  // Encode as a special command the Pi bridge recognises
  const message = `__SET_OWNER__:!${nodeId}:${callSign}`;

  const res = await fetch(OUTBOX_URL, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: 500 });
  }

  return NextResponse.json({ ok: true, node_id: nodeId, call_sign: callSign });
}
