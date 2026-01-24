import { NextRequest, NextResponse } from "next/server";
export const runtime = "edge";


type RouteBriefRequest = {
  origin: string;
  destination: string;
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  departureDate?: string;
  departureTime?: string;
};

type RoadEvent = {
  id: string;
  eventType: string;
  severity: string;
  headline: string;
  description: string;
  roadName: string;
  direction?: string;
};

type RouteData = {
  duration: { value: number; text: string };
  distance: { value: number; text: string };
  startAddress: string;
  endAddress: string;
  needsOvernight: boolean;
  islandCrossing: boolean;
  adjustedDuration?: { value: number; text: string; ferryNote: string };
  overnightPoint?: { lat: number; lng: number; locationName: string };
};

type HotelData = {
  name: string;
  address: string;
  phone?: string;
  rating?: number;
};

type WeatherData = {
  location: string;
  current?: { title: string; summary: string };
  forecast?: Array<{ title: string; summary: string }>;
};

type RouteBriefResult = {
  brief: string;
  sections: {
    header: string;
    driveInfo: string;
    roadEvents: string;
    weather: string;
    overnightStop?: string;
  };
  data: {
    route: RouteData | null;
    events: RoadEvent[];
    weather: WeatherData | null;
    hotels: HotelData[];
  };
};

async function fetchRoute(
  origin: string,
  destination: string,
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<RouteData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/route-calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origin, destination, originLat, originLng, destLat, destLng }),
    });
    const data = await response.json();
    return data.route || null;
  } catch (error) {
    console.error("Error fetching route:", error);
    return null;
  }
}

async function fetchRoadEvents(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<RoadEvent[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/road-events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ originLat, originLng, destLat, destLng }),
    });
    const data = await response.json();
    return data.events || [];
  } catch (error) {
    console.error("Error fetching road events:", error);
    return [];
  }
}

async function fetchWeather(city: string): Promise<WeatherData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/weather`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city }),
    });
    const data = await response.json();
    if (data.error) return null;
    return data;
  } catch (error) {
    console.error("Error fetching weather:", error);
    return null;
  }
}

async function fetchHotels(
  lat: number,
  lng: number,
  locationName: string
): Promise<HotelData[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/hotels/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lng, locationName, radiusKm: 50 }),
    });
    const data = await response.json();
    return (data.hotels || []).slice(0, 3);
  } catch (error) {
    console.error("Error fetching hotels:", error);
    return [];
  }
}

function formatRoadEvents(events: RoadEvent[]): string {
  if (events.length === 0) {
    return "No active road events reported along this route.";
  }

  const majorEvents = events.filter((e) => e.severity === "Major");
  const otherEvents = events.filter((e) => e.severity !== "Major");

  let text = "";

  if (majorEvents.length > 0) {
    text += "⚠️ MAJOR EVENTS:\n";
    majorEvents.forEach((event) => {
      text += `• ${event.roadName}: ${event.headline}\n`;
      if (event.description) {
        text += `  ${event.description.substring(0, 200)}${event.description.length > 200 ? "..." : ""}\n`;
      }
    });
    text += "\n";
  }

  if (otherEvents.length > 0) {
    text += `Other Events (${otherEvents.length}):\n`;
    otherEvents.slice(0, 5).forEach((event) => {
      text += `• ${event.roadName}: ${event.headline} (${event.severity})\n`;
    });
    if (otherEvents.length > 5) {
      text += `  ...and ${otherEvents.length - 5} more\n`;
    }
  }

  return text;
}

function formatWeather(weather: WeatherData | null): string {
  if (!weather) {
    return "Weather data unavailable for destination.";
  }

  let text = `Weather for ${weather.location}:\n`;

  if (weather.current) {
    text += `Current: ${weather.current.summary}\n`;
  }

  if (weather.forecast && weather.forecast.length > 0) {
    text += "\nForecast:\n";
    weather.forecast.slice(0, 3).forEach((f) => {
      text += `• ${f.title}: ${f.summary}\n`;
    });
  }

  return text;
}

function formatOvernightStop(
  overnightPoint: RouteData["overnightPoint"],
  hotels: HotelData[]
): string {
  if (!overnightPoint) return "";

  let text = `\n🏨 OVERNIGHT STOP RECOMMENDED\n`;
  text += `Location: Near ${overnightPoint.locationName}\n`;
  text += `Reason: Drive exceeds 10 hours\n\n`;

  if (hotels.length > 0) {
    text += "Suggested Hotels:\n";
    hotels.forEach((hotel, i) => {
      text += `${i + 1}. ${hotel.name}`;
      if (hotel.rating) text += ` (${hotel.rating}⭐)`;
      text += `\n   ${hotel.address}`;
      if (hotel.phone) text += `\n   Tel: ${hotel.phone}`;
      text += "\n";
    });
  } else {
    text += "No hotels found nearby. Consider searching for accommodations in the area.\n";
  }

  return text;
}

export async function POST(request: NextRequest) {
  try {
    const body: RouteBriefRequest = await request.json();
    const { origin, destination, originLat, originLng, destLat, destLng, departureDate } = body;

    if (!origin || !destination || !originLat || !originLng || !destLat || !destLng) {
      return NextResponse.json(
        { error: "origin, destination, and coordinates are required" },
        { status: 400 }
      );
    }

    // Fetch all data in parallel
    const [route, events, weather] = await Promise.all([
      fetchRoute(origin, destination, originLat, originLng, destLat, destLng),
      fetchRoadEvents(originLat, originLng, destLat, destLng),
      fetchWeather(destination),
    ]);

    // Fetch hotels if overnight stop needed
    let hotels: HotelData[] = [];
    if (route?.needsOvernight && route.overnightPoint) {
      hotels = await fetchHotels(
        route.overnightPoint.lat,
        route.overnightPoint.lng,
        route.overnightPoint.locationName
      );
    }

    // Build sections
    const header = `ROUTE BRIEF: ${origin} → ${destination}\n` +
      `Generated: ${new Date().toLocaleString("en-CA", { timeZone: "America/Vancouver" })}\n` +
      (departureDate ? `Departure: ${departureDate}\n` : "");

    let driveInfo = "";
    if (route) {
      driveInfo = `Distance: ${route.distance.text}\n`;
      driveInfo += `Drive Time: ${route.duration.text}`;
      if (route.islandCrossing && route.adjustedDuration) {
        driveInfo += `\n⛴️ ${route.adjustedDuration.ferryNote}`;
        driveInfo += `\nAdjusted Total: ${route.adjustedDuration.text}`;
      }
      if (route.needsOvernight) {
        driveInfo += `\n⚠️ Route exceeds 10 hours - overnight stop recommended`;
      }
    } else {
      driveInfo = "Route calculation unavailable.";
    }

    const roadEventsText = formatRoadEvents(events);
    const weatherText = formatWeather(weather);
    const overnightText = route?.needsOvernight
      ? formatOvernightStop(route.overnightPoint, hotels)
      : "";

    // Assemble full brief
    const brief = [
      "═".repeat(50),
      header,
      "═".repeat(50),
      "",
      "📍 DRIVE INFORMATION",
      "-".repeat(30),
      driveInfo,
      "",
      "🚧 ROAD CONDITIONS",
      "-".repeat(30),
      roadEventsText,
      "🌤️ DESTINATION WEATHER",
      "-".repeat(30),
      weatherText,
      overnightText,
      "",
      "═".repeat(50),
      "Check DriveBC (drivebc.ca) for real-time updates",
      "═".repeat(50),
    ].join("\n");

    const result: RouteBriefResult = {
      brief,
      sections: {
        header,
        driveInfo,
        roadEvents: roadEventsText,
        weather: weatherText,
        overnightStop: overnightText || undefined,
      },
      data: {
        route,
        events,
        weather,
        hotels,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error generating route brief:", error);
    return NextResponse.json(
      { error: "Failed to generate route brief" },
      { status: 500 }
    );
  }
}
