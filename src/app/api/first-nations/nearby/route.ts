import { NextRequest, NextResponse } from "next/server";
export const runtime = "edge";


// Federal First Nations Location API
// Data source: https://open.canada.ca/data/en/dataset/b6567c5c-8339-4055-99fa-63f92114d9e4
const FN_API_URL = "https://geo.aadnc-aandc.gc.ca/cippn-fnpim/WmsLayer/executeWfsQuery";

// Static fallback data for BC First Nations (used when federal API is unavailable)
// Source: Indigenous Services Canada public data
const BC_FIRST_NATIONS_FALLBACK: Array<{ name: string; bandNumber: number; lat: number; lng: number }> = [
  // Sea-to-Sky / Whistler Area
  { name: "Líl̓wat Nation", bandNumber: 567, lat: 50.3117, lng: -122.7981 },
  { name: "Squamish Nation", bandNumber: 552, lat: 49.4627, lng: -123.1207 },
  { name: "Tsleil-Waututh Nation", bandNumber: 550, lat: 49.3000, lng: -122.9500 },
  // Fraser Valley
  { name: "Musqueam Indian Band", bandNumber: 539, lat: 49.2292, lng: -123.1872 },
  { name: "Kwantlen First Nation", bandNumber: 537, lat: 49.1044, lng: -122.6653 },
  { name: "Stó:lō Nation", bandNumber: 0, lat: 49.1833, lng: -121.9500 },
  { name: "Sts'ailes", bandNumber: 524, lat: 49.3500, lng: -121.9833 },
  { name: "Seabird Island Band", bandNumber: 568, lat: 49.3500, lng: -121.7500 },
  // Kamloops / Thompson
  { name: "Tk'emlúps te Secwépemc", bandNumber: 531, lat: 50.6745, lng: -120.3273 },
  { name: "Shuswap Indian Band", bandNumber: 529, lat: 50.8667, lng: -119.2667 },
  { name: "Adams Lake Indian Band", bandNumber: 502, lat: 50.9833, lng: -119.6833 },
  { name: "Neskonlith Indian Band", bandNumber: 541, lat: 50.7833, lng: -119.5167 },
  { name: "Splats'in First Nation", bandNumber: 573, lat: 50.7000, lng: -118.9500 },
  // Okanagan
  { name: "Westbank First Nation", bandNumber: 556, lat: 49.8667, lng: -119.5833 },
  { name: "Penticton Indian Band", bandNumber: 546, lat: 49.4667, lng: -119.5833 },
  { name: "Osoyoos Indian Band", bandNumber: 543, lat: 49.0333, lng: -119.4500 },
  // Cariboo / Central BC
  { name: "Williams Lake First Nation", bandNumber: 558, lat: 52.1417, lng: -122.1417 },
  { name: "Tsilhqot'in National Government", bandNumber: 0, lat: 52.0000, lng: -123.0000 },
  { name: "Xeni Gwet'in First Nations Government", bandNumber: 560, lat: 51.7500, lng: -124.0000 },
  // Prince George / Northern
  { name: "Lheidli T'enneh First Nation", bandNumber: 538, lat: 53.9171, lng: -122.7497 },
  { name: "Carrier Sekani Tribal Council", bandNumber: 0, lat: 54.0500, lng: -125.7500 },
  // Bulkley Valley / Northwest
  { name: "Wet'suwet'en First Nation", bandNumber: 557, lat: 54.3833, lng: -126.5333 },
  { name: "Gitxsan Nation", bandNumber: 0, lat: 55.2500, lng: -127.6667 },
  { name: "Haisla Nation", bandNumber: 527, lat: 54.0500, lng: -128.7000 },
  // Northeast
  { name: "Doig River First Nation", bandNumber: 512, lat: 56.7833, lng: -121.0167 },
  { name: "Blueberry River First Nations", bandNumber: 506, lat: 57.0000, lng: -121.2167 },
  // Kootenays
  { name: "Ktunaxa Nation Council", bandNumber: 0, lat: 49.5000, lng: -115.7667 },
  { name: "ʔaq̓am (St. Mary's Indian Band)", bandNumber: 575, lat: 49.5500, lng: -115.8333 },
  // Vancouver Island
  { name: "Snuneymuxw First Nation", bandNumber: 572, lat: 49.1667, lng: -123.9500 },
  { name: "Cowichan Tribes", bandNumber: 510, lat: 48.8000, lng: -123.6500 },
  { name: "Nuu-chah-nulth Tribal Council", bandNumber: 0, lat: 49.2500, lng: -125.9000 },
  { name: "Kwakiutl First Nation", bandNumber: 536, lat: 50.6000, lng: -127.0833 },
];

type FirstNation = {
  name: string;
  bandNumber: number;
  lat: number;
  lng: number;
  distanceKm?: number;
  pronunciation?: string;
  pronunciationNote?: string;
};

type FirstNationsResponse = {
  nations: FirstNation[];
  searchCenter: { latitude: number; longitude: number };
  radiusKm: number;
  count: number;
  pronunciationDisclaimer: string;
};

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Pronunciation hints for common First Nations names in BC
// NOTE: These are approximate phonetic guides, not authoritative pronunciations
const PRONUNCIATION_HINTS: Record<string, string> = {
  "Líl̓wat": "LEEL-wat",
  "Lil'wat": "LEEL-wat",
  "Squamish": "SKWAH-mish",
  "Sto:lo": "STOH-loh",
  "Stó:lō": "STOH-loh",
  "Musqueam": "MUSK-wee-um",
  "Tsleil-Waututh": "slay-WAH-tooth",
  "Tsawwassen": "suh-WOSS-en",
  "Semiahmoo": "sem-ee-AH-moo",
  "Katzie": "KAT-zee",
  "Kwantlen": "KWANT-len",
  "Matsqui": "MAT-skwee",
  "Sumas": "SOO-mas",
  "Sts'ailes": "STAY-ulss",
  "Chehalis": "chuh-HAY-lis",
  "Skwah": "SKWAH",
  "Seabird Island": "SEA-bird",
  "Yale": "YALE",
  "Spuzzum": "SPUH-zum",
  "Nlaka'pamux": "ing-khla-KAP-muh",
  "Secwepemc": "shuh-HWEP-muhk",
  "Tk'emlúps": "tuh-KEM-loops",
  "Splats'in": "SPLAT-sin",
  "Neskonlith": "NES-kon-lith",
  "Adams Lake": "AD-ums Lake",
  "Shuswap": "SHOO-swap",
  "Okanagan": "oh-kuh-NAH-gun",
  "Syilx": "see-ILKS",
  "Similkameen": "sih-MIL-kuh-meen",
  "Penticton Indian": "pen-TIK-ton",
  "Osoyoos Indian": "oh-SOY-oos",
  "Westbank": "WEST-bank",
  "Okanagan Indian": "oh-kuh-NAH-gun",
  "Ktunaxa": "tuh-NAH-hah",
  "ʔaq̓am": "AH-kum",
  "Tobacco Plains": "tuh-BAK-oh Plains",
  "Sinixt": "sin-EEKST",
  "Carrier": "KAIR-ee-er",
  "Dakelh": "duh-KELH",
  "Wet'suwet'en": "wet-SOO-wet-en",
  "Gitxsan": "git-KSAN",
  "Nisga'a": "NISS-gah",
  "Tsimshian": "TSIM-shee-an",
  "Haida": "HI-dah",
  "Heiltsuk": "HALE-tsuk",
  "Nuxalk": "NOO-halk",
  "Kwakwaka'wakw": "kwok-wok-yah-WOKW",
  "Nuu-chah-nulth": "noo-CHAH-noolth",
  "Coast Salish": "Coast SAY-lish",
  "Tsilhqot'in": "sil-KOH-tin",
  "Chilcotin": "chil-KOH-tin",
  "St'at'imc": "stat-LEE-umk",
  "Tahltan": "TAL-tan",
  "Kaska": "KAS-kuh",
  "Dene": "DEH-nay",
  "Dunne-za": "dun-NAY-zah",
};

function getPronunciation(name: string): string | undefined {
  // Check exact match first
  if (PRONUNCIATION_HINTS[name]) {
    return PRONUNCIATION_HINTS[name];
  }

  // Check if any key is contained in the name
  for (const [key, pronunciation] of Object.entries(PRONUNCIATION_HINTS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) {
      return pronunciation;
    }
  }

  return undefined;
}

// Helper to use fallback data
function useFallbackData(latitude: number, longitude: number, radiusKm: number): FirstNationsResponse {
  const nations: FirstNation[] = BC_FIRST_NATIONS_FALLBACK
    .map((fn) => {
      const distanceKm = calculateDistance(latitude, longitude, fn.lat, fn.lng);
      const pronunciation = getPronunciation(fn.name);
      return {
        ...fn,
        distanceKm: Math.round(distanceKm * 10) / 10,
        pronunciation,
        pronunciationNote: pronunciation
          ? "Approximate phonetic guide - please verify with community"
          : undefined,
      };
    })
    .filter((nation) => nation.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return {
    nations,
    searchCenter: { latitude, longitude },
    radiusKm,
    count: nations.length,
    pronunciationDisclaimer:
      "Pronunciation guides are approximate phonetic hints only. Data from static fallback - federal API unavailable.",
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { latitude, longitude, radiusKm = 100 } = body;

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: "latitude and longitude are required" },
        { status: 400 }
      );
    }

    // Calculate bounding box for the query
    const latDelta = radiusKm / 111; // ~111km per degree latitude
    const lngDelta = radiusKm / (111 * Math.cos((latitude * Math.PI) / 180));

    const bbox = [
      longitude - lngDelta,
      latitude - latDelta,
      longitude + lngDelta,
      latitude + latDelta,
    ].join(",");

    // Build WFS query
    const params = new URLSearchParams({
      service: "WFS",
      version: "1.1.0",
      request: "GetFeature",
      typename: "cippn-fnpim:FN_Location_BC",
      outputFormat: "json",
      srsName: "EPSG:4326",
      bbox: bbox,
    });

    let response;
    try {
      // Add timeout to federal API call
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      response = await fetch(`${FN_API_URL}?${params}`, { signal: controller.signal });
      clearTimeout(timeoutId);
    } catch {
      // Federal API timeout or network error - use fallback
      return NextResponse.json(useFallbackData(latitude, longitude, radiusKm));
    }

    if (!response.ok) {
      // Try alternative endpoint with timeout
      const altParams = new URLSearchParams({
        service: "WFS",
        version: "2.0.0",
        request: "GetFeature",
        typeNames: "FN_Location_BC",
        outputFormat: "application/json",
        srsName: "EPSG:4326",
        bbox: `${bbox},EPSG:4326`,
      });

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const altResponse = await fetch(
          `https://geo.aadnc-aandc.gc.ca/cippn-fnpim/ows?${altParams}`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);

        if (!altResponse.ok) {
          // Both endpoints failed - use fallback
          return NextResponse.json(useFallbackData(latitude, longitude, radiusKm));
        }
      } catch {
        // Alt endpoint failed - use fallback
        return NextResponse.json(useFallbackData(latitude, longitude, radiusKm));
      }
    }

    let data;
    try {
      data = await response.json();
    } catch {
      // Failed to parse response - use fallback
      return NextResponse.json(useFallbackData(latitude, longitude, radiusKm));
    }

    const features = data.features || [];

    // If no features from API, use fallback
    if (features.length === 0) {
      return NextResponse.json(useFallbackData(latitude, longitude, radiusKm));
    }

    // Transform and filter by actual distance
    const nations: FirstNation[] = features
      .map((feature: {
        properties: {
          BAND_NAME?: string;
          NAME?: string;
          BAND_NUMBER?: number;
        };
        geometry: {
          coordinates: [number, number];
        };
      }) => {
        const props = feature.properties;
        const [lng, lat] = feature.geometry.coordinates;
        const name = props.BAND_NAME || props.NAME || "Unknown";

        const distanceKm = calculateDistance(latitude, longitude, lat, lng);
        const pronunciation = getPronunciation(name);

        return {
          name,
          bandNumber: props.BAND_NUMBER || 0,
          lat,
          lng,
          distanceKm: Math.round(distanceKm * 10) / 10,
          pronunciation,
          pronunciationNote: pronunciation
            ? "Approximate phonetic guide - please verify with community"
            : undefined,
        };
      })
      .filter((nation: FirstNation) => nation.distanceKm! <= radiusKm)
      .sort((a: FirstNation, b: FirstNation) => (a.distanceKm || 0) - (b.distanceKm || 0));

    const result: FirstNationsResponse = {
      nations,
      searchCenter: { latitude, longitude },
      radiusKm,
      count: nations.length,
      pronunciationDisclaimer:
        "Pronunciation guides are approximate phonetic hints only. They are not authoritative and may not reflect traditional or community-preferred pronunciations. When in doubt, respectfully ask community members for guidance.",
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching First Nations data:", error);
    return NextResponse.json(
      { error: "Failed to fetch First Nations data" },
      { status: 500 }
    );
  }
}
