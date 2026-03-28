import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const SUPABASE_URL  = process.env.SUPABASE_URL      ?? "https://bdgmpkbbohbucwoiucyw.supabase.co";
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZ21wa2Jib2hidWN3b2l1Y3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1Nzk3ODEsImV4cCI6MjA5MDE1NTc4MX0.WAuh1vJsqxkdQKoBQ6i_qfHiJyKM-TSJ9BLtn8EyUws";
const CONFIG_URL    = `${SUPABASE_URL}/rest/v1/firebox_config`;
const OUTBOX_URL    = `${SUPABASE_URL}/rest/v1/firebox_outbox`;
const HEADERS = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_ANON,
  "Authorization": `Bearer ${SUPABASE_ANON}`,
};

const CALLSIGN_RE = /^[A-Z0-9]{2,8}$/;

export async function GET() {
  // Return current node aliases map — used by web pages
  const res = await fetch(`${CONFIG_URL}?key=eq.node_aliases&select=value`, { headers: HEADERS });
  if (!res.ok) return NextResponse.json({});
  const rows = await res.json();
  return NextResponse.json(rows[0]?.value ?? {});
}

export async function POST(request: NextRequest) {
  let body: { node_id: string; call_sign: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw      = (body.node_id ?? "").trim().replace(/^!/, "");
  const nodeId   = /^\d+$/.test(raw)
    ? parseInt(raw, 10).toString(16).padStart(8, "0")
    : raw.toLowerCase();
  const callSign = (body.call_sign ?? "").trim().toUpperCase();

  if (!/^[0-9a-f]{8}$/.test(nodeId))
    return NextResponse.json({ error: "Invalid node ID" }, { status: 400 });
  if (!CALLSIGN_RE.test(callSign))
    return NextResponse.json({ error: "Call sign must be 2–8 letters/numbers (e.g. VE7ABC)" }, { status: 400 });

  // ── 1. Read current aliases, merge, write back ─────────────────────────────
  const existing = await fetch(`${CONFIG_URL}?key=eq.node_aliases&select=value`, { headers: HEADERS });
  const rows     = existing.ok ? await existing.json() : [];
  const aliases  = (rows[0]?.value ?? {}) as Record<string, string>;
  aliases[nodeId] = callSign;

  // Upsert via POST with resolution=merge-duplicates
  await fetch(CONFIG_URL, {
    method: "POST",
    headers: { ...HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ key: "node_aliases", value: aliases, updated_at: new Date().toISOString() }),
  });

  // ── 2. Queue outbox command (bridge acks + logs it) ────────────────────────
  await fetch(OUTBOX_URL, {
    method: "POST",
    headers: { ...HEADERS, "Prefer": "return=minimal" },
    body: JSON.stringify({ message: `__SET_OWNER__:!${nodeId}:${callSign}` }),
  });

  return NextResponse.json({ ok: true, node_id: nodeId, call_sign: callSign });
}
