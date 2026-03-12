import { NextRequest, NextResponse } from "next/server";
export const runtime = "edge";

export async function POST(req: NextRequest) {
  const { vehicle } = await req.json();
  if (!vehicle || vehicle.length < 5) {
    return NextResponse.json({ error: "Invalid vehicle" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system: `You are an automotive maintenance cost expert familiar with Canadian repair prices.
Estimate average MONTHLY maintenance cost in CAD. Include oil changes, filters, brakes, tires (amortized), belts, minor repairs. Exclude insurance, fuel, registration.
Respond ONLY with valid JSON: {"monthly_cad": 95, "annual_cad": 1140, "reliability": "above average", "notes": "Brief reason"}`,
      messages: [{ role: "user", content: `Estimate monthly maintenance for: ${vehicle}` }],
    }),
  });

  const data = await resp.json();
  const raw = data?.content?.[0]?.text?.trim() ?? "";
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return NextResponse.json({ error: "Parse error" }, { status: 502 });

  return NextResponse.json(JSON.parse(match[0]));
}
