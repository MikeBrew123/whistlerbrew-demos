import { NextRequest, NextResponse } from "next/server";

// Google Places API for hotel search
const GOOGLE_PLACES_API = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";
const GOOGLE_DETAILS_API = "https://maps.googleapis.com/maps/api/place/details/json";

type HotelResult = {
  name: string;
  address: string;
  phone?: string;
  lat: number;
  lng: number;
  rating?: number;
  priceLevel?: number;
  placeId: string;
  website?: string;
  totalRatings?: number;
};

type HotelSearchResponse = {
  hotels: HotelResult[];
  searchLocation: {
    lat: number;
    lng: number;
    name?: string;
  };
  error?: string;
};

async function getPlaceDetails(
  placeId: string,
  apiKey: string
): Promise<{ phone?: string; website?: string }> {
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
    const { lat, lng, locationName, radiusKm = 25 } = body;

    if (!lat || !lng) {
      return NextResponse.json(
        { error: "lat and lng are required" },
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

    // Search for lodging near the point
    const params = new URLSearchParams({
      location: `${lat},${lng}`,
      radius: String(radiusKm * 1000), // Convert to meters
      type: "lodging",
      key: apiKey,
    });

    const response = await fetch(`${GOOGLE_PLACES_API}?${params}`);
    const data = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("Google Places API error:", data.status, data.error_message);
      return NextResponse.json({
        hotels: [],
        searchLocation: { lat, lng, name: locationName },
        error: data.error_message || `API error: ${data.status}`,
      });
    }

    // Get top 5 hotels with details
    const topPlaces = (data.results || []).slice(0, 5);

    const hotels: HotelResult[] = await Promise.all(
      topPlaces.map(
        async (place: {
          name: string;
          vicinity: string;
          geometry: { location: { lat: number; lng: number } };
          rating?: number;
          price_level?: number;
          place_id: string;
          user_ratings_total?: number;
        }) => {
          const details = await getPlaceDetails(place.place_id, apiKey);

          return {
            name: place.name,
            address: place.vicinity,
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng,
            rating: place.rating,
            priceLevel: place.price_level,
            placeId: place.place_id,
            totalRatings: place.user_ratings_total,
            ...details,
          };
        }
      )
    );

    // Sort by rating (highest first)
    hotels.sort((a, b) => {
      const ratingA = a.rating || 0;
      const ratingB = b.rating || 0;
      return ratingB - ratingA;
    });

    return NextResponse.json({
      hotels,
      searchLocation: { lat, lng, name: locationName },
    } as HotelSearchResponse);
  } catch (error) {
    console.error("Error searching hotels:", error);
    return NextResponse.json(
      { error: "Failed to search hotels" },
      { status: 500 }
    );
  }
}
