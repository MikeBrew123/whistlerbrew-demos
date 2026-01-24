import { NextRequest, NextResponse } from "next/server";
export const runtime = "edge";


// Environment Canada RSS feed URL format: https://weather.gc.ca/rss/city/bc-XX_e.xml
// BC city codes for Environment Canada forecasts (RSS format: bc-XX)
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

type ForecastDay = {
  day: string;
  summary: string;
  high?: number;
  low?: number;
  pop?: number; // Probability of precipitation
};

type WeatherResponse = {
  location: string;
  current?: {
    temperature?: number;
    condition?: string;
    humidity?: number;
    wind?: string;
    observedAt?: string;
  };
  forecast: ForecastDay[];
  warnings: string[];
  stationName?: string;
  error?: string;
};

async function fetchEnvironmentCanadaForecast(cityCode: string): Promise<WeatherResponse | null> {
  try {
    // Environment Canada RSS feed URL
    const rssUrl = `https://weather.gc.ca/rss/city/${cityCode}_e.xml`;
    const response = await fetch(rssUrl, { next: { revalidate: 1800 } }); // Cache for 30 minutes

    if (!response.ok) {
      console.error(`EC RSS returned ${response.status} for ${cityCode}`);
      return null;
    }

    const xmlText = await response.text();

    // Parse the RSS XML response
    const warnings: string[] = [];
    const forecast: ForecastDay[] = [];

    // Extract location from title (format: "City Name - Weather - Environment Canada")
    const titleMatch = xmlText.match(/<title>([^<]+) - Weather/);
    const location = titleMatch ? titleMatch[1].trim() : "Unknown";

    // Extract current conditions from entry with "Current Conditions" in title
    const currentMatch = xmlText.match(/<entry>[\s\S]*?<title>Current Conditions:\s*([^<]+)<\/title>[\s\S]*?<summary[^>]*>([\s\S]*?)<\/summary>[\s\S]*?<\/entry>/);
    let current: WeatherResponse["current"] = undefined;

    if (currentMatch) {
      const titleTemp = currentMatch[1].trim();
      const summaryText = currentMatch[2].replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, " ").trim();

      // Parse temperature from title like "-5.8°C"
      const tempMatch = titleTemp.match(/(-?[\d.]+)°C/);

      // Parse humidity and wind from summary
      const humidityMatch = summaryText.match(/Humidity:\s*(\d+)\s*%/i);
      const windMatch = summaryText.match(/Wind:\s*([^A-Z][^<\n]*?)(?:\s+Air|$)/i);
      const conditionMatch = summaryText.match(/Condition:\s*([^<\n]+)/i);

      current = {
        temperature: tempMatch ? parseFloat(tempMatch[1]) : undefined,
        condition: conditionMatch ? conditionMatch[1].trim() : undefined,
        humidity: humidityMatch ? parseInt(humidityMatch[1]) : undefined,
        wind: windMatch ? windMatch[1].trim() : undefined,
      };
    }

    // Extract warnings - look for entries with "WARNING" or "WATCH" or "ADVISORY" in title
    const warningMatches = xmlText.matchAll(/<entry>[\s\S]*?<title>([^<]*(?:WARNING|WATCH|ADVISORY|ALERT)[^<]*)<\/title>[\s\S]*?<\/entry>/gi);
    for (const match of warningMatches) {
      warnings.push(match[1].trim());
    }

    // Extract forecast entries (category = "Weather Forecasts")
    const forecastMatches = xmlText.matchAll(/<entry>[\s\S]*?<title>([^<]+)<\/title>[\s\S]*?<category term="Weather Forecasts"\/>[\s\S]*?<summary[^>]*>([\s\S]*?)<\/summary>[\s\S]*?<\/entry>/g);
    for (const match of forecastMatches) {
      const title = match[1].trim();
      const summary = match[2].replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, " ").trim();

      // Parse forecast day name (e.g., "Friday: Mainly sunny. High minus 1.")
      const dayMatch = title.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(\s+night)?:/i);
      if (!dayMatch) continue;

      const dayName = dayMatch[1] + (dayMatch[2] || "");

      const day: ForecastDay = {
        day: dayName,
        summary: title.replace(/^[^:]+:\s*/, ""), // Use title text after the day name
      };

      // Try to extract high/low from title (format: "High minus 1" or "Low minus 11")
      const highMatch = title.match(/High\s+(minus\s+)?(\d+)/i);
      const lowMatch = title.match(/Low\s+(minus\s+)?(\d+)/i);

      if (highMatch) {
        day.high = highMatch[1] ? -parseInt(highMatch[2]) : parseInt(highMatch[2]);
      }
      if (lowMatch) {
        day.low = lowMatch[1] ? -parseInt(lowMatch[2]) : parseInt(lowMatch[2]);
      }

      // Extract POP from summary
      const popMatch = summary.match(/POP\s+(\d+)%/i) || summary.match(/(\d+)\s*percent\s+chance/i);
      if (popMatch) {
        day.pop = parseInt(popMatch[1]);
      }

      forecast.push(day);
    }

    return {
      location,
      current,
      forecast: forecast.slice(0, 6), // Limit to ~3 days
      warnings,
    };
  } catch (error) {
    console.error("Error fetching EC forecast:", error);
    return null;
  }
}

function findNearestCity(lat: number, lng: number): string | null {
  // Approximate coordinates for BC cities (matched to EC city codes)
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

  // Only return if within reasonable distance (~200km ≈ 2 degrees)
  return minDistance < 2 ? nearestCity : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { latitude, longitude, community } = body;

    let cityCode: string | undefined;
    let searchLocation = community?.toLowerCase().trim();

    // If community provided, try to find city code directly
    if (searchLocation) {
      cityCode = BC_CITY_CODES[searchLocation];

      // Try partial match if exact match fails
      if (!cityCode) {
        for (const [city, code] of Object.entries(BC_CITY_CODES)) {
          if (city.includes(searchLocation) || searchLocation.includes(city)) {
            cityCode = code;
            break;
          }
        }
      }
    }

    // If no city code found but we have coordinates, find nearest city
    if (!cityCode && latitude && longitude) {
      const nearestCity = findNearestCity(latitude, longitude);
      if (nearestCity) {
        cityCode = BC_CITY_CODES[nearestCity];
      }
    }

    // If still no city code, try geocoding the community
    if (!cityCode && community) {
      try {
        const geoRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/geocode`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: community }),
        });

        if (geoRes.ok) {
          const geoData = await geoRes.json();
          const nearestCity = findNearestCity(geoData.latitude, geoData.longitude);
          if (nearestCity) {
            cityCode = BC_CITY_CODES[nearestCity];
          }
        }
      } catch {
        // Geocoding failed, continue without
      }
    }

    if (!cityCode) {
      return NextResponse.json({
        location: community || "Unknown",
        forecast: [],
        warnings: [],
        error: "Could not find weather data for this location. Try a major BC city name.",
      });
    }

    const weather = await fetchEnvironmentCanadaForecast(cityCode);

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
    return NextResponse.json(
      { error: "Failed to fetch weather data" },
      { status: 500 }
    );
  }
}
