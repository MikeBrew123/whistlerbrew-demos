import { NextRequest, NextResponse } from "next/server";
export const runtime = "edge";

const FWA_LAKES = "https://openmaps.gov.bc.ca/geo/pub/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=WHSE_BASEMAPPING.FWA_LAKES_POLY&outputFormat=json&srsName=EPSG:4326&maxFeatures=100&sortBy=AREA_HA+D";
const FWA_STREAMS = "https://openmaps.gov.bc.ca/geo/pub/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=WHSE_BASEMAPPING.FWA_STREAM_NETWORKS_SP&outputFormat=json&srsName=EPSG:4326&maxFeatures=100&propertyName=GNIS_NAME,STREAM_ORDER";
const OVERPASS_API = "https://overpass-api.de/api/interpreter";

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function centroid(geometry: any): [number, number] | null {
  try {
    const coords = geometry?.coordinates;
    if (!coords) return null;
    const flat: number[][] = [];
    const flatten = (c: any) => {
      if (typeof c[0] === "number") flat.push(c);
      else for (const x of c) flatten(x);
    };
    flatten(coords);
    if (flat.length === 0) return null;
    const lng = flat.reduce((s, c) => s + c[0], 0) / flat.length;
    const lat = flat.reduce((s, c) => s + c[1], 0) / flat.length;
    return [lat, lng];
  } catch { return null; }
}

interface WaterSource {
  name: string;
  type: string;
  distanceKm: number;
  accessNotes: string;
  lat: number;
  lng: number;
}

async function fetchLakes(lat: number, lng: number, radiusKm: number): Promise<WaterSource[]> {
  const delta = radiusKm / 111;
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta},EPSG:4326`;
  try {
    const res = await fetch(`${FWA_LAKES}&bbox=${bbox}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json();
    const seen = new Set<string>();
    const results: WaterSource[] = [];
    for (const f of data.features || []) {
      const name = f.properties?.GNIS_NAME_1 || "";
      const area = f.properties?.AREA_HA || 0;
      if (name && !seen.has(name)) {
        seen.add(name);
        const c = centroid(f.geometry);
        if (!c) continue;
        const dist = haversineKm(lat, lng, c[0], c[1]);
        if (dist <= radiusKm) {
          results.push({
            name,
            type: "lake",
            distanceKm: Math.round(dist * 10) / 10,
            accessNotes: area > 50 ? `${Math.round(area)} ha — large lake, multiple access points likely` :
              area > 10 ? `${Math.round(area)} ha` : `${Math.round(area)} ha — small lake`,
            lat: c[0], lng: c[1],
          });
        }
      } else if (!name && area >= 3) {
        const c = centroid(f.geometry);
        if (!c) continue;
        const dist = haversineKm(lat, lng, c[0], c[1]);
        const key = `unnamed-${Math.round(c[0] * 100)}-${Math.round(c[1] * 100)}`;
        if (dist <= radiusKm && !seen.has(key)) {
          seen.add(key);
          results.push({
            name: `Unnamed lake (${Math.round(area)} ha)`,
            type: "lake",
            distanceKm: Math.round(dist * 10) / 10,
            accessNotes: "Verify road access",
            lat: c[0], lng: c[1],
          });
        }
      }
    }
    return results;
  } catch { return []; }
}

async function fetchStreams(lat: number, lng: number, radiusKm: number): Promise<WaterSource[]> {
  const delta = Math.min(radiusKm / 111, 0.3);
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta},EPSG:4326`;
  try {
    const res = await fetch(`${FWA_STREAMS}&bbox=${bbox}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json();
    const seen = new Set<string>();
    const results: WaterSource[] = [];
    for (const f of data.features || []) {
      const name = f.properties?.GNIS_NAME || "";
      const order = f.properties?.STREAM_ORDER || 0;
      if (!name || seen.has(name)) continue;
      seen.add(name);
      const c = centroid(f.geometry);
      if (!c) continue;
      const dist = haversineKm(lat, lng, c[0], c[1]);
      if (dist <= radiusKm) {
        const type = order >= 5 ? "river" : order >= 3 ? "creek" : "stream";
        results.push({
          name,
          type,
          distanceKm: Math.round(dist * 10) / 10,
          accessNotes: order >= 5 ? "Major waterway — multiple access points" :
            order >= 3 ? "Verify draft point access" : "Small stream — limited volume",
          lat: c[0], lng: c[1],
        });
      }
    }
    return results;
  } catch { return []; }
}

async function fetchBoatLaunches(lat: number, lng: number, radiusKm: number): Promise<WaterSource[]> {
  const radius = Math.min(radiusKm * 1000, 30000);
  const query = `[out:json][timeout:8];(node["leisure"="slipway"](around:${radius},${lat},${lng});way["leisure"="slipway"](around:${radius},${lat},${lng});node["amenity"="boat_rental"](around:${radius},${lat},${lng});node["natural"="beach"]["name"](around:${radius},${lat},${lng}););out center tags 15;`;
  try {
    const res = await fetch(OVERPASS_API, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const results: WaterSource[] = [];
    const seen = new Set<string>();
    for (const e of data.elements || []) {
      const tags = e.tags || {};
      const elLat = e.lat || e.center?.lat;
      const elLng = e.lon || e.center?.lon;
      if (!elLat) continue;
      const key = `${Math.round(elLat * 1000)}-${Math.round(elLng * 1000)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const dist = haversineKm(lat, lng, elLat, elLng);
      const isBeach = tags.natural === "beach";
      const isBoat = tags.leisure === "slipway" || tags.amenity === "boat_rental";
      results.push({
        name: tags.name || (isBeach ? "Beach" : "Boat launch"),
        type: isBeach ? "beach" : "boat launch",
        distanceKm: Math.round(dist * 10) / 10,
        accessNotes: isBoat && tags.surface ? `${tags.surface} ramp` : "Via OpenStreetMap",
        lat: elLat, lng: elLng,
      });
    }
    return results;
  } catch { return []; }
}

export async function POST(request: NextRequest) {
  try {
    const { latitude, longitude, radiusKm = 40 } = await request.json();
    if (!latitude || !longitude) {
      return NextResponse.json({ error: "latitude and longitude required" }, { status: 400 });
    }

    const [lakes, streams, launches] = await Promise.all([
      fetchLakes(latitude, longitude, radiusKm),
      fetchStreams(latitude, longitude, radiusKm),
      fetchBoatLaunches(latitude, longitude, radiusKm),
    ]);

    const all = [...lakes, ...streams, ...launches]
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 12);

    return NextResponse.json({ waterSources: all });
  } catch (error) {
    console.error("Water sources error:", error);
    return NextResponse.json({ waterSources: [] });
  }
}
