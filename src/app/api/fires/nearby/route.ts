import { NextRequest, NextResponse } from "next/server";

// BC OpenMaps WFS API for current fire points
const BC_FIRES_API =
  "https://openmaps.gov.bc.ca/geo/pub/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=WHSE_LAND_AND_NATURAL_RESOURCE.PROT_CURRENT_FIRE_PNTS_SP&outputFormat=json&CQL_FILTER=FIRE_OUT_DATE%20IS%20NULL";

type FireFeature = {
  properties: {
    FIRE_NUMBER: string;
    FIRE_YEAR: number;
    FIRE_CAUSE: string;
    FIRE_STATUS: string;
    CURRENT_SIZE: number;
    FIRE_CENTRE: string;
    GEOGRAPHIC_DESCRIPTION: string;
    FIRE_OF_NOTE_IND: string;
    FIRE_URL: string;
    LATITUDE: number;
    LONGITUDE: number;
  };
  geometry: {
    coordinates: [number, number];
  };
};

type Fire = {
  fireNumber: string;
  name: string;
  status: string;
  size: number;
  lat: number;
  lng: number;
  isFireOfNote: boolean;
  url: string;
  cause: string;
  fireCentre: string;
  distanceKm?: number;
};

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { latitude, longitude, radiusKm = 100 } = body;

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: "latitude and longitude are required" },
        { status: 400 }
      );
    }

    // Fetch all active fires from BC Wildfire Service
    const response = await fetch(BC_FIRES_API);

    if (!response.ok) {
      throw new Error(`BC Wildfire API returned ${response.status}`);
    }

    const data = await response.json();
    const features: FireFeature[] = data.features || [];

    // Transform and filter fires within radius
    const fires: Fire[] = features
      .map((feature) => {
        const props = feature.properties;
        // Use LATITUDE/LONGITUDE properties (geometry is in BC Albers projection)
        const lat = props.LATITUDE;
        const lng = props.LONGITUDE;

        const distanceKm = calculateDistance(latitude, longitude, lat, lng);

        return {
          fireNumber: props.FIRE_NUMBER,
          name: props.GEOGRAPHIC_DESCRIPTION || `Fire ${props.FIRE_NUMBER}`,
          status: props.FIRE_STATUS,
          size: props.CURRENT_SIZE || 0,
          lat,
          lng,
          isFireOfNote: props.FIRE_OF_NOTE_IND === "Y",
          url: props.FIRE_URL || `https://wildfiresituation.nrs.gov.bc.ca/incidents/${props.FIRE_NUMBER}`,
          cause: props.FIRE_CAUSE,
          fireCentre: props.FIRE_CENTRE,
          distanceKm: Math.round(distanceKm * 10) / 10,
        };
      })
      .filter((fire) => fire.distanceKm! <= radiusKm);

    // Sort: Fires of Note first, then by size descending
    fires.sort((a, b) => {
      if (a.isFireOfNote && !b.isFireOfNote) return -1;
      if (!a.isFireOfNote && b.isFireOfNote) return 1;
      return b.size - a.size;
    });

    return NextResponse.json({
      fires,
      count: fires.length,
      searchCenter: { latitude, longitude },
      radiusKm,
    });
  } catch (error) {
    console.error("Error fetching fires:", error);
    return NextResponse.json(
      { error: "Failed to fetch fire data" },
      { status: 500 }
    );
  }
}
