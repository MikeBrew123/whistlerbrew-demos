import { NextRequest, NextResponse } from "next/server";
export const runtime = "edge";

// Use Google Geocoding API for better accuracy with city names
const GOOGLE_GEOCODING_API = "https://maps.googleapis.com/maps/api/geocode/json";

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

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Google API key not configured" },
        { status: 500 }
      );
    }

    // Add "BC, Canada" to help geocoder find BC locations
    const searchAddress = address.includes("BC") || address.includes("British Columbia")
      ? address
      : `${address}, BC, Canada`;

    const url = `${GOOGLE_GEOCODING_API}?address=${encodeURIComponent(searchAddress)}&key=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Google Geocoding API returned ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== "OK" || !data.results || data.results.length === 0) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    const result = data.results[0];
    const { lat, lng } = result.geometry.location;

    return NextResponse.json({
      latitude: lat,
      longitude: lng,
      formattedAddress: result.formatted_address,
      score: 100, // Google results are high confidence
    });
  } catch (error) {
    console.error("Error geocoding address:", error);
    return NextResponse.json(
      { error: "Failed to geocode address" },
      { status: 500 }
    );
  }
}
