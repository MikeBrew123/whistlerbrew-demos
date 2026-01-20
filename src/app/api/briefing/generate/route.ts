import { NextRequest, NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

type BriefingData = {
  community: string;
  fireNumber?: string;
  generatedAt: string;
  location?: { lat: number; lng: number };
  travelInfo?: {
    origin: string;
    destination: string;
    distance: string;
    duration: string;
    adjustedDuration?: string;
    ferryNote?: string;
    needsOvernight: boolean;
    overnightLocation?: string;
  };
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
  waterSources?: Array<{
    name: string;
    type: string;
    distanceKm: number;
    accessNotes?: string;
  }>;
  majorEmployers?: Array<{
    name: string;
    type: string;
    distanceKm: number;
    employeeEstimate?: string;
    notes?: string;
  }>;
  communityOps?: {
    dataAvailable: boolean;
    eocContacts?: Array<{ organization: string; email?: string; phone?: string; notes?: string }>;
    rawsStation?: { id: string; name: string; ffmc?: number; isi?: number; fwi?: number; notes?: string };
    fuelAndMechanical?: Array<{ name: string; type: string; is24h: boolean; address?: string; phone?: string }>;
    stagingAreas?: Array<{ name: string; type: string; address?: string; capacity?: string; notes?: string }>;
    accessConstraints?: string[];
    infrastructure?: { power: string; telecom: string; notes?: string };
    heavyEquipmentContractors?: Array<{ name: string; services: string; phone?: string; location?: string }>;
    essReceptionCentre?: { name: string; address: string; phone?: string; capacity?: string };
    weatherAndTopo?: { prevailingWinds: string; topoNotes: string; hazardTreeRisk?: string; beetleKill?: string };
    airSupport?: { nearestTankerBase?: string; nearestRappelBase?: string; localHelipads?: string[]; notes?: string };
    hospitalTraumaLevel?: string;
  };
  roadEvents?: Array<{
    eventType: string;
    severity: string;
    headline: string;
    roadName: string;
    direction?: string;
  }>;
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

async function fetchWaterSources(lat: number, lng: number, radiusKm = 50) {
  try {
    const res = await fetch(`${BASE_URL}/api/water-sources/nearby`, {
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

async function fetchEmployers(lat: number, lng: number, radiusKm = 50) {
  try {
    const res = await fetch(`${BASE_URL}/api/employers/nearby`, {
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

async function fetchCommunityOps(community: string) {
  try {
    const res = await fetch(`${BASE_URL}/api/community-ops`, {
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

async function fetchRoadEventsForLocation(lat: number, lng: number, radiusKm = 75) {
  try {
    const res = await fetch(`${BASE_URL}/api/road-events`, {
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

async function fetchRoadEventsForRoute(originLat: number, originLng: number, destLat: number, destLng: number) {
  try {
    const res = await fetch(`${BASE_URL}/api/road-events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ originLat, originLng, destLat, destLng }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchRouteInfo(origin: string, originLat: number, originLng: number, destination: string, destLat: number, destLng: number) {
  try {
    const res = await fetch(`${BASE_URL}/api/route-calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origin, originLat, originLng, destination, destLat, destLng }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function generateBriefingHTML(data: BriefingData): string {
  const { community, fireNumber, generatedAt, fire, nearbyFires, weather, firstNations, pois, regionalContact, waterSources, majorEmployers, communityOps, roadEvents, travelInfo } = data;

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

  // Inline styles for embedded rendering (no external CSS needed)
  const styles = {
    header: "background:#1a1a1a;color:white;padding:20px;border-radius:8px;margin-bottom:20px",
    headerH1: "margin:0 0 10px 0;color:#00a8ff;font-size:24px",
    subtitle: "color:#b0b0b0;font-size:14px",
    section: "background:white;padding:20px;border-radius:8px;margin-bottom:20px;box-shadow:0 1px 3px rgba(0,0,0,0.1)",
    sectionH2: "margin:0 0 15px 0;padding-bottom:10px;border-bottom:2px solid #00a8ff;color:#333;font-size:18px",
    sectionH3: "margin:15px 0 10px 0;color:#555;font-size:16px",
    warning: "background:#fff3cd;border-left:4px solid #ffc107;padding:10px 15px;margin-bottom:15px",
    fireOfNote: "background:#f8d7da;border-left:4px solid #dc3545;padding:10px 15px;margin-bottom:15px",
    table: "width:100%;border-collapse:collapse",
    th: "text-align:left;padding:8px 12px;border-bottom:1px solid #eee;background:#f8f9fa;font-weight:600;color:#333",
    td: "text-align:left;padding:8px 12px;border-bottom:1px solid #eee;color:#333",
    badgeFire: "display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:bold;background:#dc3545;color:white",
    sources: "font-size:12px;color:#666",
    pronunciation: "font-style:italic;color:#666;font-size:13px",
    link: "color:#00a8ff",
  };

  let html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:800px;margin:0 auto;color:#333">
  <div style="${styles.header}">
    <h1 style="${styles.headerH1}">SPS Dispatch Briefing</h1>
    <div style="${styles.subtitle}">
      <strong>Community:</strong> ${community}<br>
      ${fireNumber ? `<strong>Fire Number:</strong> ${fireNumber}<br>` : ""}
      <strong>Generated:</strong> ${formatDate(generatedAt)}
    </div>
  </div>
`;

  // Travel Information Section (if origin provided)
  if (travelInfo) {
    html += `<div style="${styles.section}">
    <h2 style="${styles.sectionH2}">🚗 Travel Information</h2>
    <table style="${styles.table}">
      <tr><th style="${styles.th}">From</th><td style="${styles.td}">${travelInfo.origin}</td></tr>
      <tr><th style="${styles.th}">To</th><td style="${styles.td}">${travelInfo.destination}</td></tr>
      <tr><th style="${styles.th}">Distance</th><td style="${styles.td}">${travelInfo.distance}</td></tr>
      <tr><th style="${styles.th}">Drive Time</th><td style="${styles.td}">${travelInfo.duration}</td></tr>
      ${travelInfo.adjustedDuration ? `<tr><th style="${styles.th}">Adjusted Time</th><td style="${styles.td}">${travelInfo.adjustedDuration}${travelInfo.ferryNote ? `<br><small style="color:#666">⛴️ ${travelInfo.ferryNote}</small>` : ""}</td></tr>` : ""}
      ${travelInfo.needsOvernight ? `<tr><th style="${styles.th}">Overnight Stop</th><td style="${styles.td}"><span style="background:#ffc107;color:#333;padding:2px 8px;border-radius:4px;font-weight:bold">Recommended</span>${travelInfo.overnightLocation ? `<br><small>Near: ${travelInfo.overnightLocation}</small>` : ""}</td></tr>` : ""}
    </table>
    <p style="font-size:12px;color:#666;margin-top:10px"><em>Road conditions below are for the travel route from ${travelInfo.origin}</em></p>
  </div>`;
  }

  // Fire Information Section
  if (fire || (nearbyFires && nearbyFires.length > 0)) {
    html += `<div style="${styles.section}">
    <h2 style="${styles.sectionH2}">🔥 BC Wildfire Service Information</h2>`;

    if (fire) {
      html += `
    ${fire.isFireOfNote ? `<div style="${styles.fireOfNote}"><strong style="color:#dc3545">⚠️ FIRE OF NOTE</strong> - This fire is being closely monitored by BC Wildfire Service</div>` : ""}
    <table style="${styles.table}">
      <tr><th style="${styles.th}">Fire Number</th><td style="${styles.td}">${fire.fireNumber}</td></tr>
      <tr><th style="${styles.th}">Name</th><td style="${styles.td}">${fire.name}</td></tr>
      <tr><th style="${styles.th}">Status</th><td style="${styles.td}">${fire.status}</td></tr>
      <tr><th style="${styles.th}">Size</th><td style="${styles.td}">${fire.size.toLocaleString()} hectares</td></tr>
      <tr><th style="${styles.th}">Cause</th><td style="${styles.td}">${fire.cause}</td></tr>
      <tr><th style="${styles.th}">Fire Centre</th><td style="${styles.td}">${fire.fireCentre}</td></tr>
      <tr><th style="${styles.th}">More Info</th><td style="${styles.td}"><a href="${fire.url}" target="_blank" style="${styles.link}">BC Wildfire Dashboard</a></td></tr>
    </table>`;
    }

    if (nearbyFires && nearbyFires.length > 0) {
      html += `
    <h3 style="${styles.sectionH3}">Other Fires Within 100km</h3>
    <table style="${styles.table}">
      <tr><th style="${styles.th}">Fire #</th><th style="${styles.th}">Name</th><th style="${styles.th}">Status</th><th style="${styles.th}">Size (ha)</th><th style="${styles.th}">Distance</th></tr>
      ${nearbyFires
        .slice(0, 5)
        .map(
          (f) => `<tr>
        <td style="${styles.td}">${f.fireNumber}${f.isFireOfNote ? ` <span style="${styles.badgeFire}">FON</span>` : ""}</td>
        <td style="${styles.td}">${f.name}</td>
        <td style="${styles.td}">${f.status}</td>
        <td style="${styles.td}">${f.size.toLocaleString()}</td>
        <td style="${styles.td}">${f.distanceKm} km</td>
      </tr>`
        )
        .join("")}
    </table>`;
    }

    html += `</div>`;
  }

  // Road Events Section (DriveBC)
  if (roadEvents && roadEvents.length > 0) {
    html += `<div style="${styles.section}">
    <h2 style="${styles.sectionH2}">🚗 Road Conditions (DriveBC)</h2>
    <table style="${styles.table}">
      <tr><th style="${styles.th}">Severity</th><th style="${styles.th}">Road</th><th style="${styles.th}">Event</th><th style="${styles.th}">Details</th></tr>
      ${roadEvents
        .slice(0, 10)
        .map(
          (e) => `<tr>
        <td style="${styles.td}"><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:bold;background:${e.severity === "Major" ? "#dc3545" : e.severity === "Moderate" ? "#ffc107" : "#28a745"};color:${e.severity === "Moderate" ? "#333" : "white"}">${e.severity}</span></td>
        <td style="${styles.td}"><strong>${e.roadName}</strong>${e.direction ? ` (${e.direction})` : ""}</td>
        <td style="${styles.td}">${e.eventType}</td>
        <td style="${styles.td}">${e.headline}</td>
      </tr>`
        )
        .join("")}
    </table>
    <p style="font-size:12px;color:#666;margin-top:10px"><em>Source: <a href="https://drivebc.ca" target="_blank" style="${styles.link}">DriveBC</a> - Check for latest updates before travel</em></p>
  </div>`;
  }

  // Community Operations Section
  if (communityOps?.dataAvailable) {
    // EOC / ICS Contacts
    if (communityOps.eocContacts && communityOps.eocContacts.length > 0) {
      html += `<div style="${styles.section}">
      <h2 style="${styles.sectionH2}">📋 EOC / ICS Contacts</h2>
      <table style="${styles.table}">
        <tr><th style="${styles.th}">Organization</th><th style="${styles.th}">Phone</th><th style="${styles.th}">Email</th><th style="${styles.th}">Notes</th></tr>
        ${communityOps.eocContacts.map((c) => `<tr>
          <td style="${styles.td}"><strong>${c.organization}</strong></td>
          <td style="${styles.td}">${c.phone || "—"}</td>
          <td style="${styles.td}">${c.email ? `<a href="mailto:${c.email}" style="${styles.link}">${c.email}</a>` : "—"}</td>
          <td style="${styles.td}">${c.notes || "—"}</td>
        </tr>`).join("")}
      </table>
    </div>`;
    }

    // RAWS Station & Fire Weather
    if (communityOps.rawsStation) {
      html += `<div style="${styles.section}">
      <h2 style="${styles.sectionH2}">🌡️ Fire Weather Station</h2>
      <table style="${styles.table}">
        <tr><th style="${styles.th}">Station ID</th><td style="${styles.td}">${communityOps.rawsStation.id}</td></tr>
        <tr><th style="${styles.th}">Name</th><td style="${styles.td}">${communityOps.rawsStation.name}</td></tr>
        ${communityOps.rawsStation.ffmc !== undefined ? `<tr><th style="${styles.th}">FFMC</th><td style="${styles.td}">${communityOps.rawsStation.ffmc}</td></tr>` : ""}
        ${communityOps.rawsStation.isi !== undefined ? `<tr><th style="${styles.th}">ISI</th><td style="${styles.td}">${communityOps.rawsStation.isi}</td></tr>` : ""}
        ${communityOps.rawsStation.fwi !== undefined ? `<tr><th style="${styles.th}">FWI</th><td style="${styles.td}">${communityOps.rawsStation.fwi}</td></tr>` : ""}
      </table>
      ${communityOps.rawsStation.notes ? `<p style="font-size:13px;color:#666;margin-top:10px"><em>${communityOps.rawsStation.notes}</em></p>` : ""}
    </div>`;
    }

    // Staging Areas & Helipads
    if (communityOps.stagingAreas && communityOps.stagingAreas.length > 0) {
      html += `<div style="${styles.section}">
      <h2 style="${styles.sectionH2}">🚁 Staging Areas & Helipads</h2>
      <table style="${styles.table}">
        <tr><th style="${styles.th}">Name</th><th style="${styles.th}">Type</th><th style="${styles.th}">Capacity</th><th style="${styles.th}">Notes</th></tr>
        ${communityOps.stagingAreas.map((s) => `<tr>
          <td style="${styles.td}"><strong>${s.name}</strong>${s.address ? `<br><small>${s.address}</small>` : ""}</td>
          <td style="${styles.td}">${s.type === "both" ? "Staging + Helipad" : s.type === "helipad" ? "Helipad" : "Staging"}</td>
          <td style="${styles.td}">${s.capacity || "—"}</td>
          <td style="${styles.td}">${s.notes || "—"}</td>
        </tr>`).join("")}
      </table>
    </div>`;
    }

    // 24h Fuel & Mechanical
    if (communityOps.fuelAndMechanical && communityOps.fuelAndMechanical.length > 0) {
      html += `<div style="${styles.section}">
      <h2 style="${styles.sectionH2}">⛽ Fuel & Mechanical Services</h2>
      <table style="${styles.table}">
        <tr><th style="${styles.th}">Name</th><th style="${styles.th}">Type</th><th style="${styles.th}">24h?</th><th style="${styles.th}">Phone</th></tr>
        ${communityOps.fuelAndMechanical.map((f) => `<tr>
          <td style="${styles.td}"><strong>${f.name}</strong>${f.address ? `<br><small>${f.address}</small>` : ""}</td>
          <td style="${styles.td}">${f.type === "both" ? "Fuel + Mechanical" : f.type === "fuel" ? "Fuel" : "Mechanical"}</td>
          <td style="${styles.td}">${f.is24h ? "✅ Yes" : "No"}</td>
          <td style="${styles.td}">${f.phone || "—"}</td>
        </tr>`).join("")}
      </table>
    </div>`;
    }

    // Access Constraints
    if (communityOps.accessConstraints && communityOps.accessConstraints.length > 0) {
      html += `<div style="${styles.section}">
      <h2 style="${styles.sectionH2}">⚠️ Access Constraints</h2>
      <ul style="margin:10px 0;padding-left:20px">
        ${communityOps.accessConstraints.map((c) => `<li style="margin:5px 0">${c}</li>`).join("")}
      </ul>
    </div>`;
    }

    // Weather & Topo
    if (communityOps.weatherAndTopo) {
      html += `<div style="${styles.section}">
      <h2 style="${styles.sectionH2}">🏔️ Terrain & Weather Patterns</h2>
      <table style="${styles.table}">
        <tr><th style="${styles.th}">Prevailing Winds</th><td style="${styles.td}">${communityOps.weatherAndTopo.prevailingWinds}</td></tr>
        <tr><th style="${styles.th}">Topo Notes</th><td style="${styles.td}">${communityOps.weatherAndTopo.topoNotes}</td></tr>
        ${communityOps.weatherAndTopo.hazardTreeRisk ? `<tr><th style="${styles.th}">Hazard Tree Risk</th><td style="${styles.td}">${communityOps.weatherAndTopo.hazardTreeRisk}</td></tr>` : ""}
        ${communityOps.weatherAndTopo.beetleKill ? `<tr><th style="${styles.th}">Beetle Kill</th><td style="${styles.td}">${communityOps.weatherAndTopo.beetleKill}</td></tr>` : ""}
      </table>
    </div>`;
    }

    // Infrastructure
    if (communityOps.infrastructure) {
      html += `<div style="${styles.section}">
      <h2 style="${styles.sectionH2}">⚡ Infrastructure</h2>
      <table style="${styles.table}">
        <tr><th style="${styles.th}">Power</th><td style="${styles.td}">${communityOps.infrastructure.power}</td></tr>
        <tr><th style="${styles.th}">Telecom</th><td style="${styles.td}">${communityOps.infrastructure.telecom}</td></tr>
        ${communityOps.infrastructure.notes ? `<tr><th style="${styles.th}">Notes</th><td style="${styles.td}">${communityOps.infrastructure.notes}</td></tr>` : ""}
      </table>
    </div>`;
    }

    // Heavy Equipment Contractors
    if (communityOps.heavyEquipmentContractors && communityOps.heavyEquipmentContractors.length > 0) {
      html += `<div style="${styles.section}">
      <h2 style="${styles.sectionH2}">🚜 Heavy Equipment Contractors</h2>
      <table style="${styles.table}">
        <tr><th style="${styles.th}">Name</th><th style="${styles.th}">Services</th><th style="${styles.th}">Phone</th></tr>
        ${communityOps.heavyEquipmentContractors.map((c) => `<tr>
          <td style="${styles.td}"><strong>${c.name}</strong>${c.location ? `<br><small>${c.location}</small>` : ""}</td>
          <td style="${styles.td}">${c.services}</td>
          <td style="${styles.td}">${c.phone || "—"}</td>
        </tr>`).join("")}
      </table>
    </div>`;
    }

    // ESS Reception Centre
    if (communityOps.essReceptionCentre) {
      html += `<div style="${styles.section}">
      <h2 style="${styles.sectionH2}">🏠 ESS Reception Centre</h2>
      <table style="${styles.table}">
        <tr><th style="${styles.th}">Name</th><td style="${styles.td}">${communityOps.essReceptionCentre.name}</td></tr>
        <tr><th style="${styles.th}">Address</th><td style="${styles.td}">${communityOps.essReceptionCentre.address}</td></tr>
        ${communityOps.essReceptionCentre.phone ? `<tr><th style="${styles.th}">Phone</th><td style="${styles.td}">${communityOps.essReceptionCentre.phone}</td></tr>` : ""}
        ${communityOps.essReceptionCentre.capacity ? `<tr><th style="${styles.th}">Capacity</th><td style="${styles.td}">${communityOps.essReceptionCentre.capacity}</td></tr>` : ""}
      </table>
    </div>`;
    }

    // Air Support
    if (communityOps.airSupport) {
      html += `<div style="${styles.section}">
      <h2 style="${styles.sectionH2}">✈️ Air Support</h2>
      <table style="${styles.table}">
        ${communityOps.airSupport.nearestTankerBase ? `<tr><th style="${styles.th}">Nearest Tanker Base</th><td style="${styles.td}">${communityOps.airSupport.nearestTankerBase}</td></tr>` : ""}
        ${communityOps.airSupport.nearestRappelBase ? `<tr><th style="${styles.th}">Nearest Rappel Base</th><td style="${styles.td}">${communityOps.airSupport.nearestRappelBase}</td></tr>` : ""}
        ${communityOps.airSupport.localHelipads && communityOps.airSupport.localHelipads.length > 0 ? `<tr><th style="${styles.th}">Local Helipads</th><td style="${styles.td}">${communityOps.airSupport.localHelipads.join(", ")}</td></tr>` : ""}
        ${communityOps.airSupport.notes ? `<tr><th style="${styles.th}">Notes</th><td style="${styles.td}">${communityOps.airSupport.notes}</td></tr>` : ""}
      </table>
    </div>`;
    }

    // Hospital / Trauma Level
    if (communityOps.hospitalTraumaLevel) {
      html += `<div style="${styles.section}">
      <h2 style="${styles.sectionH2}">🏥 Hospital / Trauma Level</h2>
      <p style="padding:10px;background:#f8f9fa;border-radius:4px"><strong>${communityOps.hospitalTraumaLevel}</strong></p>
    </div>`;
    }
  }

  // First Nations Section
  if (firstNations && firstNations.length > 0) {
    html += `<div style="${styles.section}">
    <h2 style="${styles.sectionH2}">🏛️ Local First Nations</h2>
    <p style="font-size:13px;color:#666;margin-bottom:15px">
      <em>Pronunciation guides are approximate. Please verify with community members.</em>
    </p>
    <table style="${styles.table}">
      <tr><th style="${styles.th}">Nation</th><th style="${styles.th}">Distance</th><th style="${styles.th}">Pronunciation Guide</th></tr>
      ${firstNations
        .slice(0, 5)
        .map(
          (fn) => `<tr>
        <td style="${styles.td}"><strong>${fn.name}</strong></td>
        <td style="${styles.td}">${fn.distanceKm} km</td>
        <td style="${styles.td};${styles.pronunciation}">${fn.pronunciation || "—"}</td>
      </tr>`
        )
        .join("")}
    </table>
  </div>`;
  }

  // Weather Section
  if (weather) {
    html += `<div style="${styles.section}">
    <h2 style="${styles.sectionH2}">🌤️ Weather Forecast</h2>`;

    if (weather.warnings && weather.warnings.length > 0 && !weather.warnings[0].includes("No watches")) {
      html += weather.warnings.map((w: string) => `<div style="${styles.warning}">⚠️ ${w}</div>`).join("");
    }

    if (weather.current && weather.current.temperature !== undefined) {
      html += `
    <h3 style="${styles.sectionH3}">Current Conditions (${weather.location})</h3>
    <table style="${styles.table}">
      <tr><th style="${styles.th}">Temperature</th><td style="${styles.td}">${weather.current.temperature}°C</td></tr>
      ${weather.current.condition ? `<tr><th style="${styles.th}">Condition</th><td style="${styles.td}">${weather.current.condition}</td></tr>` : ""}
      ${weather.current.humidity ? `<tr><th style="${styles.th}">Humidity</th><td style="${styles.td}">${weather.current.humidity}%</td></tr>` : ""}
      ${weather.current.wind ? `<tr><th style="${styles.th}">Wind</th><td style="${styles.td}">${weather.current.wind}</td></tr>` : ""}
    </table>`;
    }

    if (weather.forecast && weather.forecast.length > 0) {
      html += `
    <h3 style="${styles.sectionH3}">3-Day Forecast</h3>
    <table style="${styles.table}">
      <tr><th style="${styles.th}">Period</th><th style="${styles.th}">Forecast</th><th style="${styles.th}">Temp</th></tr>
      ${weather.forecast
        .slice(0, 6)
        .map(
          (f) => `<tr>
        <td style="${styles.td}"><strong>${f.day}</strong></td>
        <td style="${styles.td}">${f.summary}</td>
        <td style="${styles.td}">${f.high !== undefined ? `High ${f.high}°C` : f.low !== undefined ? `Low ${f.low}°C` : "—"}</td>
      </tr>`
        )
        .join("")}
    </table>`;
    }

    html += `</div>`;
  }

  // Municipal Contacts Section
  if (pois) {
    html += `<div style="${styles.section}">
    <h2 style="${styles.sectionH2}">📞 Emergency & Municipal Contacts</h2>`;

    if (pois.fireDepartment && pois.fireDepartment.length > 0) {
      html += `
    <h3 style="${styles.sectionH3}">Fire Department</h3>
    <table style="${styles.table}">
      ${pois.fireDepartment
        .map(
          (p) => `<tr>
        <td style="${styles.td}"><strong>${p.name}</strong><br><small>${p.address}</small></td>
        <td style="${styles.td}">${p.phone || "—"}</td>
      </tr>`
        )
        .join("")}
    </table>`;
    }

    if (pois.rcmp && pois.rcmp.length > 0) {
      html += `
    <h3 style="${styles.sectionH3}">RCMP</h3>
    <table style="${styles.table}">
      ${pois.rcmp
        .map(
          (p) => `<tr>
        <td style="${styles.td}"><strong>${p.name}</strong><br><small>${p.address}</small></td>
        <td style="${styles.td}">${p.phone || "—"}</td>
      </tr>`
        )
        .join("")}
    </table>`;
    }

    if (pois.hospital && pois.hospital.length > 0) {
      html += `
    <h3 style="${styles.sectionH3}">Hospital / Health Centre</h3>
    <table style="${styles.table}">
      ${pois.hospital
        .map(
          (p) => `<tr>
        <td style="${styles.td}"><strong>${p.name}</strong><br><small>${p.address}</small></td>
        <td style="${styles.td}">${p.phone || "—"}</td>
      </tr>`
        )
        .join("")}
    </table>`;
    }

    html += `</div>`;
  }

  // Regional Contact
  if (regionalContact) {
    html += `<div style="${styles.section}">
    <h2 style="${styles.sectionH2}">🏢 Regional District</h2>
    <table style="${styles.table}">
      <tr><th style="${styles.th}">Name</th><td style="${styles.td}">${regionalContact.name}</td></tr>
      <tr><th style="${styles.th}">Phone</th><td style="${styles.td}">${regionalContact.phone}</td></tr>
      <tr><th style="${styles.th}">Website</th><td style="${styles.td}"><a href="${regionalContact.website}" target="_blank" style="${styles.link}">${regionalContact.website}</a></td></tr>
    </table>
  </div>`;
  }

  // Water Sources Section
  if (waterSources && waterSources.length > 0) {
    html += `<div style="${styles.section}">
    <h2 style="${styles.sectionH2}">💧 Water Sources</h2>
    <p style="font-size:13px;color:#666;margin-bottom:15px">
      <em>Nearby water sources for firefighting operations. Verify access before deployment.</em>
    </p>
    <table style="${styles.table}">
      <tr><th style="${styles.th}">Name</th><th style="${styles.th}">Type</th><th style="${styles.th}">Distance</th><th style="${styles.th}">Access Notes</th></tr>
      ${waterSources
        .slice(0, 8)
        .map(
          (w) => `<tr>
        <td style="${styles.td}"><strong>${w.name}</strong></td>
        <td style="${styles.td}">${w.type}</td>
        <td style="${styles.td}">${w.distanceKm} km</td>
        <td style="${styles.td}">${w.accessNotes || "—"}</td>
      </tr>`
        )
        .join("")}
    </table>
  </div>`;
  }

  // Major Employers Section
  if (majorEmployers && majorEmployers.length > 0) {
    html += `<div style="${styles.section}">
    <h2 style="${styles.sectionH2}">🏢 Major Employers</h2>
    <p style="font-size:13px;color:#666;margin-bottom:15px">
      <em>Large employers in the area - relevant for evacuation planning and workforce considerations.</em>
    </p>
    <table style="${styles.table}">
      <tr><th style="${styles.th}">Employer</th><th style="${styles.th}">Type</th><th style="${styles.th}">Distance</th><th style="${styles.th}">Est. Employees</th></tr>
      ${majorEmployers
        .slice(0, 8)
        .map(
          (e) => `<tr>
        <td style="${styles.td}"><strong>${e.name}</strong>${e.notes ? `<br><small style="color:#666">${e.notes}</small>` : ""}</td>
        <td style="${styles.td}">${e.type}</td>
        <td style="${styles.td}">${e.distanceKm} km</td>
        <td style="${styles.td}">${e.employeeEstimate || "—"}</td>
      </tr>`
        )
        .join("")}
    </table>
  </div>`;
  }

  // Local Services
  if (pois && (pois.groceryStore || pois.hotel)) {
    html += `<div style="${styles.section}">
    <h2 style="${styles.sectionH2}">🛒 Local Services</h2>`;

    if (pois.groceryStore && pois.groceryStore.length > 0) {
      html += `
    <h3 style="${styles.sectionH3}">Grocery Stores</h3>
    <ul style="margin:10px 0;padding-left:20px">
      ${pois.groceryStore.map((p) => `<li style="margin:5px 0"><strong>${p.name}</strong> - ${p.address}</li>`).join("")}
    </ul>`;
    }

    if (pois.hotel && pois.hotel.length > 0) {
      html += `
    <h3 style="${styles.sectionH3}">Accommodations</h3>
    <ul style="margin:10px 0;padding-left:20px">
      ${pois.hotel.map((p) => `<li style="margin:5px 0"><strong>${p.name}</strong> - ${p.address}</li>`).join("")}
    </ul>`;
    }

    html += `</div>`;
  }

  // Sources
  html += `<div style="${styles.section};${styles.sources}">
    <h2 style="${styles.sectionH2}">📚 Sources</h2>
    <ul style="margin:5px 0;padding-left:20px">
      <li>BC Wildfire Service - <a href="https://wildfiresituation.nrs.gov.bc.ca/" style="${styles.link}">wildfiresituation.nrs.gov.bc.ca</a></li>
      <li>Environment Canada Weather - <a href="https://weather.gc.ca/" style="${styles.link}">weather.gc.ca</a></li>
      <li>Indigenous Services Canada - <a href="https://geo.aadnc-aandc.gc.ca/" style="${styles.link}">First Nations Location Data</a></li>
      <li>BC Address Geocoder - <a href="https://geocoder.api.gov.bc.ca/" style="${styles.link}">geocoder.api.gov.bc.ca</a></li>
    </ul>
    <p style="margin-top:15px;color:#666"><em>This briefing was automatically generated. Always verify critical information with official sources.</em></p>
  </div>
</div>`;

  return html;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { community, fireNumber, origin, originLat, originLng } = body;

    if (!community) {
      return NextResponse.json({ error: "community is required" }, { status: 400 });
    }

    // Step 1: Geocode community (destination)
    const location = await geocodeCommunity(community);

    // Step 1b: If origin provided, get route info and road events along route
    let routeData = null;
    let routeRoadEvents = null;
    const hasOrigin = origin && originLat && originLng && location;

    if (hasOrigin) {
      // Fetch route info and route-based road events in parallel
      const [routeResult, routeEvents] = await Promise.all([
        fetchRouteInfo(origin, originLat, originLng, community, location.lat, location.lng),
        fetchRoadEventsForRoute(originLat, originLng, location.lat, location.lng),
      ]);
      routeData = routeResult?.route || null;
      routeRoadEvents = routeEvents;
    }

    /// Step 2: Make parallel API calls
    const [firesData, weatherData, firstNationsData, fireDeptData, hospitalData, rcmpData, groceryData, hotelData, waterData, employersData, communityOpsData, locationRoadEvents] =
      await Promise.all([
        location ? fetchNearbyFires(location.lat, location.lng) : Promise.resolve(null),
        fetchWeather(community),
        location ? fetchFirstNations(location.lat, location.lng) : Promise.resolve(null),
        fetchPOI("fire department", community),
        fetchPOI("hospital", community),
        fetchPOI("rcmp", community),
        fetchPOI("grocery store", community),
        fetchPOI("hotel", community),
        location ? fetchWaterSources(location.lat, location.lng) : Promise.resolve(null),
        location ? fetchEmployers(location.lat, location.lng) : Promise.resolve(null),
        fetchCommunityOps(community),
        // Only fetch location-based road events if no route was provided
        !hasOrigin && location ? fetchRoadEventsForLocation(location.lat, location.lng) : Promise.resolve(null),
      ]);

    // Step 3: Find specific fire if fireNumber provided
    let specificFire = null;
    if (fireNumber && firesData?.fires) {
      specificFire = firesData.fires.find(
        (f: { fireNumber: string }) => f.fireNumber.toLowerCase() === fireNumber.toLowerCase()
      );
    }

    // Use route-based road events if available, otherwise location-based
    const roadEventsData = routeRoadEvents || locationRoadEvents;

    // Build travel info if route data available
    let travelInfo: BriefingData["travelInfo"] = undefined;
    if (routeData && hasOrigin) {
      travelInfo = {
        origin: origin,
        destination: community,
        distance: routeData.distance?.text || "Unknown",
        duration: routeData.duration?.text || "Unknown",
        adjustedDuration: routeData.adjustedDuration?.text,
        ferryNote: routeData.adjustedDuration?.ferryNote,
        needsOvernight: routeData.needsOvernight || false,
        overnightLocation: routeData.overnightPoint?.locationName,
      };
    }

    // Step 4: Assemble briefing data
    const briefingData: BriefingData = {
      community,
      fireNumber,
      generatedAt: new Date().toISOString(),
      location: location || undefined,
      travelInfo,
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
      waterSources: waterData?.sources,
      majorEmployers: employersData?.employers,
      communityOps: communityOpsData?.dataAvailable ? communityOpsData : undefined,
      roadEvents: roadEventsData?.events,
    };

    // Step 5: Generate HTML
    const html = generateBriefingHTML(briefingData);

    // Step 6: Build KML points for map export
    const kmlPoints: Array<{
      name: string;
      lat: number;
      lng: number;
      category: string;
      description?: string;
      isFireOfNote?: boolean;
    }> = [];

    // Add fires to KML
    if (specificFire && location) {
      kmlPoints.push({
        name: `${specificFire.fireNumber} - ${specificFire.name}`,
        lat: specificFire.lat || location.lat,
        lng: specificFire.lng || location.lng,
        category: "fire",
        description: `Status: ${specificFire.status}, Size: ${specificFire.size} ha`,
        isFireOfNote: specificFire.isFireOfNote,
      });
    }

    if (firesData?.fires) {
      for (const fire of firesData.fires.slice(0, 10)) {
        if (fire.fireNumber !== fireNumber && fire.lat && fire.lng) {
          kmlPoints.push({
            name: `${fire.fireNumber} - ${fire.name}`,
            lat: fire.lat,
            lng: fire.lng,
            category: "fire",
            description: `Status: ${fire.status}, Size: ${fire.size} ha`,
            isFireOfNote: fire.isFireOfNote,
          });
        }
      }
    }

    // Add First Nations to KML
    if (firstNationsData?.nations) {
      for (const fn of firstNationsData.nations.slice(0, 5)) {
        if (fn.lat && fn.lng) {
          kmlPoints.push({
            name: fn.name,
            lat: fn.lat,
            lng: fn.lng,
            category: "firstNation",
            description: fn.pronunciation ? `Pronunciation: ${fn.pronunciation}` : undefined,
          });
        }
      }
    }

    // Add POIs to KML
    const addPOIsToKML = (pois: Array<{ name: string; address: string; lat?: number; lng?: number }> | undefined, category: string) => {
      if (!pois) return;
      for (const poi of pois.slice(0, 3)) {
        if (poi.lat && poi.lng) {
          kmlPoints.push({
            name: poi.name,
            lat: poi.lat,
            lng: poi.lng,
            category,
            description: poi.address,
          });
        }
      }
    };

    addPOIsToKML(fireDeptData?.results, "fireDept");
    addPOIsToKML(hospitalData?.results, "hospital");
    addPOIsToKML(rcmpData?.results, "rcmp");
    addPOIsToKML(groceryData?.results, "grocery");
    addPOIsToKML(hotelData?.results, "hotel");

    // Add water sources to KML (boat launches, beaches, lakes)
    if (waterData?.sources) {
      for (const source of waterData.sources.slice(0, 10)) {
        if (source.lat && source.lng) {
          kmlPoints.push({
            name: source.name,
            lat: source.lat,
            lng: source.lng,
            category: "waterSource",
            description: `${source.type}${source.accessNotes ? ` - ${source.accessNotes}` : ""}`,
          });
        }
      }
    }

    return NextResponse.json({
      briefing: html,
      data: briefingData,
      kmlPoints,
    });
  } catch (error) {
    console.error("Error generating briefing:", error);
    return NextResponse.json({ error: "Failed to generate briefing" }, { status: 500 });
  }
}
