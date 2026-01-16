import { NextRequest, NextResponse } from "next/server";

// Federal First Nations Location API
// Data source: https://open.canada.ca/data/en/dataset/b6567c5c-8339-4055-99fa-63f92114d9e4
const FN_API_URL = "https://geo.aadnc-aandc.gc.ca/cippn-fnpim/WmsLayer/executeWfsQuery";

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

    const response = await fetch(`${FN_API_URL}?${params}`);

    if (!response.ok) {
      // Try alternative endpoint
      const altParams = new URLSearchParams({
        service: "WFS",
        version: "2.0.0",
        request: "GetFeature",
        typeNames: "FN_Location_BC",
        outputFormat: "application/json",
        srsName: "EPSG:4326",
        bbox: `${bbox},EPSG:4326`,
      });

      const altResponse = await fetch(
        `https://geo.aadnc-aandc.gc.ca/cippn-fnpim/ows?${altParams}`
      );

      if (!altResponse.ok) {
        // Return empty result with disclaimer rather than error
        return NextResponse.json({
          nations: [],
          searchCenter: { latitude, longitude },
          radiusKm,
          count: 0,
          pronunciationDisclaimer:
            "Federal First Nations data service is temporarily unavailable. Please check Indigenous Services Canada for local First Nations information.",
        } as FirstNationsResponse);
      }
    }

    let data;
    try {
      data = await response.json();
    } catch {
      return NextResponse.json({
        nations: [],
        searchCenter: { latitude, longitude },
        radiusKm,
        count: 0,
        pronunciationDisclaimer:
          "Unable to parse First Nations data. Please check Indigenous Services Canada for local First Nations information.",
      } as FirstNationsResponse);
    }

    const features = data.features || [];

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
