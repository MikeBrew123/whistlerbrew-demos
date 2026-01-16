import { NextRequest, NextResponse } from "next/server";

// Google Directions API
const GOOGLE_DIRECTIONS_API = "https://maps.googleapis.com/maps/api/directions/json";

// Vancouver Island detection - rough bounding box
const VANCOUVER_ISLAND_BBOX = {
  minLat: 48.3,
  maxLat: 50.8,
  minLng: -128.5,
  maxLng: -123.3,
};

type RouteResult = {
  duration: {
    value: number; // seconds
    text: string;
  };
  distance: {
    value: number; // meters
    text: string;
  };
  polyline: string;
  startAddress: string;
  endAddress: string;
  needsOvernight: boolean;
  islandCrossing: boolean;
  adjustedDuration?: {
    value: number;
    text: string;
    ferryNote: string;
  };
  overnightPoint?: {
    lat: number;
    lng: number;
    locationName: string;
    suggestedStopTime: string;
  };
};

type RouteResponse = {
  route: RouteResult | null;
  error?: string;
};

function isOnVancouverIsland(lat: number, lng: number): boolean {
  return (
    lat >= VANCOUVER_ISLAND_BBOX.minLat &&
    lat <= VANCOUVER_ISLAND_BBOX.maxLat &&
    lng >= VANCOUVER_ISLAND_BBOX.minLng &&
    lng <= VANCOUVER_ISLAND_BBOX.maxLng
  );
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${minutes} mins`;
  if (minutes === 0) return `${hours} hours`;
  return `${hours} hours ${minutes} mins`;
}

function decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
  const points: Array<{ lat: number; lng: number }> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({
      lat: lat / 1e5,
      lng: lng / 1e5,
    });
  }

  return points;
}

function findPointAtDuration(
  legs: Array<{
    steps: Array<{
      duration: { value: number };
      end_location: { lat: number; lng: number };
      html_instructions: string;
    }>;
  }>,
  targetSeconds: number
): { lat: number; lng: number; locationName: string } | null {
  let accumulated = 0;

  for (const leg of legs) {
    for (const step of leg.steps) {
      accumulated += step.duration.value;
      if (accumulated >= targetSeconds) {
        // Extract location name from instructions
        const instructions = step.html_instructions || "";
        const locationMatch = instructions.match(/(?:toward|onto|via)\s+([^<]+)/i);
        const locationName = locationMatch
          ? locationMatch[1].trim()
          : `${step.end_location.lat.toFixed(2)}, ${step.end_location.lng.toFixed(2)}`;

        return {
          lat: step.end_location.lat,
          lng: step.end_location.lng,
          locationName,
        };
      }
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { originLat, originLng, destLat, destLng, origin, destination } = body;

    if (!originLat || !originLng || !destLat || !destLng) {
      return NextResponse.json(
        { error: "originLat, originLng, destLat, and destLng are required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Google API key not configured" },
        { status: 500 }
      );
    }

    // Build request
    const originStr = origin || `${originLat},${originLng}`;
    const destStr = destination || `${destLat},${destLng}`;

    const params = new URLSearchParams({
      origin: originStr,
      destination: destStr,
      key: apiKey,
      mode: "driving",
      units: "metric",
      region: "ca",
    });

    const response = await fetch(`${GOOGLE_DIRECTIONS_API}?${params}`);
    const data = await response.json();

    if (data.status !== "OK") {
      console.error("Google Directions API error:", data.status, data.error_message);
      return NextResponse.json({
        route: null,
        error: data.error_message || `API error: ${data.status}`,
      });
    }

    const route = data.routes[0];
    const leg = route.legs[0];

    // Check for Vancouver Island crossing
    const originOnIsland = isOnVancouverIsland(originLat, originLng);
    const destOnIsland = isOnVancouverIsland(destLat, destLng);
    const islandCrossing = originOnIsland !== destOnIsland;

    // Calculate adjusted duration (add 2 hours for ferry)
    let adjustedDurationValue = leg.duration.value;
    let adjustedDuration: RouteResult["adjustedDuration"] = undefined;

    if (islandCrossing) {
      const ferryTimeSeconds = 2 * 3600; // 2 hours for ferry wait + crossing
      adjustedDurationValue = leg.duration.value + ferryTimeSeconds;
      adjustedDuration = {
        value: adjustedDurationValue,
        text: formatDuration(adjustedDurationValue),
        ferryNote: "Includes ~2 hours for BC Ferries (wait + crossing)",
      };
    }

    // Check if overnight stop needed (> 10 hours)
    const TEN_HOURS_SECONDS = 10 * 3600;
    const needsOvernight = adjustedDurationValue > TEN_HOURS_SECONDS;

    // Find 10-hour point if needed
    let overnightPoint: RouteResult["overnightPoint"] = undefined;

    if (needsOvernight) {
      const point = findPointAtDuration(route.legs, TEN_HOURS_SECONDS);
      if (point) {
        overnightPoint = {
          lat: point.lat,
          lng: point.lng,
          locationName: point.locationName,
          suggestedStopTime: "After approximately 10 hours of driving",
        };
      }
    }

    const result: RouteResult = {
      duration: {
        value: leg.duration.value,
        text: leg.duration.text,
      },
      distance: {
        value: leg.distance.value,
        text: leg.distance.text,
      },
      polyline: route.overview_polyline.points,
      startAddress: leg.start_address,
      endAddress: leg.end_address,
      needsOvernight,
      islandCrossing,
      adjustedDuration,
      overnightPoint,
    };

    return NextResponse.json({ route: result } as RouteResponse);
  } catch (error) {
    console.error("Error calculating route:", error);
    return NextResponse.json(
      { error: "Failed to calculate route" },
      { status: 500 }
    );
  }
}
