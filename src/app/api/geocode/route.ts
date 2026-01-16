import { NextRequest, NextResponse } from "next/server";

// BC Address Geocoder API
const BC_GEOCODER_API = "https://geocoder.api.gov.bc.ca/addresses.json";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address } = body;

    if (!address) {
      return NextResponse.json(
        { error: "address is required" },
        { status: 400 }
      );
    }

    // Add "BC" to help geocoder find BC locations
    const searchAddress = address.includes("BC") ? address : `${address}, BC`;

    const url = `${BC_GEOCODER_API}?addressString=${encodeURIComponent(searchAddress)}&maxResults=1&outputSRS=4326`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`BC Geocoder API returned ${response.status}`);
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    const feature = data.features[0];
    const [lng, lat] = feature.geometry.coordinates;

    return NextResponse.json({
      latitude: lat,
      longitude: lng,
      formattedAddress: feature.properties.fullAddress,
      score: feature.properties.score,
    });
  } catch (error) {
    console.error("Error geocoding address:", error);
    return NextResponse.json(
      { error: "Failed to geocode address" },
      { status: 500 }
    );
  }
}
