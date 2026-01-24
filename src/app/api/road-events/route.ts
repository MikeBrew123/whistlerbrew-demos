import { NextRequest, NextResponse } from "next/server";
export const runtime = "edge";


// DriveBC Open511 API
const DRIVEBC_API = "https://api.open511.gov.bc.ca/events";

type RoadEvent = {
  id: string;
  eventType: string;
  severity: string;
  headline: string;
  description: string;
  roadName: string;
  direction?: string;
  lat: number;
  lng: number;
  startTime?: string;
  endTime?: string;
  status: string;
};

type RoadEventsResponse = {
  events: RoadEvent[];
  count: number;
  bbox: string;
  route?: {
    origin: string;
    destination: string;
  };
};

// Severity mapping for consistent display
const SEVERITY_MAP: Record<string, string> = {
  MINOR: "Minor",
  MODERATE: "Moderate",
  MAJOR: "Major",
  UNKNOWN: "Unknown",
};

// Event type mapping
const EVENT_TYPE_MAP: Record<string, string> = {
  CONSTRUCTION: "Construction",
  INCIDENT: "Incident",
  SPECIAL_EVENT: "Special Event",
  WEATHER_CONDITION: "Weather",
  ROAD_CONDITION: "Road Condition",
};

function calculateBoundingBox(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  padding = 0.5 // ~50km padding
): string {
  const minLat = Math.min(originLat, destLat) - padding;
  const maxLat = Math.max(originLat, destLat) + padding;
  const minLng = Math.min(originLng, destLng) - padding;
  const maxLng = Math.max(originLng, destLng) + padding;

  // Format: minLng,minLat,maxLng,maxLat
  return `${minLng},${minLat},${maxLng},${maxLat}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { originLat, originLng, destLat, destLng, origin, destination, latitude, longitude, radiusKm = 50 } = body;

    let bbox: string;

    // Support both route-based (origin/dest) and location-based (single point with radius) queries
    if (latitude && longitude) {
      // Location-based query - create bbox around single point
      const latDelta = radiusKm / 111;
      const lngDelta = radiusKm / (111 * Math.cos((latitude * Math.PI) / 180));
      bbox = `${longitude - lngDelta},${latitude - latDelta},${longitude + lngDelta},${latitude + latDelta}`;
    } else if (originLat && originLng && destLat && destLng) {
      // Route-based query
      bbox = calculateBoundingBox(originLat, originLng, destLat, destLng);
    } else {
      return NextResponse.json(
        { error: "Either (latitude, longitude) or (originLat, originLng, destLat, destLng) are required" },
        { status: 400 }
      );
    }

    // Build API URL
    const params = new URLSearchParams({
      status: "ACTIVE",
      format: "json",
      bbox: bbox,
      limit: "100",
    });

    const response = await fetch(`${DRIVEBC_API}?${params}`);

    if (!response.ok) {
      console.error(`DriveBC API returned ${response.status}`);
      return NextResponse.json({
        events: [],
        count: 0,
        bbox,
        error: "DriveBC API temporarily unavailable",
      });
    }

    const data = await response.json();

    // Transform events
    const events: RoadEvent[] = (data.events || []).map(
      (event: {
        id: string;
        event_type: string;
        severity: string;
        headline: string;
        description: string;
        roads?: Array<{ name: string; direction?: string }>;
        geography?: { coordinates: [number, number] };
        schedule?: { intervals?: Array<{ start?: string; end?: string }> };
        status: string;
      }) => {
        // Get coordinates from geography
        let lat = 0,
          lng = 0;
        if (event.geography?.coordinates) {
          // GeoJSON format: [lng, lat]
          [lng, lat] = event.geography.coordinates;
        }

        // Get road name and direction
        const road = event.roads?.[0];
        const roadName = road?.name || "Unknown Road";
        const direction = road?.direction;

        // Get schedule
        const interval = event.schedule?.intervals?.[0];

        return {
          id: event.id || `event-${Math.random()}`,
          eventType: EVENT_TYPE_MAP[event.event_type] || event.event_type,
          severity: SEVERITY_MAP[event.severity] || event.severity,
          headline: event.headline || "",
          description: event.description || "",
          roadName,
          direction,
          lat,
          lng,
          startTime: interval?.start,
          endTime: interval?.end,
          status: event.status,
        };
      }
    );

    // Sort by severity (Major first)
    const severityOrder = ["Major", "Moderate", "Minor", "Unknown"];
    events.sort((a, b) => {
      const aOrder = severityOrder.indexOf(a.severity);
      const bOrder = severityOrder.indexOf(b.severity);
      return aOrder - bOrder;
    });

    const result: RoadEventsResponse = {
      events,
      count: events.length,
      bbox,
      route: origin && destination ? { origin, destination } : undefined,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching road events:", error);
    return NextResponse.json(
      { error: "Failed to fetch road events" },
      { status: 500 }
    );
  }
}
