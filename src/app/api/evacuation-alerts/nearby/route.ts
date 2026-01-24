import { NextRequest, NextResponse } from "next/server";
export const runtime = "edge";

// BC Emergency Info BC - Evacuation Alerts and Orders
// Data source: https://www.emergencyinfobc.gov.bc.ca/
// API: https://services6.arcgis.com/ubm4tcTYICKBpist/arcgis/rest/services
const EMERGENCY_INFO_BC_API = "https://services6.arcgis.com/ubm4tcTYICKBpist/arcgis/rest/services/BCWS_ActiveFires_PublicView/FeatureServer/0/query";

type EvacuationAlert = {
  id: string;
  type: "Alert" | "Order";
  issuedBy: string;
  issuedDate: string;
  area: string;
  details: string;
  distanceKm?: number;
  severity: "High" | "Medium" | "Low";
};

type EvacuationAlertsResponse = {
  alerts: EvacuationAlert[];
  searchCenter: { latitude: number; longitude: number };
  radiusKm: number;
  count: number;
};

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
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

// Static fallback data for common BC communities
// In production, this would query EmergencyInfoBC or similar API
const ACTIVE_EVACUATION_ALERTS: Array<{
  id: string;
  type: "Alert" | "Order";
  issuedBy: string;
  issuedDate: string;
  area: string;
  details: string;
  lat: number;
  lng: number;
}> = [
  // No active alerts currently - this is a placeholder structure
  // Example format:
  // {
  //   id: "EMBC-2026-001",
  //   type: "Order",
  //   issuedBy: "Regional District of Central Kootenay",
  //   issuedDate: "2026-01-24T10:00:00Z",
  //   area: "Kaslo area",
  //   details: "Wildfire C12345 - Immediate evacuation required for homes on Highway 31A",
  //   lat: 49.9167,
  //   lng: -116.9167,
  // },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { latitude, longitude, radiusKm = 100 } = body;

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: "latitude and longitude are required" },
        { status: 400 }
      );
    }

    // Calculate distances and filter by radius
    const alertsWithDistance = ACTIVE_EVACUATION_ALERTS.map((alert) => {
      const distance = calculateDistance(latitude, longitude, alert.lat, alert.lng);
      return {
        ...alert,
        distanceKm: Math.round(distance * 10) / 10,
      };
    })
      .filter((alert) => alert.distanceKm <= radiusKm)
      .sort((a, b) => {
        // Sort by type (Orders first), then distance
        if (a.type === "Order" && b.type === "Alert") return -1;
        if (a.type === "Alert" && b.type === "Order") return 1;
        return a.distanceKm - b.distanceKm;
      });

    // Determine severity based on distance and type
    const alerts: EvacuationAlert[] = alertsWithDistance.map((alert) => {
      let severity: "High" | "Medium" | "Low" = "Low";
      if (alert.type === "Order") {
        severity = alert.distanceKm < 25 ? "High" : alert.distanceKm < 50 ? "Medium" : "Low";
      } else {
        severity = alert.distanceKm < 50 ? "Medium" : "Low";
      }

      return {
        id: alert.id,
        type: alert.type,
        issuedBy: alert.issuedBy,
        issuedDate: alert.issuedDate,
        area: alert.area,
        details: alert.details,
        distanceKm: alert.distanceKm,
        severity,
      };
    });

    const response: EvacuationAlertsResponse = {
      alerts,
      searchCenter: { latitude, longitude },
      radiusKm,
      count: alerts.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching evacuation alerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch evacuation alerts" },
      { status: 500 }
    );
  }
}
