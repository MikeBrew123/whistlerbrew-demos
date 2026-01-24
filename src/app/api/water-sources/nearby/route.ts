import { NextRequest, NextResponse } from "next/server";
export const runtime = "edge";


// Water source types relevant for firefighting - boat launches and beaches are key water access points
const WATER_SOURCE_TYPES = [
  "lake",
  "river",
  "reservoir",
  "boat launch",
  "beach",
  "water tower",
  "fire hydrant",
  "water treatment",
];

type WaterSource = {
  name: string;
  type: string;
  lat: number;
  lng: number;
  distanceKm: number;
  accessNotes?: string;
};

type WaterSourcesResponse = {
  sources: WaterSource[];
  searchCenter: { lat: number; lng: number };
  radiusKm: number;
  count: number;
};

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// BC Lakes, water bodies, boat launches and beaches (key water access points for firefighting)
const BC_WATER_SOURCES: Array<{ name: string; type: string; lat: number; lng: number; accessNotes?: string }> = [
  // Sea-to-Sky - Lakes
  { name: "Green Lake", type: "lake", lat: 50.1456, lng: -122.9478, accessNotes: "Road access via Valley Trail" },
  { name: "Alta Lake", type: "lake", lat: 50.1167, lng: -122.9667, accessNotes: "Road access, boat launch" },
  { name: "Lost Lake", type: "lake", lat: 50.1233, lng: -122.9417, accessNotes: "Trail access only" },
  { name: "Nita Lake", type: "lake", lat: 50.0933, lng: -122.9683, accessNotes: "Road access via Nita Lake Dr" },
  { name: "Alpha Lake", type: "lake", lat: 50.1017, lng: -122.9650, accessNotes: "Road access" },
  { name: "Cheakamus River", type: "river", lat: 50.0833, lng: -123.0167, accessNotes: "Multiple road crossings" },
  { name: "Lillooet Lake", type: "lake", lat: 50.3500, lng: -122.5500, accessNotes: "FSR access" },
  { name: "Garibaldi Lake", type: "lake", lat: 49.9333, lng: -123.0333, accessNotes: "Helicopter access only" },
  // Sea-to-Sky - Boat Launches
  { name: "Alta Lake Boat Launch", type: "boat launch", lat: 50.1150, lng: -122.9650, accessNotes: "Paved ramp, trailer parking" },
  { name: "Squamish River Boat Launch", type: "boat launch", lat: 49.7500, lng: -123.1500, accessNotes: "Gravel ramp, good access" },
  { name: "Lillooet Lake Boat Launch (Pemberton)", type: "boat launch", lat: 50.3667, lng: -122.5333, accessNotes: "FSR access, concrete ramp" },
  { name: "Porteau Cove Boat Launch", type: "boat launch", lat: 49.5583, lng: -123.2375, accessNotes: "Provincial park, paved ramp" },
  // Sea-to-Sky - Beaches
  { name: "Nexen Beach (Squamish)", type: "beach", lat: 49.6917, lng: -123.1583, accessNotes: "Public beach, good shore access" },
  { name: "Rainbow Park Beach", type: "beach", lat: 50.1200, lng: -122.9633, accessNotes: "Alta Lake, road access" },
  { name: "Lakeside Park Beach", type: "beach", lat: 50.1117, lng: -122.9583, accessNotes: "Alta Lake south end" },
  { name: "Alpha Lake Park Beach", type: "beach", lat: 50.1033, lng: -122.9633, accessNotes: "Road access, parking" },
  // Thompson-Nicola - Lakes
  { name: "Kamloops Lake", type: "lake", lat: 50.7833, lng: -120.5333, accessNotes: "Hwy 1 access" },
  { name: "Shuswap Lake", type: "lake", lat: 50.9500, lng: -119.2833, accessNotes: "Multiple boat launches" },
  { name: "Adams Lake", type: "lake", lat: 51.1000, lng: -119.6333, accessNotes: "Road access north end" },
  { name: "Nicola Lake", type: "lake", lat: 50.1667, lng: -120.5500, accessNotes: "Hwy 5A access" },
  { name: "Thompson River", type: "river", lat: 50.6833, lng: -120.3333, accessNotes: "Multiple access points" },
  // Thompson-Nicola - Boat Launches
  { name: "Shuswap Marina Boat Launch", type: "boat launch", lat: 50.8833, lng: -119.4833, accessNotes: "Full service marina, paved ramp" },
  { name: "Scotch Creek Boat Launch", type: "boat launch", lat: 51.0167, lng: -119.1333, accessNotes: "Provincial park, good ramp" },
  { name: "Riverside Park Boat Launch (Kamloops)", type: "boat launch", lat: 50.6750, lng: -120.3250, accessNotes: "City park, paved ramp" },
  // Okanagan - Lakes
  { name: "Okanagan Lake", type: "lake", lat: 49.8500, lng: -119.5000, accessNotes: "Multiple boat launches" },
  { name: "Kalamalka Lake", type: "lake", lat: 50.1833, lng: -119.2667, accessNotes: "Vernon access" },
  { name: "Skaha Lake", type: "lake", lat: 49.3667, lng: -119.5500, accessNotes: "Penticton access" },
  { name: "Wood Lake", type: "lake", lat: 50.0833, lng: -119.3833, accessNotes: "Road access" },
  // Okanagan - Boat Launches
  { name: "Kelowna City Park Boat Launch", type: "boat launch", lat: 49.8833, lng: -119.4917, accessNotes: "Downtown, paved double ramp" },
  { name: "Peachland Boat Launch", type: "boat launch", lat: 49.7833, lng: -119.7333, accessNotes: "Public ramp, parking" },
  { name: "Skaha Lake Marina Boat Launch", type: "boat launch", lat: 49.3833, lng: -119.5667, accessNotes: "South Penticton, good ramp" },
  // Okanagan - Beaches
  { name: "Okanagan Lake Beach (Kelowna)", type: "beach", lat: 49.8867, lng: -119.4950, accessNotes: "City beach, good shore access" },
  { name: "Gyro Beach (Kelowna)", type: "beach", lat: 49.8617, lng: -119.4867, accessNotes: "Popular public beach" },
  { name: "Skaha Beach (Penticton)", type: "beach", lat: 49.4500, lng: -119.5833, accessNotes: "Large public beach" },
  // Cariboo
  { name: "Williams Lake", type: "lake", lat: 52.1167, lng: -122.1333, accessNotes: "City access" },
  { name: "Quesnel Lake", type: "lake", lat: 52.5000, lng: -121.0000, accessNotes: "FSR access" },
  { name: "Horsefly Lake", type: "lake", lat: 52.3500, lng: -121.4167, accessNotes: "Road access" },
  // Kootenays
  { name: "Kootenay Lake", type: "lake", lat: 49.6667, lng: -116.9167, accessNotes: "Multiple access points" },
  { name: "Arrow Lakes", type: "lake", lat: 49.8333, lng: -117.9167, accessNotes: "Ferry crossings" },
  { name: "Columbia River", type: "river", lat: 49.3167, lng: -117.6500, accessNotes: "Trail/Castlegar access" },
  // Northern BC
  { name: "Stuart Lake", type: "lake", lat: 54.4167, lng: -124.2667, accessNotes: "Fort St James access" },
  { name: "Fraser Lake", type: "lake", lat: 54.0500, lng: -124.8500, accessNotes: "Hwy 16 access" },
  { name: "Burns Lake", type: "lake", lat: 54.2333, lng: -125.7667, accessNotes: "Town access" },
  { name: "Babine Lake", type: "lake", lat: 55.1667, lng: -126.1000, accessNotes: "FSR access" },
  // Peace Region
  { name: "Charlie Lake", type: "lake", lat: 56.3000, lng: -120.9667, accessNotes: "Hwy 97 access" },
  { name: "Moberly Lake", type: "lake", lat: 55.8333, lng: -121.7667, accessNotes: "Road access" },
  // Vancouver Island
  { name: "Cowichan Lake", type: "lake", lat: 48.8333, lng: -124.1667, accessNotes: "Road access" },
  { name: "Sproat Lake", type: "lake", lat: 49.2833, lng: -125.0833, accessNotes: "Mars water bomber base" },
  { name: "Great Central Lake", type: "lake", lat: 49.3500, lng: -125.3333, accessNotes: "FSR access" },
  { name: "Campbell Lake", type: "lake", lat: 50.0333, lng: -125.3167, accessNotes: "Road access" },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { latitude, longitude, radiusKm = 50 } = body;

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: "latitude and longitude are required" },
        { status: 400 }
      );
    }

    // Filter and sort by distance
    const sources: WaterSource[] = BC_WATER_SOURCES
      .map((source) => ({
        ...source,
        distanceKm: Math.round(calculateDistance(latitude, longitude, source.lat, source.lng) * 10) / 10,
      }))
      .filter((source) => source.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 10); // Top 10 closest

    // Also search Google Places for water-related infrastructure and access points
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (apiKey) {
      try {
        for (const searchType of ["boat launch", "public beach water access", "water treatment plant", "reservoir"]) {
          const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": apiKey,
              "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location",
            },
            body: JSON.stringify({
              textQuery: `${searchType} near ${latitude},${longitude}`,
              locationBias: {
                circle: {
                  center: { latitude, longitude },
                  radius: radiusKm * 1000,
                },
              },
              maxResultCount: 3,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.places) {
              for (const place of data.places) {
                const dist = calculateDistance(
                  latitude,
                  longitude,
                  place.location.latitude,
                  place.location.longitude
                );
                if (dist <= radiusKm) {
                  // Determine type based on search query
                  let sourceType = "water treatment";
                  if (searchType.includes("boat")) sourceType = "boat launch";
                  else if (searchType.includes("beach")) sourceType = "beach";
                  else if (searchType.includes("reservoir")) sourceType = "reservoir";

                  sources.push({
                    name: place.displayName.text,
                    type: sourceType,
                    lat: place.location.latitude,
                    lng: place.location.longitude,
                    distanceKm: Math.round(dist * 10) / 10,
                    accessNotes: "Via Google Places",
                  });
                }
              }
            }
          }
        }
      } catch {
        // Google Places search failed, continue with static data
      }
    }

    // Re-sort and dedupe
    const uniqueSources = sources
      .filter((s, i, arr) => arr.findIndex((x) => x.name === s.name) === i)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 10);

    return NextResponse.json({
      sources: uniqueSources,
      searchCenter: { lat: latitude, lng: longitude },
      radiusKm,
      count: uniqueSources.length,
    } as WaterSourcesResponse);
  } catch (error) {
    console.error("Error fetching water sources:", error);
    return NextResponse.json(
      { error: "Failed to fetch water sources" },
      { status: 500 }
    );
  }
}
