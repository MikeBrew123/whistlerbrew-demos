import { NextRequest, NextResponse } from "next/server";
export const runtime = "edge";

const BC_FIRE_POLYS_API =
  "https://openmaps.gov.bc.ca/geo/pub/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=WHSE_LAND_AND_NATURAL_RESOURCE.PROT_CURRENT_FIRE_POLYS_SP&outputFormat=json&srsName=EPSG:4326";

export async function POST(request: NextRequest) {
  try {
    const { fireNumber } = await request.json();
    if (!fireNumber) {
      return NextResponse.json({ error: "fireNumber is required" }, { status: 400 });
    }

    const normalized = fireNumber.toUpperCase().trim();
    const url = `${BC_FIRE_POLYS_API}&CQL_FILTER=FIRE_NUMBER='${encodeURIComponent(normalized)}'`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`BCWS perimeter API returned ${response.status}`);

    const data = await response.json();
    const features = data.features || [];

    if (features.length === 0) {
      return NextResponse.json({ perimeter: null });
    }

    const geom = features[0].geometry;
    let coords: [number, number][] = [];

    if (geom.type === "Polygon") {
      coords = geom.coordinates[0].map((c: number[]) => [c[1], c[0]] as [number, number]);
    } else if (geom.type === "MultiPolygon") {
      coords = geom.coordinates[0][0].map((c: number[]) => [c[1], c[0]] as [number, number]);
    }

    return NextResponse.json({
      perimeter: coords,
      fireNumber: normalized,
      sizeHa: features[0].properties?.CURRENT_SIZE || 0,
    });
  } catch (error) {
    console.error("Fire perimeter error:", error);
    return NextResponse.json({ error: "Failed to fetch perimeter" }, { status: 500 });
  }
}
