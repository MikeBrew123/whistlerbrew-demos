import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

// Environment Canada GeoMet API (replaced deprecated RSS feeds)
const EC_API = "https://api.weather.gc.ca/collections/citypageweather-realtime/items";

const BC_CITY_CODES: Record<string, string> = {
  "100 mile house": "bc-7",
  "abbotsford": "bc-81",
  "burns lake": "bc-43",
  "campbell river": "bc-19",
  "chilliwack": "bc-24",
  "cranbrook": "bc-77",
  "creston": "bc-26",
  "dawson creek": "bc-25",
  "fort nelson": "bc-83",
  "fort st john": "bc-78",
  "golden": "bc-34",
  "grand forks": "bc-39",
  "hope": "bc-36",
  "kamloops": "bc-45",
  "kelowna": "bc-48",
  "kitimat": "bc-30",
  "lillooet": "bc-28",
  "mackenzie": "bc-90",
  "merritt": "bc-49",
  "nanaimo": "bc-20",
  "nakusp": "bc-38",
  "nelson": "bc-37",
  "osoyoos": "bc-69",
  "pemberton": "bc-16",
  "penticton": "bc-84",
  "port alberni": "bc-46",
  "powell river": "bc-58",
  "prince george": "bc-79",
  "prince rupert": "bc-57",
  "quesnel": "bc-64",
  "revelstoke": "bc-65",
  "salmon arm": "bc-51",
  "smithers": "bc-82",
  "squamish": "bc-50",
  "terrace": "bc-80",
  "trail": "bc-71",
  "vancouver": "bc-74",
  "vanderhoof": "bc-44",
  "vernon": "bc-27",
  "victoria": "bc-85",
  "whistler": "bc-86",
  "williams lake": "bc-76",
};

type ForecastDay = { day: string; summary: string; high?: number; low?: number; pop?: number };
type WeatherResponse = {
  location: string;
  current?: { temperature?: number; condition?: string; humidity?: number; wind?: string };
  forecast: ForecastDay[];
  warnings: string[];
  error?: string;
};

async function fetchECWeather(cityCode: string): Promise<WeatherResponse | null> {
  try {
    const url = `${EC_API}?lang=en&f=json&identifier=${cityCode}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const features = data.features || [];
    if (features.length === 0) return null;

    const props = features[0].properties;
    const cc = props.currentConditions || {};
    const fg = props.forecastGroup || {};
    const forecasts = fg.forecasts || [];
    const rawWarnings = props.warnings || [];

    const location = props.name?.en || "Unknown";

    const windSpeed = cc.wind?.speed?.value?.en;
    const windDir = cc.wind?.direction?.value?.en;
    const windGust = cc.wind?.gust?.value?.en;
    let windStr: string | undefined;
    if (windSpeed != null && windDir) {
      windStr = `${windDir} ${windSpeed} km/h`;
      if (windGust) windStr += ` gusting ${windGust}`;
    }

    const current = {
      temperature: cc.temperature?.value?.en ?? undefined,
      condition: cc.condition?.en ?? undefined,
      humidity: cc.relativeHumidity?.value?.en ?? undefined,
      wind: windStr,
    };

    const forecast: ForecastDay[] = forecasts.slice(0, 6).map((f: any) => {
      const day = f.period?.textForecastName?.en || f.period?.value?.en || "—";
      const summary = f.textSummary?.en || "";
      const temps = f.temperatures?.temperature || [];
      const high = temps.find((t: any) => t.class?.en === "high")?.value?.en;
      const low = temps.find((t: any) => t.class?.en === "low")?.value?.en;

      return { day, summary, high, low };
    });

    const warnings: string[] = Array.isArray(rawWarnings)
      ? rawWarnings.map((w: any) => w.description?.en || w.event?.en || "").filter(Boolean)
      : [];

    return { location, current, forecast, warnings };
  } catch (error) {
    console.error("Error fetching EC weather:", error);
    return null;
  }
}

function findNearestCity(lat: number, lng: number): string | null {
  const cityCoords: Record<string, [number, number]> = {
    "100 mile house": [51.64, -121.29],
    "burns lake": [54.23, -125.76],
    "campbell river": [50.02, -125.25],
    "cranbrook": [49.51, -115.77],
    "dawson creek": [55.76, -120.24],
    "fort nelson": [58.81, -122.70],
    "fort st john": [56.25, -120.85],
    "golden": [51.30, -116.97],
    "kamloops": [50.67, -120.33],
    "kelowna": [49.88, -119.49],
    "lillooet": [50.69, -121.94],
    "mackenzie": [55.34, -123.09],
    "merritt": [50.11, -120.79],
    "nanaimo": [49.17, -123.94],
    "nelson": [49.49, -117.29],
    "pemberton": [50.32, -122.80],
    "penticton": [49.49, -119.59],
    "prince george": [53.92, -122.75],
    "prince rupert": [54.32, -130.32],
    "quesnel": [52.98, -122.49],
    "revelstoke": [51.00, -118.20],
    "salmon arm": [50.70, -119.29],
    "smithers": [54.78, -127.17],
    "squamish": [49.70, -123.15],
    "terrace": [54.52, -128.60],
    "vancouver": [49.28, -123.12],
    "vanderhoof": [54.02, -124.00],
    "vernon": [50.27, -119.27],
    "victoria": [48.43, -123.37],
    "whistler": [50.12, -122.95],
    "williams lake": [52.14, -122.14],
  };

  let nearestCity: string | null = null;
  let minDistance = Infinity;

  for (const [city, [cityLat, cityLng]] of Object.entries(cityCoords)) {
    const distance = Math.sqrt(Math.pow(lat - cityLat, 2) + Math.pow(lng - cityLng, 2));
    if (distance < minDistance) {
      minDistance = distance;
      nearestCity = city;
    }
  }

  return minDistance < 2 ? nearestCity : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { latitude, longitude, community } = body;

    let cityCode: string | undefined;
    const searchLocation = community?.toLowerCase().trim();

    if (searchLocation) {
      cityCode = BC_CITY_CODES[searchLocation];
      if (!cityCode) {
        for (const [city, code] of Object.entries(BC_CITY_CODES)) {
          if (city.includes(searchLocation) || searchLocation.includes(city)) {
            cityCode = code;
            break;
          }
        }
      }
    }

    if (!cityCode && latitude && longitude) {
      const nearestCity = findNearestCity(latitude, longitude);
      if (nearestCity) cityCode = BC_CITY_CODES[nearestCity];
    }

    if (!cityCode) {
      return NextResponse.json({
        location: community || "Unknown",
        forecast: [],
        warnings: [],
        error: "Could not find weather data for this location.",
      });
    }

    const weather = await fetchECWeather(cityCode);
    if (!weather) {
      return NextResponse.json({
        location: community || "Unknown",
        forecast: [],
        warnings: [],
        error: "Failed to fetch weather data from Environment Canada",
      });
    }

    return NextResponse.json(weather);
  } catch (error) {
    console.error("Error in weather API:", error);
    return NextResponse.json({ error: "Failed to fetch weather data" }, { status: 500 });
  }
}
