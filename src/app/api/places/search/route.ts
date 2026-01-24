import { NextRequest, NextResponse } from "next/server";
export const runtime = "edge";


// Google Places API (New)
const PLACES_API_NEW = "https://places.googleapis.com/v1/places:searchText";

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
    searchQuery += ", BC, Canada";

    // Build request body for Places API (New)
    const requestBody: {
      textQuery: string;
      maxResultCount: number;
      locationBias?: { circle: { center: { latitude: number; longitude: number }; radius: number } };
    } = {
      textQuery: searchQuery,
      maxResultCount: 5,
    };

    // Add location bias if provided
    if (location?.lat && location?.lng) {
      requestBody.locationBias = {
        circle: {
          center: { latitude: location.lat, longitude: location.lng },
          radius: radiusKm * 1000, // Convert km to meters
        },
      };
    }

    const response = await fetch(PLACES_API_NEW, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.location,places.rating,places.websiteUri,places.types",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Google Places API error:", errorData);
      return NextResponse.json(
        { error: errorData.error?.message || `API error: ${response.status}` },
        { status: 500 }
      );
    }

    const data = await response.json();

    if (!data.places || data.places.length === 0) {
      return NextResponse.json({ places: [] });
    }

    // Transform results
    const places: PlaceResult[] = data.places.map((place: {
      id: string;
      displayName: { text: string };
      formattedAddress: string;
      nationalPhoneNumber?: string;
      location: { latitude: number; longitude: number };
      rating?: number;
      websiteUri?: string;
      types?: string[];
    }) => ({
      name: place.displayName.text,
      address: place.formattedAddress,
      phone: place.nationalPhoneNumber,
      lat: place.location.latitude,
      lng: place.location.longitude,
      placeId: place.id,
      rating: place.rating,
      website: place.websiteUri,
      types: place.types,
    }));

    return NextResponse.json({ places } as PlacesResponse);
  } catch (error) {
    console.error("Error in places search:", error);
    return NextResponse.json(
      { error: "Failed to search places" },
      { status: 500 }
    );
  }
}
