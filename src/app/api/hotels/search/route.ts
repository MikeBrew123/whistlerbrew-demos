import { NextRequest, NextResponse } from "next/server";

// Google Places API (New) for hotel search
const PLACES_API_NEW = "https://places.googleapis.com/v1/places:searchNearby";

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

    // Use Places API (New) - searchNearby with includedTypes
    const requestBody = {
      includedTypes: ["lodging"],
      maxResultCount: 5,
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: radiusKm * 1000, // meters
        },
      },
    };

    const response = await fetch(PLACES_API_NEW, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.location,places.rating,places.priceLevel,places.websiteUri,places.userRatingCount",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Google Places API error:", errorData);
      return NextResponse.json({
        hotels: [],
        searchLocation: { lat, lng, name: locationName },
        error: errorData.error?.message || `API error: ${response.status}`,
      });
    }

    const data = await response.json();

    const hotels: HotelResult[] = (data.places || []).map((place: {
      id: string;
      displayName: { text: string };
      formattedAddress: string;
      nationalPhoneNumber?: string;
      location: { latitude: number; longitude: number };
      rating?: number;
      priceLevel?: string;
      websiteUri?: string;
      userRatingCount?: number;
    }) => ({
      name: place.displayName.text,
      address: place.formattedAddress,
      phone: place.nationalPhoneNumber,
      lat: place.location.latitude,
      lng: place.location.longitude,
      rating: place.rating,
      priceLevel: place.priceLevel ? ["FREE", "INEXPENSIVE", "MODERATE", "EXPENSIVE", "VERY_EXPENSIVE"].indexOf(place.priceLevel) : undefined,
      placeId: place.id,
      website: place.websiteUri,
      totalRatings: place.userRatingCount,
    }));

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
