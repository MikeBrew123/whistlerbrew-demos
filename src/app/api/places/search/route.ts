import { NextRequest, NextResponse } from "next/server";

// Google Places API (Text Search)
const GOOGLE_PLACES_API = "https://maps.googleapis.com/maps/api/place/textsearch/json";
const GOOGLE_DETAILS_API = "https://maps.googleapis.com/maps/api/place/details/json";

type PlaceResult = {
  name: string;
  address: string;
  phone?: string;
  lat: number;
  lng: number;
  website?: string;
  placeId: string;
  rating?: number;
  types?: string[];
};

type PlacesResponse = {
  places: PlaceResult[];
  error?: string;
};

async function getPlaceDetails(placeId: string, apiKey: string): Promise<Partial<PlaceResult>> {
  try {
    const url = `${GOOGLE_DETAILS_API}?place_id=${placeId}&fields=formatted_phone_number,website&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.result) {
      return {
        phone: data.result.formatted_phone_number,
        website: data.result.website,
      };
    }
  } catch (error) {
    console.error("Error fetching place details:", error);
  }
  return {};
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, location, type, radiusKm = 50 } = body;

    if (!query) {
      return NextResponse.json(
        { error: "query is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Google Places API key not configured" },
        { status: 500 }
      );
    }

    // Build the search query
    let searchQuery = query;
    if (type) {
      searchQuery = `${type} ${query}`;
    }

    // Build URL with parameters
    const params = new URLSearchParams({
      query: searchQuery,
      key: apiKey,
    });

    // Add location bias if provided
    if (location?.lat && location?.lng) {
      params.append("location", `${location.lat},${location.lng}`);
      params.append("radius", String(radiusKm * 1000)); // Convert km to meters
    }

    // Add region bias for BC, Canada
    params.append("region", "ca");

    const response = await fetch(`${GOOGLE_PLACES_API}?${params}`);

    if (!response.ok) {
      throw new Error(`Google Places API returned ${response.status}`);
    }

    const data = await response.json();

    if (data.status === "ZERO_RESULTS") {
      return NextResponse.json({ places: [] });
    }

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("Google Places API error:", data.status, data.error_message);
      return NextResponse.json(
        { error: data.error_message || `API error: ${data.status}` },
        { status: 500 }
      );
    }

    // Transform results
    const places: PlaceResult[] = await Promise.all(
      (data.results || []).slice(0, 5).map(async (place: {
        name: string;
        formatted_address: string;
        geometry: { location: { lat: number; lng: number } };
        place_id: string;
        rating?: number;
        types?: string[];
      }) => {
        // Get additional details (phone, website)
        const details = await getPlaceDetails(place.place_id, apiKey);

        return {
          name: place.name,
          address: place.formatted_address,
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
          placeId: place.place_id,
          rating: place.rating,
          types: place.types,
          ...details,
        };
      })
    );

    return NextResponse.json({ places } as PlacesResponse);
  } catch (error) {
    console.error("Error in places search:", error);
    return NextResponse.json(
      { error: "Failed to search places" },
      { status: 500 }
    );
  }
}
