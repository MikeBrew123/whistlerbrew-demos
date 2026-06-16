import { NextRequest, NextResponse } from "next/server";
export const runtime = "edge";

// BC Geographic Names — includes small towns, rural communities, First Nations villages
const BC_NAMES_WFS =
  "https://openmaps.gov.bc.ca/geo/pub/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=WHSE_BASEMAPPING.GNS_GEOGRAPHICAL_NAMES_SP&outputFormat=json&srsName=EPSG:4326&CQL_FILTER=FEATURE_CLASS=%27Populated%27";

const INCLUDE_TYPES = new Set([
  "Community", "City", "District Municipality (1)", "Village (1)", "Town",
  "First Nation Village", "Urban Community", "Recreational Community",
  "Settlement", "Resort Municipality", "Mountain Resort Municipality",
]);

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// 2021 Census populations for BC communities (Stats Canada)
const BC_POPULATIONS: Record<string, number> = {
  "Kamloops": 97902, "Kelowna": 144576, "Vernon": 44519, "Penticton": 37039,
  "Merritt": 7051, "Salmon Arm": 18065, "Revelstoke": 8275, "Golden": 3708,
  "Lillooet": 2321, "Lytton": 249, "Cache Creek": 962, "Ashcroft": 1471,
  "Chase": 2710, "Sicamous": 3085, "Armstrong": 5145, "Enderby": 2964,
  "Lumby": 1833, "Oliver": 4928, "Osoyoos": 5085, "Summerland": 11615,
  "Peachland": 5634, "Lake Country": 15817, "West Kelowna": 36078,
  "100 Mile House": 1886, "Williams Lake": 10753, "Quesnel": 9889,
  "Prince George": 76708, "Burns Lake": 1779, "Vanderhoof": 4439,
  "Smithers": 5401, "Terrace": 12015, "Kitimat": 8131, "Houston": 2797,
  "McBride": 587, "Valemount": 1021, "Clearwater": 2324, "Barriere": 1773,
  "Sun Peaks": 616, "Logan Lake": 1993, "Savona": 644, "Monte Creek": 300,
  "Pritchard": 750, "Westwold": 200, "Falkland": 700, "Blind Bay": 900,
  "Sorrento": 1500, "Scotch Creek": 800, "Celista": 400, "Lee Creek": 300,
  "Anglemont": 600, "Eagle Bay": 300, "Magna Bay": 400, "White Lake": 200,
  "Quilchena": 120, "Douglas Lake": 250, "Nicola": 150, "Lower Nicola": 900,
  "Stump Lake": 50, "Brigade Lake": 30, "Knutsford": 450, "Sahali": 8500,
  "Aberdeen": 5200, "Bestwick": 100, "Barnhartvale": 3500, "Heffley Creek": 1200,
  "Rayleigh": 3500, "Westsyde": 5000, "Brocklehurst": 12000, "Valleyview": 4500,
  "Dallas": 2200, "Campbell Creek": 1800, "Monte Lake": 200,
  "Shuswap": 500, "Spences Bridge": 200, "Boston Bar": 300, "Yale": 150,
  "Hope": 6181, "Princeton": 2828, "Hedley": 300, "Keremeos": 1468,
  "Cranbrook": 20047, "Kimberley": 8036, "Fernie": 6320, "Sparwood": 4182,
  "Elkford": 2523, "Invermere": 3391, "Radium Hot Springs": 777,
  "Castlegar": 8039, "Trail": 7709, "Rossland": 3729, "Nelson": 10664,
  "Creston": 5351, "Nakusp": 1605, "New Denver": 473, "Kaslo": 1049,
  "Slocan": 302, "Salmo": 1141, "Fruitvale": 2005, "Warfield": 1648,
  "Grand Forks": 4049, "Greenwood": 625, "Midway": 681,
  "Pemberton": 2574, "Whistler": 13982, "Squamish": 23819, "Gibsons": 4758,
  "Sechelt": 10219, "Powell River": 13943, "Gold River": 1212,
  "Campbell River": 35519, "Courtenay": 28420, "Comox": 14806,
  "Port Alberni": 18259, "Tofino": 2264, "Ucluelet": 1906,
  "Nanaimo": 99863, "Duncan": 5029, "Ladysmith": 9027, "Chemainus": 4184,
  "Lake Cowichan": 3306, "Parksville": 13642, "Qualicum Beach": 9432,
  "Dawson Creek": 12978, "Fort St. John": 21314, "Fort Nelson": 3366,
  "Chetwynd": 2503, "Tumbler Ridge": 1987, "Hudson's Hope": 946,
  "Mackenzie": 3714, "Fraser Lake": 1024, "Fort St. James": 1598,
};

const TYPE_POP_ESTIMATES: Record<string, number> = {
  "City": 15000, "Town": 3000, "Village": 800, "District": 5000,
  "Community": 300, "First Nation": 400, "Settlement": 100,
  "Recreational": 200, "Resort Municipality": 2000,
};

function cleanType(featureType: string): string {
  return featureType
    .replace(/\s*\(\d+\)\s*$/, "")
    .replace("District Municipality", "District")
    .replace("First Nation Village", "First Nation")
    .replace("Recreational Community", "Recreational")
    .replace("Urban Community", "Community")
    .replace("Mountain Resort Municipality", "Resort Municipality");
}

export async function POST(request: NextRequest) {
  try {
    const { latitude, longitude, radiusKm = 50 } = await request.json();
    if (!latitude || !longitude) {
      return NextResponse.json({ error: "latitude and longitude required" }, { status: 400 });
    }

    const response = await fetch(BC_NAMES_WFS);
    if (!response.ok) throw new Error(`BC Names WFS returned ${response.status}`);

    const data = await response.json();
    const features = data.features || [];

    const seen = new Set<string>();
    const nearby = features
      .filter((f: any) => INCLUDE_TYPES.has(f.properties.FEATURE_TYPE))
      .map((f: any) => {
        const coords = f.geometry.coordinates;
        const lat = coords[1];
        const lng = coords[0];
        const dist = haversineKm(latitude, longitude, lat, lng);
        const p = f.properties;
        const name = p.GEOGRAPHICAL_NAME || "";
        const type = cleanType(p.FEATURE_TYPE || "Community");
        const pop = BC_POPULATIONS[name] || TYPE_POP_ESTIMATES[type] || 0;
        return {
          id: name.toLowerCase().replace(/\s+/g, "-"),
          name,
          type,
          category: p.FEATURE_CATEGORY || "",
          population: pop,
          populationSource: BC_POPULATIONS[name] ? "census" : "estimate",
          lat,
          lng,
          distanceKm: Math.round(dist),
        };
      })
      .filter((c: any) => {
        if (c.distanceKm > radiusKm) return false;
        // Deduplicate by name (keep closest)
        if (seen.has(c.name)) return false;
        seen.add(c.name);
        return true;
      })
      .sort((a: any, b: any) => a.distanceKm - b.distanceKm);

    return NextResponse.json({ communities: nearby });
  } catch (error) {
    console.error("Communities nearby error:", error);
    return NextResponse.json({ error: "Failed to fetch nearby communities" }, { status: 500 });
  }
}
