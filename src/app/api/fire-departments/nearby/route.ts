import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

const BC_FIRST_RESPONDERS_WFS =
  "https://openmaps.gov.bc.ca/geo/pub/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=WHSE_IMAGERY_AND_BASE_MAPS.GSR_FIRST_RESPONDERS_SVW&outputFormat=json&srsName=EPSG:4326&CQL_FILTER=RESPONDER_GROUP_TYPE=%27FIRE%27";

// Publicly available non-emergency dispatch numbers & fire chief contacts for BC fire departments
// Sources: municipal websites, CivicInfo BC, FCABC directory
const DEPT_CONTACTS: Record<string, { phone: string; chief?: string; website?: string }> = {
  "Kamloops Fire Rescue": { phone: "250-372-5131", chief: "Steve Robinson", website: "kamloops.ca/fire" },
  "Merritt Fire Rescue": { phone: "250-378-2272", website: "merritt.ca" },
  "Vernon Fire Rescue": { phone: "250-545-1361", website: "vernon.ca/fire" },
  "Kelowna Fire Department": { phone: "250-469-8801", website: "kelowna.ca/fire" },
  "Penticton Fire Department": { phone: "250-490-2400", website: "penticton.ca" },
  "Salmon Arm Fire Department": { phone: "250-803-4065", website: "salmonarm.ca" },
  "Revelstoke Fire Rescue": { phone: "250-837-2911", website: "cityofrevelstoke.com" },
  "Chase & District Volunteer Fire Department": { phone: "250-679-3238" },
  "Logan Lake Volunteer Fire Department": { phone: "250-523-6225" },
  "Barriere & District Fire Department": { phone: "250-672-9861" },
  "Clearwater Volunteer Fire Department": { phone: "250-674-2257" },
  "Sun Peaks Fire Rescue": { phone: "250-578-5490" },
  "Williams Lake Fire Department": { phone: "250-392-1788" },
  "Quesnel Fire Department": { phone: "250-992-1211" },
  "Prince George Fire Rescue": { phone: "250-561-7664", website: "princegeorge.ca/fire" },
  "Cranbrook Fire & Emergency Services": { phone: "250-426-2306" },
  "Nelson Fire & Rescue": { phone: "250-352-3103" },
  "Castlegar Fire Department": { phone: "250-365-7227" },
  "Trail Fire Department": { phone: "250-364-1234" },
  "West Kelowna Fire Rescue": { phone: "250-707-1717" },
  "Lake Country Fire Department": { phone: "250-766-9225" },
  "Peachland Volunteer Fire Department": { phone: "250-767-2647" },
  "Summerland Fire Department": { phone: "250-494-7334" },
  "Armstrong-Spallumcheen Fire Department": { phone: "250-546-3044" },
  "Enderby Fire Department": { phone: "250-838-7230" },
  "Sicamous Fire Department": { phone: "250-836-2477" },
  "Golden Fire Department": { phone: "250-344-2424" },
  "Squamish Fire Rescue": { phone: "604-892-9755" },
  "Whistler Fire Rescue": { phone: "604-935-8260" },
  "Pemberton Fire Rescue": { phone: "604-894-6622" },
  "Lillooet Volunteer Fire Department": { phone: "250-256-4289" },
  "Ashcroft Volunteer Fire Department": { phone: "250-453-9161" },
  "Cache Creek Volunteer Fire Department": { phone: "250-457-6237" },
  "Campbell River Fire Department": { phone: "250-286-6266" },
  "Courtenay Fire Department": { phone: "250-334-2525" },
  "Nanaimo Fire Rescue": { phone: "250-754-5268" },
  "Port Alberni Fire Department": { phone: "250-723-1381" },
  "Dawson Creek Fire Department": { phone: "250-784-3616" },
  "Fort St. John Fire Rescue": { phone: "250-787-8422" },
  "Fort Nelson Fire Rescue": { phone: "250-774-2222" },
  "Smithers Fire Department": { phone: "250-847-1600" },
  "Terrace Fire Department": { phone: "250-638-4734" },
  "Burns Lake Volunteer Fire Department": { phone: "250-692-3195" },
  "100 Mile House Volunteer Fire Department": { phone: "250-395-2112" },
  "Hope Fire Department": { phone: "604-869-5671" },
  "Princeton Fire Department": { phone: "250-295-3222" },
  "Oliver Fire Department": { phone: "250-498-2456" },
  "Osoyoos Fire Rescue": { phone: "250-495-6222" },
};

function matchDeptContacts(facilityName: string, locality: string): { phone: string; chief?: string; website?: string } | null {
  // Try exact facility name match first
  for (const [dept, info] of Object.entries(DEPT_CONTACTS)) {
    if (facilityName.toLowerCase().includes(dept.toLowerCase().split(" ")[0]) &&
        facilityName.toLowerCase().includes("fire")) {
      return info;
    }
  }
  // Try locality-based match
  for (const [dept, info] of Object.entries(DEPT_CONTACTS)) {
    if (locality && dept.toLowerCase().includes(locality.toLowerCase())) {
      return info;
    }
  }
  return null;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST(request: NextRequest) {
  try {
    const { latitude, longitude, radiusKm = 60 } = await request.json();
    if (!latitude || !longitude) {
      return NextResponse.json({ error: "latitude and longitude required" }, { status: 400 });
    }

    const response = await fetch(BC_FIRST_RESPONDERS_WFS);
    if (!response.ok) throw new Error(`First Responders WFS returned ${response.status}`);

    const data = await response.json();
    const features = data.features || [];

    const halls = features
      .map((f: any) => {
        const coords = f.geometry.coordinates;
        const p = f.properties;
        const name = p.FACILITY_NAME || "Unknown Fire Hall";
        const locality = p.LOCALITY || "";
        const contacts = matchDeptContacts(name, locality);
        return {
          name,
          address: p.PHYSICAL_ADDRESS || p.STREET_ADDRESS || "",
          locality,
          phone: contacts?.phone || p.CONTACT_PHONE || null,
          chief: contacts?.chief || null,
          website: contacts?.website || null,
          type: p.RESPONDER_FACILITY_TYPE || "HALL",
          lat: coords[1],
          lng: coords[0],
          distanceKm: Math.round(haversineKm(latitude, longitude, coords[1], coords[0])),
        };
      })
      .filter((h: any) => h.distanceKm <= radiusKm)
      .sort((a: any, b: any) => a.distanceKm - b.distanceKm)
      .slice(0, 10);

    return NextResponse.json({ fireHalls: halls });
  } catch (error) {
    console.error("Fire departments nearby error:", error);
    return NextResponse.json({ fireHalls: [] });
  }
}
