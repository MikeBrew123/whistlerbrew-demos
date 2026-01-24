import { NextRequest, NextResponse } from "next/server";
export const runtime = "edge";

// BC Emergency Info BC - Evacuation Alerts and Orders
// Data source: https://www.emergencyinfobc.gov.bc.ca/
// API: https://services6.arcgis.com/ubm4tcTYICKBpist/arcgis/rest/services/Evacuation_Orders_and_Alerts/FeatureServer/0
const EVACUATION_API = "https://services6.arcgis.com/ubm4tcTYICKBpist/arcgis/rest/services/Evacuation_Orders_and_Alerts/FeatureServer/0/query";

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

    // Query EmergencyInfoBC ArcGIS REST API
    // Get all active evacuation orders and alerts
    const params = new URLSearchParams({
      where: "EVENT_TYPE IN ('Order', 'Alert')",
      outFields: "*",
      returnGeometry: "true",
      f: "json",
    });

    const apiResponse = await fetch(`${EVACUATION_API}?${params}`);

    if (!apiResponse.ok) {
      console.error("EmergencyInfoBC API error:", apiResponse.status);
      // Return empty results if API fails
      return NextResponse.json({
        alerts: [],
        searchCenter: { latitude, longitude },
        radiusKm,
        count: 0,
      });
    }

    const data = await apiResponse.json();

    if (!data.features || data.features.length === 0) {
      // No active alerts - return empty
      return NextResponse.json({
        alerts: [],
        searchCenter: { latitude, longitude },
        radiusKm,
        count: 0,
      });
    }

    // Parse features and calculate distances
    const alertsWithDistance = data.features
      .map((feature: any) => {
        const attr = feature.attributes;
        const geom = feature.geometry;

        // Get coordinates (handle different geometry types)
        let alertLat: number;
        let alertLng: number;

        if (geom.x && geom.y) {
          // Point geometry
          alertLat = geom.y;
          alertLng = geom.x;
        } else if (geom.rings && geom.rings[0]) {
          // Polygon - use centroid approximation (first point)
          alertLng = geom.rings[0][0][0];
          alertLat = geom.rings[0][0][1];
        } else {
          return null; // Skip if no usable geometry
        }

        const distance = calculateDistance(latitude, longitude, alertLat, alertLng);

        if (distance > radiusKm) {
          return null; // Outside search radius
        }

        return {
          id: attr.OBJECTID?.toString() || attr.EVENT_NUMBER || "unknown",
          type: attr.EVENT_TYPE === "Order" ? "Order" as const : "Alert" as const,
          issuedBy: attr.ISSUING_AGENCY || attr.JURISDICTION || "Unknown Authority",
          issuedDate: attr.DATE_MODIFIED || attr.DATE_CREATED || new Date().toISOString(),
          area: attr.EVENT_NAME || attr.ORDER_ALERT_NAME || "Area not specified",
          details: attr.COMMENTS || attr.EVENT_DESCRIPTION || "See EmergencyInfoBC for details",
          distanceKm: Math.round(distance * 10) / 10,
        };
      })
      .filter((alert: any) => alert !== null)
      .sort((a: any, b: any) => {
        // Sort by type (Orders first), then distance
        if (a.type === "Order" && b.type === "Alert") return -1;
        if (a.type === "Alert" && b.type === "Order") return 1;
        return a.distanceKm - b.distanceKm;
      });

    // Determine severity based on distance and type
    const alerts: EvacuationAlert[] = alertsWithDistance.map((alert: any) => {
      let severity: "High" | "Medium" | "Low" = "Low";
      if (alert.type === "Order") {
        severity = alert.distanceKm < 25 ? "High" : alert.distanceKm < 50 ? "Medium" : "Low";
      } else {
        severity = alert.distanceKm < 50 ? "Medium" : "Low";
      }

      return {
        ...alert,
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
    // Return empty results on error rather than failing
    return NextResponse.json({
      alerts: [],
      searchCenter: { latitude: 0, longitude: 0 },
      radiusKm: 100,
      count: 0,
    });
  }
}
