import { NextRequest, NextResponse } from "next/server";

// Google Routes API (New)
const GOOGLE_ROUTES_API = "https://routes.googleapis.com/directions/v2:computeRoutes";

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

// For new Routes API response format
function findPointAtDurationNew(
  legs: Array<{
    steps?: Array<{
      localizedValues?: { staticDuration?: { text: string } };
      endLocation?: { latLng: { latitude: number; longitude: number } };
      navigationInstruction?: { instructions?: string };
    }>;
  }>,
  targetSeconds: number
): { lat: number; lng: number; locationName: string } | null {
  let accumulated = 0;

  for (const leg of legs) {
    if (!leg.steps) continue;
    for (const step of leg.steps) {
      // Parse duration from text like "5 mins" or "1 hour 30 mins"
      const durationText = step.localizedValues?.staticDuration?.text || "";
      let stepSeconds = 0;
      const hoursMatch = durationText.match(/(\d+)\s*hour/i);
      const minsMatch = durationText.match(/(\d+)\s*min/i);
      if (hoursMatch) stepSeconds += parseInt(hoursMatch[1]) * 3600;
      if (minsMatch) stepSeconds += parseInt(minsMatch[1]) * 60;

      accumulated += stepSeconds;
      if (accumulated >= targetSeconds && step.endLocation?.latLng) {
        const lat = step.endLocation.latLng.latitude;
        const lng = step.endLocation.latLng.longitude;
        const instructions = step.navigationInstruction?.instructions || "";
        const locationMatch = instructions.match(/(?:toward|onto|via)\s+([^<]+)/i);
        const locationName = locationMatch
          ? locationMatch[1].trim()
          : `${lat.toFixed(2)}, ${lng.toFixed(2)}`;

        return { lat, lng, locationName };
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

    // Build request for Routes API (New)
    const requestBody = {
      origin: {
        location: {
          latLng: {
            latitude: originLat,
            longitude: originLng,
          },
        },
      },
      destination: {
        location: {
          latLng: {
            latitude: destLat,
            longitude: destLng,
          },
        },
      },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      computeAlternativeRoutes: false,
      languageCode: "en-CA",
      units: "METRIC",
    };

    let durationSeconds: number;
    let distanceMeters: number;
    let routePolyline = "";
    let routeLegs: Array<{ steps?: Array<unknown> }> = [];

    // Try Routes API first, fall back to Haversine calculation
    const response = await fetch(GOOGLE_ROUTES_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps.navigationInstruction,routes.legs.steps.endLocation,routes.legs.steps.localizedValues",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (response.ok && data.routes && data.routes.length > 0) {
      // Use Routes API response
      const route = data.routes[0];
      durationSeconds = parseInt(route.duration.replace("s", ""));
      distanceMeters = route.distanceMeters;
      routePolyline = route.polyline?.encodedPolyline || "";
      routeLegs = route.legs || [];
    } else {
      // Fallback: Calculate straight-line distance and estimate driving time
      console.log("Routes API unavailable, using Haversine fallback");
      const R = 6371000; // Earth radius in meters
      const dLat = ((destLat - originLat) * Math.PI) / 180;
      const dLng = ((destLng - originLng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((originLat * Math.PI) / 180) *
          Math.cos((destLat * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const straightLineMeters = R * c;

      // BC roads are typically 1.3-1.5x straight-line due to terrain
      distanceMeters = Math.round(straightLineMeters * 1.4);
      // Average BC highway speed ~80 km/h accounting for terrain
      durationSeconds = Math.round((distanceMeters / 1000 / 80) * 3600);
    }

    // Check for Vancouver Island crossing
    const originOnIsland = isOnVancouverIsland(originLat, originLng);
    const destOnIsland = isOnVancouverIsland(destLat, destLng);
    const islandCrossing = originOnIsland !== destOnIsland;

    // Calculate adjusted duration (add 2 hours for ferry)
    let adjustedDurationValue = durationSeconds;
    let adjustedDuration: RouteResult["adjustedDuration"] = undefined;

    if (islandCrossing) {
      const ferryTimeSeconds = 2 * 3600; // 2 hours for ferry wait + crossing
      adjustedDurationValue = durationSeconds + ferryTimeSeconds;
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

    if (needsOvernight && routeLegs.length > 0) {
      const point = findPointAtDurationNew(routeLegs as Parameters<typeof findPointAtDurationNew>[0], TEN_HOURS_SECONDS);
      if (point) {
        overnightPoint = {
          lat: point.lat,
          lng: point.lng,
          locationName: point.locationName,
          suggestedStopTime: "After approximately 10 hours of driving",
        };
      }
    }

    // Format distance text
    const distanceKm = Math.round(distanceMeters / 1000);
    const distanceText = distanceKm >= 1000
      ? `${(distanceKm / 1000).toFixed(1)} thousand km`
      : `${distanceKm} km`;

    const result: RouteResult = {
      duration: {
        value: durationSeconds,
        text: formatDuration(durationSeconds),
      },
      distance: {
        value: distanceMeters,
        text: distanceText,
      },
      polyline: routePolyline,
      startAddress: origin || `${originLat}, ${originLng}`,
      endAddress: destination || `${destLat}, ${destLng}`,
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
