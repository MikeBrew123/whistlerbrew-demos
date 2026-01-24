import { NextRequest, NextResponse } from "next/server";
export const runtime = "edge";

// BC Government's official geocoder - knows ALL BC communities including small rural ones
const BC_GEOCODER_API = "https://geocoder.api.gov.bc.ca/addresses.json";
// Google fallback for major cities
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

    // Try BC Geocoder first (knows all BC communities, even small rural ones)
    try {
      const bcUrl = `${BC_GEOCODER_API}?addressString=${encodeURIComponent(address)}&localityName=&provinceCode=BC&maxResults=10&interpolation=adaptive&echo=true&brief=false&autoComplete=true`;
      const bcResponse = await fetch(bcUrl);

      if (bcResponse.ok) {
        const bcData = await bcResponse.json();

        if (bcData.features && bcData.features.length > 0) {
          console.log(`BC Geocoder found ${bcData.features.length} result(s) for "${address}"`);

          // Transform BC Geocoder results to our format
          const bcResults = bcData.features.map((feature: any) => {
            const props = feature.properties;
            const coords = feature.geometry.coordinates; // [lng, lat]

            return {
              latitude: coords[1],
              longitude: coords[0],
              formattedAddress: props.fullAddress || `${address}, BC`,
              locality: props.localityName,
              regionalDistrict: props.electoralArea,
              score: props.score,
            };
          });

          // If multiple results, return for disambiguation
          if (bcResults.length > 1) {
            return NextResponse.json({
              multiple: true,
              options: bcResults.map((result: any) => {
                let displayName = address.trim();

                // Use regional district or locality for context
                if (result.regionalDistrict) {
                  displayName = `${address.trim()} (${result.regionalDistrict})`;
                } else if (result.locality && result.locality.toLowerCase() !== address.trim().toLowerCase()) {
                  displayName = `${address.trim()} (near ${result.locality})`;
                }

                return {
                  ...result,
                  displayName,
                  placeId: `bc-${result.latitude}-${result.longitude}`,
                };
              }),
            });
          }

          // Single result from BC Geocoder
          return NextResponse.json({
            latitude: bcResults[0].latitude,
            longitude: bcResults[0].longitude,
            formattedAddress: bcResults[0].formattedAddress,
            score: bcResults[0].score,
          });
        }
      }
    } catch (bcError) {
      console.log("BC Geocoder failed, falling back to Google:", bcError);
    }

    // Fallback to Google if BC Geocoder has no results
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Geocoding failed - no API configured" },
        { status: 500 }
      );
    }

    // Add "BC, Canada" to help geocoder find BC locations
    const searchAddress = address.includes("BC") || address.includes("British Columbia")
      ? address
      : `${address}, BC, Canada`;

    // Request region biasing to prioritize BC results and get more results
    const url = `${GOOGLE_GEOCODING_API}?address=${encodeURIComponent(searchAddress)}&components=administrative_area:BC|country:CA&key=${apiKey}`;
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

    // Get all results (component filtering should have already limited to BC)
    const bcResults = data.results;

    console.log(`Geocoding "${address}": Found ${bcResults.length} result(s)`);
    bcResults.forEach((r: any, i: number) => {
      console.log(`  ${i + 1}. ${r.formatted_address} (${r.geometry.location.lat}, ${r.geometry.location.lng})`);
    });

    // If multiple BC results exist, return them for user selection
    if (bcResults.length > 1) {
      return NextResponse.json({
        multiple: true,
        options: bcResults.map((result: any) => {
          // Extract location context for clearer display
          const addressComponents = result.address_components || [];

          // Try to find best context: regional district, county, or nearby city
          const adminLevel2 = addressComponents.find((c: any) =>
            c.types.includes("administrative_area_level_2")
          )?.long_name;

          const locality = addressComponents.find((c: any) =>
            c.types.includes("locality")
          )?.long_name;

          // Build display name using regional context
          let displayName = address.trim();
          const searchTerm = address.trim().toLowerCase();

          // Use admin level 2 (regional district) if available and different from search
          if (adminLevel2 && adminLevel2.toLowerCase() !== searchTerm) {
            displayName = `${address.trim()} (${adminLevel2} area)`;
          }
          // Otherwise use locality if it's different from search
          else if (locality && locality.toLowerCase() !== searchTerm) {
            displayName = `${address.trim()} (near ${locality})`;
          }
          // Fallback: parse formatted address for context
          else {
            // Extract meaningful part from formatted address
            const parts = result.formatted_address.split(",").map((p: string) => p.trim());
            if (parts.length > 2) {
              // Use second part if it's not BC or postal code
              const context = parts[1];
              if (context && !context.match(/^[A-Z]\d[A-Z]/)) {
                displayName = `${address.trim()} (${context})`;
              }
            }
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
