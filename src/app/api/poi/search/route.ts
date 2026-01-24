import { NextRequest, NextResponse } from "next/server";
export const runtime = "edge";


// Regional Districts in BC with their main contact info
const BC_REGIONAL_DISTRICTS: Record<string, { name: string; phone: string; website: string }> = {
  slrd: { name: "Squamish-Lillooet Regional District", phone: "604-894-6371", website: "https://www.slrd.bc.ca" },
  rdbn: { name: "Regional District of Bulkley-Nechako", phone: "250-692-3195", website: "https://www.rdbn.bc.ca" },
  rdco: { name: "Regional District of Central Okanagan", phone: "250-763-4918", website: "https://www.rdco.com" },
  tnrd: { name: "Thompson-Nicola Regional District", phone: "250-377-8673", website: "https://www.tnrd.ca" },
  csrd: { name: "Columbia Shuswap Regional District", phone: "250-832-8194", website: "https://www.csrd.bc.ca" },
  rdkb: { name: "Regional District of Kootenay Boundary", phone: "250-368-9148", website: "https://www.rdkb.com" },
  rdek: { name: "Regional District of East Kootenay", phone: "250-489-2791", website: "https://www.rdek.bc.ca" },
  rdck: { name: "Regional District of Central Kootenay", phone: "250-352-6665", website: "https://www.rdck.ca" },
  rdffg: { name: "Regional District of Fraser-Fort George", phone: "250-960-4400", website: "https://www.rdffg.bc.ca" },
  prrd: { name: "Peace River Regional District", phone: "250-784-3200", website: "https://www.prrd.bc.ca" },
  nrrd: { name: "North Coast Regional District", phone: "250-624-2002", website: "https://www.ncrdbc.com" },
  rdks: { name: "Regional District of Kitimat-Stikine", phone: "250-615-6100", website: "https://www.rdks.bc.ca" },
  crd: { name: "Capital Regional District", phone: "250-360-3000", website: "https://www.crd.bc.ca" },
  cvrd: { name: "Cowichan Valley Regional District", phone: "250-746-2500", website: "https://www.cvrd.ca" },
  rdn: { name: "Regional District of Nanaimo", phone: "250-390-4111", website: "https://www.rdn.bc.ca" },
  acrd: { name: "Alberni-Clayoquot Regional District", phone: "250-720-2700", website: "https://www.acrd.bc.ca" },
  strathcona: { name: "Strathcona Regional District", phone: "250-830-6700", website: "https://www.srd.ca" },
  mvrd: { name: "Metro Vancouver", phone: "604-432-6200", website: "https://www.metrovancouver.org" },
  fvrd: { name: "Fraser Valley Regional District", phone: "604-702-5000", website: "https://www.fvrd.ca" },
  scrd: { name: "Sunshine Coast Regional District", phone: "604-885-6800", website: "https://www.scrd.ca" },
  nord: { name: "Regional District of North Okanagan", phone: "250-550-3700", website: "https://www.rdno.ca" },
  rdos: { name: "Regional District of Okanagan-Similkameen", phone: "250-492-0237", website: "https://www.rdos.bc.ca" },
  crd_cariboo: { name: "Cariboo Regional District", phone: "250-392-3351", website: "https://www.cariboord.ca" },
};

// Map communities to their regional districts (partial list for common areas)
const COMMUNITY_TO_REGION: Record<string, string> = {
  pemberton: "slrd",
  whistler: "slrd",
  lillooet: "slrd",
  squamish: "scrd",
  "burns lake": "rdbn",
  "fort st james": "rdbn",
  vanderhoof: "rdbn",
  houston: "rdbn",
  kamloops: "tnrd",
  merritt: "tnrd",
  "salmon arm": "csrd",
  revelstoke: "csrd",
  golden: "csrd",
  nelson: "rdck",
  castlegar: "rdck",
  trail: "rdkb",
  cranbrook: "rdek",
  invermere: "rdek",
  "prince george": "rdffg",
  mackenzie: "rdffg",
  "fort nelson": "prrd",
  "fort st john": "prrd",
  "dawson creek": "prrd",
  terrace: "rdks",
  kitimat: "rdks",
  "prince rupert": "nrrd",
  kelowna: "rdco",
  "west kelowna": "rdco",
  vernon: "nord",
  penticton: "rdos",
  "williams lake": "crd_cariboo",
  quesnel: "crd_cariboo",
  "100 mile house": "crd_cariboo",
  victoria: "crd",
  duncan: "cvrd",
  nanaimo: "rdn",
  "port alberni": "acrd",
  "campbell river": "strathcona",
  vancouver: "mvrd",
  burnaby: "mvrd",
  richmond: "mvrd",
  surrey: "mvrd",
  chilliwack: "fvrd",
  abbotsford: "fvrd",
  hope: "fvrd",
  gibsons: "scrd",
  sechelt: "scrd",
};

// POI type variations for "try hard" searches
const POI_VARIATIONS: Record<string, string[]> = {
  "fire department": [
    "Fire Department",
    "Fire Rescue",
    "Fire Hall",
    "Volunteer Fire Department",
    "Fire Protection District",
    "Fire Services",
  ],
  hospital: [
    "Hospital",
    "Health Centre",
    "Medical Centre",
    "Health Unit",
    "Diagnostic & Treatment Centre",
  ],
  "rcmp": [
    "RCMP",
    "RCMP Detachment",
    "Police",
    "Police Station",
  ],
  "grocery store": [
    "Grocery Store",
    "Supermarket",
    "Food Market",
    "General Store",
    "IGA",
    "Save-On-Foods",
    "Safeway",
    "No Frills",
  ],
  hotel: [
    "Hotel",
    "Motel",
    "Inn",
    "Lodge",
    "Resort",
    "Accommodation",
  ],
};

// Nearby town mapping for fallback searches
const NEARBY_TOWNS: Record<string, string[]> = {
  "birkenhead lake estates": ["Pemberton", "D'Arcy", "Mount Currie"],
  "d'arcy": ["Pemberton", "Lillooet"],
  "mount currie": ["Pemberton", "Whistler"],
  bralorne: ["Pemberton", "Lillooet", "Gold Bridge"],
  "gold bridge": ["Lillooet", "Pemberton"],
  valemount: ["Jasper", "McBride", "Blue River"],
  mcbride: ["Valemount", "Prince George"],
  "blue river": ["Clearwater", "Valemount"],
  clearwater: ["Kamloops", "Blue River"],
  "100 mile house": ["Williams Lake", "Lac La Hache"],
  "lac la hache": ["100 Mile House", "Williams Lake"],
  "fort st james": ["Vanderhoof", "Prince George"],
  houston: ["Burns Lake", "Smithers"],
  granisle: ["Burns Lake", "Houston"],
  "fraser lake": ["Burns Lake", "Vanderhoof"],
  enderby: ["Salmon Arm", "Armstrong", "Vernon"],
  armstrong: ["Vernon", "Enderby"],
  lumby: ["Vernon", "Cherryville"],
  osoyoos: ["Oliver", "Penticton"],
  oliver: ["Osoyoos", "Penticton"],
  princeton: ["Merritt", "Keremeos"],
  keremeos: ["Princeton", "Penticton"],
  lytton: ["Lillooet", "Merritt", "Hope"],
  ashcroft: ["Cache Creek", "Kamloops"],
  "cache creek": ["Ashcroft", "Kamloops"],
  chetwynd: ["Dawson Creek", "Tumbler Ridge"],
  "tumbler ridge": ["Chetwynd", "Dawson Creek"],
  hudson: ["Hope", "Fort St John"],
  "pouce coupe": ["Dawson Creek"],
  stewart: ["Terrace", "Kitimat"],
  hazelton: ["Smithers", "Terrace"],
  "new hazelton": ["Smithers", "Terrace"],
};

type POIResult = {
  name: string;
  address: string;
  phone?: string;
  lat?: number;
  lng?: number;
  website?: string;
  confidence: "high" | "medium" | "low" | "fallback";
  source: string;
};

type POIResponse = {
  results: POIResult[];
  searchedCommunity: string;
  searchedType: string;
  fallbackUsed?: string;
  regionalContact?: {
    name: string;
    phone: string;
    website: string;
  };
};

async function searchPlaces(query: string, location?: { lat: number; lng: number }): Promise<POIResult[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return [];

  try {
    // Use Places API (New) - the legacy Text Search API requires separate enablement
    const requestBody: {
      textQuery: string;
      locationBias?: { circle: { center: { latitude: number; longitude: number }; radius: number } };
    } = {
      textQuery: `${query}, BC, Canada`,
    };

    if (location) {
      requestBody.locationBias = {
        circle: {
          center: { latitude: location.lat, longitude: location.lng },
          radius: 50000, // 50km
        },
      };
    }

    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.location",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) return [];

    const data = await response.json();
    if (!data.places || data.places.length === 0) return [];

    return data.places.slice(0, 3).map((place: {
      displayName: { text: string };
      formattedAddress: string;
      nationalPhoneNumber?: string;
      location: { latitude: number; longitude: number };
    }) => ({
      name: place.displayName.text,
      address: place.formattedAddress,
      phone: place.nationalPhoneNumber,
      lat: place.location.latitude,
      lng: place.location.longitude,
      confidence: "high" as const,
      source: "Google Places",
    }));
  } catch {
    return [];
  }
}

async function geocodeCommunity(community: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch("https://geocoder.api.gov.bc.ca/addresses.json?" +
      new URLSearchParams({
        addressString: `${community}, BC`,
        maxResults: "1",
        outputSRS: "4326",
      })
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.features || data.features.length === 0) return null;

    const [lng, lat] = data.features[0].geometry.coordinates;
    return { lat, lng };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, community, location } = body;

    if (!type || !community) {
      return NextResponse.json(
        { error: "type and community are required" },
        { status: 400 }
      );
    }

    const normalizedCommunity = community.toLowerCase().trim();
    const normalizedType = type.toLowerCase().trim();
    const variations = POI_VARIATIONS[normalizedType] || [type];

    let results: POIResult[] = [];
    let fallbackUsed: string | undefined;

    // Get location coordinates
    let coords = location;
    if (!coords) {
      coords = await geocodeCommunity(community);
    }

    // Step 1: Direct search with variations
    for (const variation of variations) {
      const query = `${community} ${variation}`;
      const found = await searchPlaces(query, coords);
      if (found.length > 0) {
        results = found;
        break;
      }
    }

    // Step 2: Try nearby towns if no results
    if (results.length === 0) {
      const nearbyTowns = NEARBY_TOWNS[normalizedCommunity] || [];
      for (const town of nearbyTowns) {
        for (const variation of variations.slice(0, 2)) { // Only try first 2 variations
          const query = `${town} ${variation}`;
          const found = await searchPlaces(query);
          if (found.length > 0) {
            results = found.map(r => ({
              ...r,
              confidence: "medium" as const,
              source: `Nearby: ${town}`,
            }));
            fallbackUsed = `Searched nearby town: ${town}`;
            break;
          }
        }
        if (results.length > 0) break;
      }
    }

    // Step 3: Regional District fallback
    let regionalContact: POIResponse["regionalContact"] | undefined;
    const regionKey = COMMUNITY_TO_REGION[normalizedCommunity];

    if (regionKey && BC_REGIONAL_DISTRICTS[regionKey]) {
      const rd = BC_REGIONAL_DISTRICTS[regionKey];
      regionalContact = {
        name: rd.name,
        phone: rd.phone,
        website: rd.website,
      };

      // If still no results, add regional district as fallback
      if (results.length === 0) {
        results.push({
          name: `${rd.name} Emergency Services`,
          address: `Contact: ${rd.phone}`,
          phone: rd.phone,
          website: rd.website,
          confidence: "fallback",
          source: "Regional District",
        });
        fallbackUsed = `Regional District contact for ${rd.name}`;
      }
    }

    // Step 4: If still nothing, provide general emergency contact
    if (results.length === 0) {
      results.push({
        name: "BC Emergency Services",
        address: "For emergencies dial 911. For non-emergency: 1-800-663-3456",
        phone: "911",
        confidence: "fallback",
        source: "Provincial",
      });
      fallbackUsed = "Provincial emergency contact";
    }

    const response: POIResponse = {
      results,
      searchedCommunity: community,
      searchedType: type,
      fallbackUsed,
      regionalContact,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in POI search:", error);
    return NextResponse.json(
      { error: "Failed to search for POI" },
      { status: 500 }
    );
  }
}
