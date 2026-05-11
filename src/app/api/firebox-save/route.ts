import { NextRequest, NextResponse } from "next/server";

const SB_URL  = "https://bdgmpkbbohbucwoiucyw.supabase.co";
const SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZ21wa2Jib2hidWN3b2l1Y3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1Nzk3ODEsImV4cCI6MjA5MDE1NTc4MX0.WAuh1vJsqxkdQKoBQ6i_qfHiJyKM-TSJ9BLtn8EyUws";
const HDRS    = { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}`, "Content-Type": "application/json" };

export async function POST(req: NextRequest) {
  const { label, start_time, end_time } = await req.json();
  if (!start_time || !end_time) return NextResponse.json({ error: "start_time and end_time required" }, { status: 400 });

  const r = await fetch(`${SB_URL}/rest/v1/firebox_save_flags`, {
    method: "POST",
    headers: { ...HDRS, Prefer: "return=representation" },
    body: JSON.stringify({ label: label || null, start_time, end_time, status: "pending" }),
  });
  if (!r.ok) return NextResponse.json({ error: "Failed to create save flag" }, { status: 500 });
  const [row] = await r.json();
  return NextResponse.json({ id: row.id, status: "pending" });
}

export async function GET() {
  const r = await fetch(`${SB_URL}/rest/v1/firebox_save_flags?order=created_at.desc&limit=20`, {
    headers: HDRS,
  });
  if (!r.ok) return NextResponse.json({ events: [] });
  const events = await r.json();
  return NextResponse.json({ events });
}
