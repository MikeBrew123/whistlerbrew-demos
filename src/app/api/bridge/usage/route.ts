import { NextRequest, NextResponse } from "next/server";
import { kv, secret } from "../shared";

export const runtime = "edge";

// Daily API usage totals for Brew's Command Center (GET, header x-usage-key = USAGE_KEY).
// Raw units only; the Command Center prices them.
export async function GET(req: NextRequest) {
  const want = secret("USAGE_KEY");
  if (!want || req.headers.get("x-usage-key") !== want) return new Response(null, { status: 404 });
  const store = kv();
  if (!store) return NextResponse.json({ error: "no store" }, { status: 503 });
  const days = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get("days") ?? "14", 10) || 14, 1), 90);
  const out: Record<string, Record<string, number>> = {};
  for (let i = 0; i < days; i++) {
    const day = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    const raw = await store.get(`usage:${day}`);
    if (raw) out[day] = JSON.parse(raw);
  }
  return NextResponse.json({ days: out });
}
