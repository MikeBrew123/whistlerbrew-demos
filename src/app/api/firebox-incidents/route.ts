import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const SUPABASE_URL  = process.env.SUPABASE_URL      ?? "https://bdgmpkbbohbucwoiucyw.supabase.co";
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZ21wa2Jib2hidWN3b2l1Y3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1Nzk3ODEsImV4cCI6MjA5MDE1NTc4MX0.WAuh1vJsqxkdQKoBQ6i_qfHiJyKM-TSJ9BLtn8EyUws";
const CONFIG_URL    = `${SUPABASE_URL}/rest/v1/firebox_config`;
const TX_URL        = `${SUPABASE_URL}/rest/v1/firebox_transcripts`;

const HEADERS = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_ANON,
  "Authorization": `Bearer ${SUPABASE_ANON}`,
};

export type Incident = {
  id: string;
  name: string;
  start_at: string;
  end_at?: string;
  status: "active" | "closed";
  notes?: string;
};

async function readIncidents(): Promise<Incident[]> {
  const res = await fetch(`${CONFIG_URL}?key=eq.incidents&select=value`, { headers: HEADERS });
  if (!res.ok) return [];
  const rows = await res.json();
  return (rows[0]?.value ?? []) as Incident[];
}

async function writeIncidents(incidents: Incident[]) {
  // Check if row exists
  const check = await fetch(`${CONFIG_URL}?key=eq.incidents&select=key`, { headers: HEADERS });
  const rows  = check.ok ? await check.json() : [];
  const body  = JSON.stringify({ key: "incidents", value: incidents, updated_at: new Date().toISOString() });
  if (rows.length > 0) {
    await fetch(`${CONFIG_URL}?key=eq.incidents`, {
      method: "PATCH", headers: { ...HEADERS, "Prefer": "return=minimal" }, body,
    });
  } else {
    await fetch(CONFIG_URL, {
      method: "POST", headers: { ...HEADERS, "Prefer": "return=minimal" }, body,
    });
  }
}

// GET — list all incidents (most recent first)
export async function GET() {
  const incidents = await readIncidents();
  return NextResponse.json({ incidents: incidents.slice().reverse() });
}

// POST — create new incident
export async function POST(req: NextRequest) {
  const body: { name: string; start_at?: string; notes?: string } = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const incidents = await readIncidents();

  // Close any currently active incident first
  for (const inc of incidents) {
    if (inc.status === "active") {
      inc.status = "closed";
      inc.end_at = new Date().toISOString();
    }
  }

  const newIncident: Incident = {
    id:       crypto.randomUUID(),
    name:     body.name.trim(),
    start_at: body.start_at ?? new Date().toISOString(),
    status:   "active",
    notes:    body.notes ?? "",
  };
  incidents.push(newIncident);
  await writeIncidents(incidents);
  return NextResponse.json({ ok: true, incident: newIncident });
}

// PATCH — update incident (end it, add notes)
export async function PATCH(req: NextRequest) {
  const body: { id: string; status?: "closed"; end_at?: string; notes?: string } = await req.json();
  if (!body.id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const incidents = await readIncidents();
  const inc = incidents.find(i => i.id === body.id);
  if (!inc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.status === "closed") {
    inc.status = "closed";
    inc.end_at = body.end_at ?? new Date().toISOString();
  }
  if (body.notes !== undefined) inc.notes = body.notes;

  await writeIncidents(incidents);
  return NextResponse.json({ ok: true, incident: inc });
}

// ── Export endpoint: GET /api/firebox-incidents?export=<id> ──────────────────
// Returns all transcripts for the incident's time range, formatted for debrief.
export async function DELETE(req: NextRequest) {
  // Repurposed as export — DELETE verb unused, query param ?export=id
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const incidents = await readIncidents();
  const inc = incidents.find(i => i.id === id);
  if (!inc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const end = inc.end_at ?? new Date().toISOString();
  const url = `${TX_URL}?recorded_at=gte.${inc.start_at}&recorded_at=lte.${end}&order=recorded_at.asc&limit=2000`;
  const res = await fetch(url, { headers: HEADERS });
  const rows: Array<{ channel: string; recorded_at: string; speaker: string | null; transcript: string }> =
    res.ok ? await res.json() : [];

  return NextResponse.json({ incident: inc, transcripts: rows });
}
