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
      console.error("Google Geocoding API error:", data.status, data.error_message);
      return NextResponse.json(
        { error: `Geocoding failed: ${data.status}${data.error_message ? ` - ${data.error_message}` : ""}` },
        { status: 404 }
      );
    }

    // Check for multiple results - return all BC results for disambiguation
    const bcResults = data.results.filter((result: any) => {
      const addressComponents = result.address_components || [];
      return addressComponents.some((comp: any) =>
        comp.short_name === "BC" || comp.long_name === "British Columbia"
      );
    });

    // If multiple BC results exist, return them for user selection
    if (bcResults.length > 1) {
      return NextResponse.json({
        multiple: true,
        options: bcResults.map((result: any) => {
          // Extract locality/city for clearer display
          const addressComponents = result.address_components || [];
          const locality = addressComponents.find((c: any) =>
            c.types.includes("locality")
          )?.long_name;
          const sublocality = addressComponents.find((c: any) =>
            c.types.includes("sublocality") || c.types.includes("neighborhood")
          )?.long_name;

          // Build display name like "Willowbrook (near Penticton)"
          let displayName = address.trim();
          if (locality && locality.toLowerCase() !== address.trim().toLowerCase()) {
            displayName = `${address.trim()} (near ${locality})`;
          } else if (sublocality) {
            displayName = `${sublocality} (${locality || "BC"})`;
          }

          return {
            latitude: result.geometry.location.lat,
            longitude: result.geometry.location.lng,
            formattedAddress: result.formatted_address,
            displayName,
            placeId: result.place_id,
          };
        }),
      });
    }

    // Use first BC result if available, otherwise first result
    const result = bcResults.length > 0 ? bcResults[0] : data.results[0];
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
