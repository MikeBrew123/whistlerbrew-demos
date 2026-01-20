import { NextRequest, NextResponse } from "next/server";

type Employer = {
  name: string;
  type: string;
  address?: string;
  lat: number;
  lng: number;
  distanceKm: number;
  employeeEstimate?: string;
  notes?: string;
};

type EmployersResponse = {
  employers: Employer[];
  searchCenter: { lat: number; lng: number };
  radiusKm: number;
  count: number;
};

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
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

// Major BC employers by region (focus on large employers that would be relevant for emergency planning)
const BC_MAJOR_EMPLOYERS: Array<{
  name: string;
  type: string;
  lat: number;
  lng: number;
  employeeEstimate?: string;
  notes?: string;
}> = [
  // Whistler Area
  { name: "Whistler Blackcomb (Vail Resorts)", type: "Resort/Tourism", lat: 50.1163, lng: -122.9574, employeeEstimate: "3,000+ seasonal", notes: "Major ski resort" },
  { name: "Four Seasons Resort Whistler", type: "Hospitality", lat: 50.1142, lng: -122.9548, employeeEstimate: "300+", notes: "Luxury hotel" },
  { name: "Fairmont Chateau Whistler", type: "Hospitality", lat: 50.1166, lng: -122.9462, employeeEstimate: "500+", notes: "Major hotel" },
  { name: "Whistler Health Care Centre", type: "Healthcare", lat: 50.1199, lng: -122.9551, employeeEstimate: "100+", notes: "Regional health" },
  // Squamish
  { name: "Sea to Sky Gondola", type: "Tourism", lat: 49.6778, lng: -123.1556, employeeEstimate: "100+", notes: "Tourist attraction" },
  { name: "Squamish Terminals", type: "Industrial", lat: 49.4689, lng: -123.1522, employeeEstimate: "50+", notes: "Port facility" },
  // Kamloops
  { name: "Interior Health Authority", type: "Healthcare", lat: 50.6745, lng: -120.3273, employeeEstimate: "2,500+", notes: "Regional health authority" },
  { name: "Thompson Rivers University", type: "Education", lat: 50.6706, lng: -120.3650, employeeEstimate: "1,500+", notes: "University" },
  { name: "Highland Valley Copper Mine", type: "Mining", lat: 50.4833, lng: -121.0333, employeeEstimate: "1,200+", notes: "Major mine" },
  { name: "Domtar Kamloops Mill", type: "Forestry", lat: 50.6667, lng: -120.3167, employeeEstimate: "400+", notes: "Pulp mill" },
  // Kelowna
  { name: "Kelowna General Hospital", type: "Healthcare", lat: 49.8817, lng: -119.4847, employeeEstimate: "3,000+", notes: "Major hospital" },
  { name: "UBC Okanagan", type: "Education", lat: 49.9400, lng: -119.3967, employeeEstimate: "2,000+", notes: "University" },
  { name: "Tolko Industries", type: "Forestry", lat: 49.8667, lng: -119.4333, employeeEstimate: "500+", notes: "Forest products" },
  // Williams Lake / Cariboo
  { name: "Cariboo Memorial Hospital", type: "Healthcare", lat: 52.1294, lng: -122.1353, employeeEstimate: "300+", notes: "Regional hospital" },
  { name: "West Fraser Mills", type: "Forestry", lat: 52.1417, lng: -122.1250, employeeEstimate: "400+", notes: "Lumber mill" },
  { name: "Gibraltar Mine", type: "Mining", lat: 52.5167, lng: -122.3667, employeeEstimate: "800+", notes: "Copper mine" },
  // Prince George
  { name: "University of Northern BC", type: "Education", lat: 53.8939, lng: -122.8108, employeeEstimate: "1,000+", notes: "University" },
  { name: "Canfor PG Pulp Mill", type: "Forestry", lat: 53.9333, lng: -122.7833, employeeEstimate: "500+", notes: "Pulp mill" },
  { name: "Prince George Regional Hospital", type: "Healthcare", lat: 53.9167, lng: -122.7500, employeeEstimate: "2,000+", notes: "Northern health hub" },
  // Burns Lake / Bulkley
  { name: "Babine Forest Products", type: "Forestry", lat: 54.2306, lng: -125.7611, employeeEstimate: "200+", notes: "Sawmill" },
  { name: "Lakes District Hospital", type: "Healthcare", lat: 54.2333, lng: -125.7667, employeeEstimate: "100+", notes: "Regional hospital" },
  // Terrace / Kitimat
  { name: "Rio Tinto Alcan Smelter", type: "Industrial", lat: 54.0500, lng: -128.6500, employeeEstimate: "1,000+", notes: "Aluminum smelter" },
  { name: "LNG Canada", type: "Energy", lat: 54.0167, lng: -128.6833, employeeEstimate: "500+ (construction)", notes: "LNG facility" },
  { name: "Mills Memorial Hospital", type: "Healthcare", lat: 54.5167, lng: -128.5833, employeeEstimate: "300+", notes: "Regional hospital" },
  // Fort St John / Northeast
  { name: "BC Hydro Site C", type: "Energy/Construction", lat: 56.2000, lng: -120.9167, employeeEstimate: "3,000+", notes: "Dam construction" },
  { name: "Canadian Natural Resources", type: "Oil & Gas", lat: 56.2500, lng: -120.8500, employeeEstimate: "500+", notes: "Energy sector" },
  // Kootenays
  { name: "Teck Trail Operations", type: "Mining/Smelting", lat: 49.0833, lng: -117.7000, employeeEstimate: "1,400+", notes: "Lead-zinc smelter" },
  { name: "Selkirk College", type: "Education", lat: 49.5000, lng: -117.2833, employeeEstimate: "300+", notes: "Regional college" },
  // Vancouver Island
  { name: "Port Alberni Mill", type: "Forestry", lat: 49.2333, lng: -124.8000, employeeEstimate: "400+", notes: "Paper mill" },
  { name: "Nanaimo Regional Hospital", type: "Healthcare", lat: 49.1667, lng: -123.9333, employeeEstimate: "1,500+", notes: "Regional hospital" },
  { name: "Vancouver Island University", type: "Education", lat: 49.1556, lng: -123.9683, employeeEstimate: "1,000+", notes: "University" },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { latitude, longitude, radiusKm = 50 } = body;

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: "latitude and longitude are required" },
        { status: 400 }
      );
    }

    // Filter and sort by distance
    const employers: Employer[] = BC_MAJOR_EMPLOYERS
      .map((emp) => ({
        ...emp,
        distanceKm: Math.round(calculateDistance(latitude, longitude, emp.lat, emp.lng) * 10) / 10,
      }))
      .filter((emp) => emp.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 10);

    // Also search Google Places for additional large employers
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (apiKey && employers.length < 5) {
      try {
        for (const searchType of ["hospital", "university", "factory", "mill"]) {
          const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": apiKey,
              "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location,places.types",
            },
            body: JSON.stringify({
              textQuery: `${searchType} near ${latitude},${longitude}`,
              locationBias: {
                circle: {
                  center: { latitude, longitude },
                  radius: radiusKm * 1000,
                },
              },
              maxResultCount: 3,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.places) {
              for (const place of data.places) {
                const dist = calculateDistance(
                  latitude,
                  longitude,
                  place.location.latitude,
                  place.location.longitude
                );
                // Only add if not already in list
                const exists = employers.some(
                  (e) => e.name.toLowerCase().includes(place.displayName.text.toLowerCase().split(" ")[0])
                );
                if (dist <= radiusKm && !exists) {
                  employers.push({
                    name: place.displayName.text,
                    type: searchType.charAt(0).toUpperCase() + searchType.slice(1),
                    address: place.formattedAddress,
                    lat: place.location.latitude,
                    lng: place.location.longitude,
                    distanceKm: Math.round(dist * 10) / 10,
                  });
                }
              }
            }
          }
        }
      } catch {
        // Google Places search failed, continue with static data
      }
    }

    // Re-sort and limit
    const sortedEmployers = employers
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 10);

    return NextResponse.json({
      employers: sortedEmployers,
      searchCenter: { lat: latitude, lng: longitude },
      radiusKm,
      count: sortedEmployers.length,
    } as EmployersResponse);
  } catch (error) {
    console.error("Error fetching employers:", error);
    return NextResponse.json(
      { error: "Failed to fetch employers" },
      { status: 500 }
    );
  }
}
