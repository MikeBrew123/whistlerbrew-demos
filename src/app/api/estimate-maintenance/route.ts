import { NextRequest, NextResponse } from "next/server";
export const runtime = "edge";

const PROMPTS: Record<string, string> = {
  "current-vehicle": `You are an automotive expert familiar with Canadian repair prices and fuel economy.
Given a vehicle (year/make/model), return a JSON estimate for a typical Canadian owner driving ~1500 km/month.
Respond ONLY with valid JSON:
{"monthly_maint_cad": 95, "monthly_fuel_cad": 220, "fuel_economy_l100km": 12.5, "reliability": "above average", "notes": "Brief reason"}
Use ~$1.65/L gas price for BC. Adjust fuel economy for actual model.`,

  "ev": `You are an EV maintenance expert familiar with Canadian costs.
Given an EV or hybrid vehicle type and optional model, estimate average monthly maintenance in CAD.
BEVs: no oil changes, minimal brakes (regen), mainly tires + annual inspection. Typical $25–60/month.
PHEVs: some oil changes still needed. Typical $45–80/month.
Hybrids: similar to gas but slightly less. Typical $60–100/month.
Respond ONLY with valid JSON:
{"monthly_cad": 40, "notes": "Brief reason for estimate"}`,
};

export async function POST(req: NextRequest) {
  const { vehicle, type = "current-vehicle" } = await req.json();
  if (!vehicle || vehicle.length < 3) {
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
      system: PROMPTS[type] ?? PROMPTS["current-vehicle"],
      messages: [{ role: "user", content: vehicle }],
    }),
  });

  const data = await resp.json();
  const raw = data?.content?.[0]?.text?.trim() ?? "";
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return NextResponse.json({ error: "Parse error" }, { status: 502 });

  return NextResponse.json(JSON.parse(match[0]));
}
