import { NextRequest, NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

type BriefingData = {
  community: string;
  fireNumber?: string;
  generatedAt: string;
  location?: { lat: number; lng: number };
  fire?: {
    fireNumber: string;
    name: string;
    status: string;
    size: number;
    cause: string;
    fireCentre: string;
    url: string;
    isFireOfNote: boolean;
  };
  nearbyFires?: Array<{
    fireNumber: string;
    name: string;
    status: string;
    size: number;
    distanceKm: number;
    isFireOfNote: boolean;
  }>;
  weather?: {
    location: string;
    current?: {
      temperature?: number;
      condition?: string;
      humidity?: number;
      wind?: string;
    };
    forecast: Array<{
      day: string;
      summary: string;
      high?: number;
      low?: number;
    }>;
    warnings: string[];
  };
  firstNations?: Array<{
    name: string;
    distanceKm: number;
    pronunciation?: string;
  }>;
  pois?: {
    fireDepartment?: Array<{
      name: string;
      address: string;
      phone?: string;
      confidence: string;
    }>;
    hospital?: Array<{
      name: string;
      address: string;
      phone?: string;
    }>;
    rcmp?: Array<{
      name: string;
      address: string;
      phone?: string;
    }>;
    groceryStore?: Array<{
      name: string;
      address: string;
    }>;
    hotel?: Array<{
      name: string;
      address: string;
    }>;
  };
  regionalContact?: {
    name: string;
    phone: string;
    website: string;
  };
};

async function geocodeCommunity(community: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/geocode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: community }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { lat: data.latitude, lng: data.longitude };
  } catch {
    return null;
  }
}

async function fetchNearbyFires(lat: number, lng: number, radiusKm = 100) {
  try {
    const res = await fetch(`${BASE_URL}/api/fires/nearby`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: lat, longitude: lng, radiusKm }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchWeather(community: string) {
  try {
    const res = await fetch(`${BASE_URL}/api/weather`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ community }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchFirstNations(lat: number, lng: number, radiusKm = 50) {
  try {
    const res = await fetch(`${BASE_URL}/api/first-nations/nearby`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: lat, longitude: lng, radiusKm }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchPOI(type: string, community: string) {
  try {
    const res = await fetch(`${BASE_URL}/api/poi/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, community }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function generateBriefingHTML(data: BriefingData): string {
  const { community, fireNumber, generatedAt, fire, nearbyFires, weather, firstNations, pois, regionalContact } = data;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-CA", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  };

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SPS Dispatch Briefing - ${community}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
    .header { background: #1a1a1a; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .header h1 { margin: 0 0 10px 0; color: #00a8ff; }
    .header .subtitle { color: #b0b0b0; font-size: 14px; }
    .section { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .section h2 { margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #00a8ff; color: #333; }
    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px 15px; margin-bottom: 15px; }
    .fire-of-note { background: #f8d7da; border-left: 4px solid #dc3545; padding: 10px 15px; margin-bottom: 15px; }
    .fire-of-note strong { color: #dc3545; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #eee; }
    th { background: #f8f9fa; font-weight: 600; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
    .badge-fire { background: #dc3545; color: white; }
    .badge-info { background: #17a2b8; color: white; }
    .sources { font-size: 12px; color: #666; }
    .sources ul { margin: 5px 0; padding-left: 20px; }
    .pronunciation { font-style: italic; color: #666; font-size: 13px; }
    @media print { body { background: white; } .section { box-shadow: none; border: 1px solid #ddd; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>SPS Dispatch Briefing</h1>
    <div class="subtitle">
      <strong>Community:</strong> ${community}<br>
      ${fireNumber ? `<strong>Fire Number:</strong> ${fireNumber}<br>` : ""}
      <strong>Generated:</strong> ${formatDate(generatedAt)}
    </div>
  </div>
`;

  // Fire Information Section
  if (fire || (nearbyFires && nearbyFires.length > 0)) {
    html += `<div class="section">
    <h2>🔥 BC Wildfire Service Information</h2>`;

    if (fire) {
      html += `
    ${fire.isFireOfNote ? '<div class="fire-of-note"><strong>⚠️ FIRE OF NOTE</strong> - This fire is being closely monitored by BC Wildfire Service</div>' : ""}
    <table>
      <tr><th>Fire Number</th><td>${fire.fireNumber}</td></tr>
      <tr><th>Name</th><td>${fire.name}</td></tr>
      <tr><th>Status</th><td>${fire.status}</td></tr>
      <tr><th>Size</th><td>${fire.size.toLocaleString()} hectares</td></tr>
      <tr><th>Cause</th><td>${fire.cause}</td></tr>
      <tr><th>Fire Centre</th><td>${fire.fireCentre}</td></tr>
      <tr><th>More Info</th><td><a href="${fire.url}" target="_blank">BC Wildfire Dashboard</a></td></tr>
    </table>`;
    }

    if (nearbyFires && nearbyFires.length > 0) {
      html += `
    <h3>Other Fires Within 100km</h3>
    <table>
      <tr><th>Fire #</th><th>Name</th><th>Status</th><th>Size (ha)</th><th>Distance</th></tr>
      ${nearbyFires
        .slice(0, 5)
        .map(
          (f) => `<tr>
        <td>${f.fireNumber}${f.isFireOfNote ? ' <span class="badge badge-fire">FON</span>' : ""}</td>
        <td>${f.name}</td>
        <td>${f.status}</td>
        <td>${f.size.toLocaleString()}</td>
        <td>${f.distanceKm} km</td>
      </tr>`
        )
        .join("")}
    </table>`;
    }

    html += `</div>`;
  }

  // First Nations Section
  if (firstNations && firstNations.length > 0) {
    html += `<div class="section">
    <h2>🏛️ Local First Nations</h2>
    <p style="font-size: 13px; color: #666; margin-bottom: 15px;">
      <em>Pronunciation guides are approximate. Please verify with community members.</em>
    </p>
    <table>
      <tr><th>Nation</th><th>Distance</th><th>Pronunciation Guide</th></tr>
      ${firstNations
        .slice(0, 5)
        .map(
          (fn) => `<tr>
        <td><strong>${fn.name}</strong></td>
        <td>${fn.distanceKm} km</td>
        <td class="pronunciation">${fn.pronunciation || "—"}</td>
      </tr>`
        )
        .join("")}
    </table>
  </div>`;
  }

  // Weather Section
  if (weather) {
    html += `<div class="section">
    <h2>🌤️ Weather Forecast</h2>`;

    if (weather.warnings && weather.warnings.length > 0 && !weather.warnings[0].includes("No watches")) {
      html += weather.warnings.map((w: string) => `<div class="warning">⚠️ ${w}</div>`).join("");
    }

    if (weather.current && weather.current.temperature !== undefined) {
      html += `
    <h3>Current Conditions (${weather.location})</h3>
    <table>
      <tr><th>Temperature</th><td>${weather.current.temperature}°C</td></tr>
      ${weather.current.condition ? `<tr><th>Condition</th><td>${weather.current.condition}</td></tr>` : ""}
      ${weather.current.humidity ? `<tr><th>Humidity</th><td>${weather.current.humidity}%</td></tr>` : ""}
      ${weather.current.wind ? `<tr><th>Wind</th><td>${weather.current.wind}</td></tr>` : ""}
    </table>`;
    }

    if (weather.forecast && weather.forecast.length > 0) {
      html += `
    <h3>3-Day Forecast</h3>
    <table>
      <tr><th>Period</th><th>Forecast</th><th>Temp</th></tr>
      ${weather.forecast
        .slice(0, 6)
        .map(
          (f) => `<tr>
        <td><strong>${f.day}</strong></td>
        <td>${f.summary}</td>
        <td>${f.high !== undefined ? `High ${f.high}°C` : f.low !== undefined ? `Low ${f.low}°C` : "—"}</td>
      </tr>`
        )
        .join("")}
    </table>`;
    }

    html += `</div>`;
  }

  // Municipal Contacts Section
  if (pois) {
    html += `<div class="section">
    <h2>📞 Emergency & Municipal Contacts</h2>`;

    if (pois.fireDepartment && pois.fireDepartment.length > 0) {
      html += `
    <h3>Fire Department</h3>
    <table>
      ${pois.fireDepartment
        .map(
          (p) => `<tr>
        <td><strong>${p.name}</strong><br><small>${p.address}</small></td>
        <td>${p.phone || "—"}</td>
      </tr>`
        )
        .join("")}
    </table>`;
    }

    if (pois.rcmp && pois.rcmp.length > 0) {
      html += `
    <h3>RCMP</h3>
    <table>
      ${pois.rcmp
        .map(
          (p) => `<tr>
        <td><strong>${p.name}</strong><br><small>${p.address}</small></td>
        <td>${p.phone || "—"}</td>
      </tr>`
        )
        .join("")}
    </table>`;
    }

    if (pois.hospital && pois.hospital.length > 0) {
      html += `
    <h3>Hospital / Health Centre</h3>
    <table>
      ${pois.hospital
        .map(
          (p) => `<tr>
        <td><strong>${p.name}</strong><br><small>${p.address}</small></td>
        <td>${p.phone || "—"}</td>
      </tr>`
        )
        .join("")}
    </table>`;
    }

    html += `</div>`;
  }

  // Regional Contact
  if (regionalContact) {
    html += `<div class="section">
    <h2>🏢 Regional District</h2>
    <table>
      <tr><th>Name</th><td>${regionalContact.name}</td></tr>
      <tr><th>Phone</th><td>${regionalContact.phone}</td></tr>
      <tr><th>Website</th><td><a href="${regionalContact.website}" target="_blank">${regionalContact.website}</a></td></tr>
    </table>
  </div>`;
  }

  // Local Services
  if (pois && (pois.groceryStore || pois.hotel)) {
    html += `<div class="section">
    <h2>🛒 Local Services</h2>`;

    if (pois.groceryStore && pois.groceryStore.length > 0) {
      html += `
    <h3>Grocery Stores</h3>
    <ul>
      ${pois.groceryStore.map((p) => `<li><strong>${p.name}</strong> - ${p.address}</li>`).join("")}
    </ul>`;
    }

    if (pois.hotel && pois.hotel.length > 0) {
      html += `
    <h3>Accommodations</h3>
    <ul>
      ${pois.hotel.map((p) => `<li><strong>${p.name}</strong> - ${p.address}</li>`).join("")}
    </ul>`;
    }

    html += `</div>`;
  }

  // Sources
  html += `<div class="section sources">
    <h2>📚 Sources</h2>
    <ul>
      <li>BC Wildfire Service - <a href="https://wildfiresituation.nrs.gov.bc.ca/">wildfiresituation.nrs.gov.bc.ca</a></li>
      <li>Environment Canada Weather - <a href="https://weather.gc.ca/">weather.gc.ca</a></li>
      <li>Indigenous Services Canada - <a href="https://geo.aadnc-aandc.gc.ca/">First Nations Location Data</a></li>
      <li>BC Address Geocoder - <a href="https://geocoder.api.gov.bc.ca/">geocoder.api.gov.bc.ca</a></li>
    </ul>
    <p><em>This briefing was automatically generated. Always verify critical information with official sources.</em></p>
  </div>
</body>
</html>`;

  return html;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { community, fireNumber } = body;

    if (!community) {
      return NextResponse.json({ error: "community is required" }, { status: 400 });
    }

    // Step 1: Geocode community
    const location = await geocodeCommunity(community);

    // Step 2: Make parallel API calls
    const [firesData, weatherData, firstNationsData, fireDeptData, hospitalData, rcmpData, groceryData, hotelData] =
      await Promise.all([
        location ? fetchNearbyFires(location.lat, location.lng) : Promise.resolve(null),
        fetchWeather(community),
        location ? fetchFirstNations(location.lat, location.lng) : Promise.resolve(null),
        fetchPOI("fire department", community),
        fetchPOI("hospital", community),
        fetchPOI("rcmp", community),
        fetchPOI("grocery store", community),
        fetchPOI("hotel", community),
      ]);

    // Step 3: Find specific fire if fireNumber provided
    let specificFire = null;
    if (fireNumber && firesData?.fires) {
      specificFire = firesData.fires.find(
        (f: { fireNumber: string }) => f.fireNumber.toLowerCase() === fireNumber.toLowerCase()
      );
    }

    // Step 4: Assemble briefing data
    const briefingData: BriefingData = {
      community,
      fireNumber,
      generatedAt: new Date().toISOString(),
      location: location || undefined,
      fire: specificFire,
      nearbyFires: firesData?.fires?.filter(
        (f: { fireNumber: string }) => f.fireNumber !== fireNumber
      ),
      weather: weatherData,
      firstNations: firstNationsData?.nations,
      pois: {
        fireDepartment: fireDeptData?.results,
        hospital: hospitalData?.results,
        rcmp: rcmpData?.results,
        groceryStore: groceryData?.results,
        hotel: hotelData?.results,
      },
      regionalContact: fireDeptData?.regionalContact,
    };

    // Step 5: Generate HTML
    const html = generateBriefingHTML(briefingData);

    return NextResponse.json({
      briefing: briefingData,
      html,
    });
  } catch (error) {
    console.error("Error generating briefing:", error);
    return NextResponse.json({ error: "Failed to generate briefing" }, { status: 500 });
  }
}
