import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

const BEC_WFS = "https://openmaps.gov.bc.ca/geo/pub/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=WHSE_FOREST_VEGETATION.BEC_BIOGEOCLIMATIC_POLY&outputFormat=json&srsName=EPSG:4326&maxFeatures=1&propertyName=ZONE_NAME,SUBZONE_NAME,MAP_LABEL,NATURAL_DISTURBANCE,NATURAL_DISTURBANCE_NAME";
const FUEL_WFS = "https://openmaps.gov.bc.ca/geo/pub/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=WHSE_LAND_AND_NATURAL_RESOURCE.PROT_FUEL_TYPE_SP&outputFormat=json&srsName=EPSG:4326&maxFeatures=1&propertyName=FUEL_TYPE_CD,FT_CONFIDENCE";
const ELEVATION_API = "https://api.open-elevation.com/api/v1/lookup";

const FUEL_TYPE_LABELS: Record<string, string> = {
  "C-1": "Spruce–Lichen Woodland",
  "C-2": "Boreal Spruce",
  "C-3": "Mature Jack/Lodgepole Pine",
  "C-4": "Immature Jack/Lodgepole Pine",
  "C-5": "Red/White Pine",
  "C-6": "Conifer Plantation",
  "C-7": "Ponderosa Pine / Douglas-fir",
  "D-1": "Leafless Aspen",
  "D-2": "Green Aspen",
  "D-1/2": "Aspen (Seasonal)",
  "M-1": "Boreal Mixedwood (Leafless)",
  "M-2": "Boreal Mixedwood (Green)",
  "M-1/2": "Boreal Mixedwood (Seasonal)",
  "M-3": "Dead Balsam Fir / Mixedwood (Leafless)",
  "M-4": "Dead Balsam Fir / Mixedwood (Green)",
  "M-3/4": "Dead Balsam Fir / Mixedwood (Seasonal)",
  "S-1": "Jack/Lodgepole Pine Slash",
  "S-2": "White Spruce / Balsam Slash",
  "S-3": "Coastal Cedar / Hemlock Slash",
  "O-1a": "Matted Grass",
  "O-1a/b": "Grass (Seasonal)",
  "O-1b": "Standing Grass",
  "N": "Non-fuel",
  "W": "Water",
};

const NDT_FIRE_RISK: Record<string, string> = {
  "NDT1": "Low — rare stand-initiating events (250+ yr return)",
  "NDT2": "Moderate — infrequent stand-initiating events (200 yr return)",
  "NDT3": "High — frequent stand-initiating events (150 yr return)",
  "NDT4": "Very High — frequent stand-maintaining fires (35-100 yr return)",
  "NDT5": "Alpine — rare fires, above treeline",
};

export async function POST(request: NextRequest) {
  try {
    const { latitude, longitude } = await request.json();
    if (!latitude || !longitude) {
      return NextResponse.json({ error: "latitude and longitude required" }, { status: 400 });
    }

    const delta = 0.01;
    const bbox = `${longitude - delta},${latitude - delta},${longitude + delta},${latitude + delta},EPSG:4326`;

    const [becRes, fuelRes, elevRes] = await Promise.all([
      fetch(`${BEC_WFS}&bbox=${bbox}`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${FUEL_WFS}&bbox=${bbox}`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${ELEVATION_API}?locations=${latitude},${longitude}`).then(r => r.ok ? r.json() : null).catch(() => null),
    ]);

    const becFeature = becRes?.features?.[0]?.properties;
    const fuelFeature = fuelRes?.features?.[0]?.properties;
    const elevation = elevRes?.results?.[0]?.elevation;

    const fuelCode = fuelFeature?.FUEL_TYPE_CD || null;
    const ndtCode = becFeature?.NATURAL_DISTURBANCE || null;

    return NextResponse.json({
      becZone: becFeature?.ZONE_NAME || null,
      becSubzone: becFeature?.SUBZONE_NAME || null,
      becLabel: becFeature?.MAP_LABEL || null,
      naturalDisturbance: becFeature?.NATURAL_DISTURBANCE_NAME || null,
      ndtFireRisk: ndtCode ? NDT_FIRE_RISK[ndtCode] || null : null,
      fuelTypeCode: fuelCode,
      fuelTypeLabel: fuelCode ? FUEL_TYPE_LABELS[fuelCode] || fuelCode : null,
      fuelConfidence: fuelFeature?.FT_CONFIDENCE || null,
      elevationM: elevation != null ? Math.round(elevation) : null,
    });
  } catch (error) {
    console.error("Terrain API error:", error);
    return NextResponse.json({ error: "Failed to fetch terrain data" }, { status: 500 });
  }
}
