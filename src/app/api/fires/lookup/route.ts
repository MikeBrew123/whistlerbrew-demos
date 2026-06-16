import { NextRequest, NextResponse } from "next/server";
export const runtime = "edge";

const BC_FIRES_API =
  "https://openmaps.gov.bc.ca/geo/pub/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=WHSE_LAND_AND_NATURAL_RESOURCE.PROT_CURRENT_FIRE_PNTS_SP&outputFormat=json&CQL_FILTER=FIRE_OUT_DATE%20IS%20NULL";

export async function POST(request: NextRequest) {
  try {
    const { fireNumber } = await request.json();
    if (!fireNumber) {
      return NextResponse.json({ error: "fireNumber is required" }, { status: 400 });
    }

    const normalized = fireNumber.toUpperCase().trim();
    const response = await fetch(BC_FIRES_API);
    if (!response.ok) throw new Error(`BCWS API returned ${response.status}`);

    const data = await response.json();
    const match = (data.features || []).find(
      (f: any) => f.properties.FIRE_NUMBER === normalized
    );

    if (!match) {
      return NextResponse.json({ error: `Fire ${normalized} not found among active fires` }, { status: 404 });
    }

    const p = match.properties;
    return NextResponse.json({
      fire: {
        fireNumber: p.FIRE_NUMBER,
        name: p.GEOGRAPHIC_DESCRIPTION || `Fire ${p.FIRE_NUMBER}`,
        status: p.FIRE_STATUS,
        size: p.CURRENT_SIZE || 0,
        lat: p.LATITUDE,
        lng: p.LONGITUDE,
        isFireOfNote: p.FIRE_OF_NOTE_IND === "Y",
        url: p.FIRE_URL || `https://wildfiresituation.nrs.gov.bc.ca/incidents/${p.FIRE_NUMBER}`,
        cause: p.FIRE_CAUSE,
        fireCentre: p.FIRE_CENTRE,
      },
    });
  } catch (error) {
    console.error("Fire lookup error:", error);
    return NextResponse.json({ error: "Failed to look up fire" }, { status: 500 });
  }
}
