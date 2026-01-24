import { NextRequest, NextResponse } from "next/server";
export const runtime = "edge";

// BC District to Radio Channel Map mapping
const BC_RADIO_CHANNEL_MAPS = {
  "Sea to Sky": "https://www2.gov.bc.ca/assets/gov/farming-natural-resources-and-industry/natural-resource-use/resource-roads/local-road-safety-information/sea-to-sky/seatosky_road_channels_jul02_2025.pdf",
  "Thompson Rivers": "https://www2.gov.bc.ca/assets/gov/farming-natural-resources-and-industry/natural-resource-use/resource-roads/channel-maps/thompson_rivers_resource_road_channels_2017.pdf",
  "Prince George": "https://www2.gov.bc.ca/assets/gov/farming-natural-resources-and-industry/natural-resource-use/resource-roads/channel-maps/pg_district_radio_frequency_map_georeferenced_low_resolution.pdf",
  "Quesnel": "https://www2.gov.bc.ca/assets/gov/farming-natural-resources-and-industry/natural-resource-use/resource-roads/channel-maps/quesnel_road_channel_map_june2017.pdf",
  "Okanagan Shuswap": "https://www2.gov.bc.ca/assets/gov/farming-natural-resources-and-industry/natural-resource-use/resource-roads/channel-maps/ok_resource_road_channest_no_freq.pdf",
  "Campbell River": "https://www2.gov.bc.ca/assets/gov/farming-natural-resources-and-industry/natural-resource-use/resource-roads/channel-maps/coastradiofrequencynov23-2015_v10_8.pdf",
  "Chilliwack": "https://www2.gov.bc.ca/assets/gov/farming-natural-resources-and-industry/natural-resource-use/resource-roads/channel-maps/dck_resource_roads_radio_channels_map_-_january2018.pdf",
  "100 Mile House": "https://www2.gov.bc.ca/assets/gov/farming-natural-resources-and-industry/natural-resource-use/resource-roads/channel-maps/dmh_res_rd_channels_175.pdf",
  "Cariboo-Chilcotin": "https://www2.gov.bc.ca/assets/gov/farming-natural-resources-and-industry/natural-resource-use/resource-roads/channel-maps/central_caribou_2014_frequency_road_map_rv7.pdf",
  "Nadina": "https://www2.gov.bc.ca/assets/gov/farming-natural-resources-and-industry/natural-resource-use/resource-roads/channel-maps/nadinachannelmap.pdf",
  "Fort St. James": "https://www2.gov.bc.ca/assets/gov/farming-natural-resources-and-industry/natural-resource-use/resource-roads/channel-maps/dja_radio_freq_map.pdf",
  "Vanderhoof": "https://www2.gov.bc.ca/assets/gov/farming-natural-resources-and-industry/natural-resource-use/resource-roads/channel-maps/dva_radio_freq_map.pdf",
  "Peace (Dawson Creek)": "https://www2.gov.bc.ca/assets/gov/farming-natural-resources-and-industry/natural-resource-use/resource-roads/channel-maps/southpeace_radiofrequency_may26_2014.pdf",
  "Peace (Fort St. John)": "https://www2.gov.bc.ca/assets/gov/farming-natural-resources-and-industry/natural-resource-use/resource-roads/channel-maps/fsj_northpeace_radiofrequency_april_29_2014.pdf",
  "Fort Nelson": "https://www2.gov.bc.ca/assets/gov/farming-natural-resources-and-industry/natural-resource-use/resource-roads/channel-maps/fn_northpeace_radiofrequency_may_12_2014_final.pdf",
  "Haida Gwaii": "https://www2.gov.bc.ca/assets/gov/farming-natural-resources-and-industry/natural-resource-use/resource-roads/channel-maps/haidagwaiieffectivenov19-2018.pdf",
};

// Detect region from coordinates (simplified)
function getRegionFromCoords(lat: number, lng: number): string {
  // Whistler/Squamish area
  if (lat >= 49.5 && lat <= 50.5 && lng >= -123.5 && lng <= -122.0) return "Sea to Sky";
  // Kamloops area
  if (lat >= 50.0 && lat <= 51.0 && lng >= -121.0 && lng <= -119.5) return "Thompson Rivers";
  // Prince George area
  if (lat >= 53.5 && lat <= 54.5 && lng >= -123.5 && lng <= -122.0) return "Prince George";
  // Quesnel area
  if (lat >= 52.5 && lat <= 53.5 && lng >= -123.0 && lng <= -121.5) return "Quesnel";
  // Okanagan
  if (lat >= 49.0 && lat <= 50.5 && lng >= -120.0 && lng <= -118.5) return "Okanagan Shuswap";
  // Default fallback
  return "Sea to Sky";
}

type TacticalMapRequest = {
  community: string;
  latitude: number;
  longitude: number;
  radiusKm?: number;
};

export async function POST(request: NextRequest) {
  try {
    const body: TacticalMapRequest = await request.json();
    const { community, latitude, longitude, radiusKm = 30 } = body;

    if (!community || !latitude || !longitude) {
      return NextResponse.json(
        { error: "community, latitude, and longitude are required" },
        { status: 400 }
      );
    }

    // Detect region for radio channel map
    const region = getRegionFromCoords(latitude, longitude);
    const radioMapUrl = BC_RADIO_CHANNEL_MAPS[region] || BC_RADIO_CHANNEL_MAPS["Sea to Sky"];

    // Fetch road and water data from OpenStreetMap Overpass API
    const overpassQuery = `
      [out:json][timeout:25];
      (
        way["highway"](around:${radiusKm * 1000},${latitude},${longitude});
        way["waterway"](around:${radiusKm * 1000},${latitude},${longitude});
        way["natural"="water"](around:${radiusKm * 1000},${latitude},${longitude});
      );
      out geom;
    `;

    const overpassUrl = "https://overpass-api.de/api/interpreter";
    const overpassResponse = await fetch(overpassUrl, {
      method: "POST",
      body: overpassQuery,
    });

    if (!overpassResponse.ok) {
      throw new Error("Failed to fetch map data from OpenStreetMap");
    }

    const mapData = await overpassResponse.json();

    // Generate KML
    const kml = generateTacticalKML(community, latitude, longitude, mapData, region, radioMapUrl);

    return new Response(kml, {
      headers: {
        "Content-Type": "application/vnd.google-earth.kml+xml",
        "Content-Disposition": `attachment; filename="${community.replace(/[^a-z0-9]/gi, "_")}_tactical_map.kml"`,
      },
    });
  } catch (error) {
    console.error("Error generating tactical map:", error);
    return NextResponse.json(
      { error: "Failed to generate tactical map" },
      { status: 500 }
    );
  }
}

function generateTacticalKML(
  community: string,
  lat: number,
  lng: number,
  mapData: any,
  region: string,
  radioMapUrl: string
): string {
  const roads: any[] = [];
  const waterways: any[] = [];

  // Parse OSM data
  mapData.elements?.forEach((element: any) => {
    if (element.type === "way") {
      if (element.tags?.highway) {
        roads.push(element);
      } else if (element.tags?.waterway || element.tags?.natural === "water") {
        waterways.push(element);
      }
    }
  });

  // Build KML
  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Tactical Map - ${escapeXml(community)}</name>
    <description><![CDATA[
<b>Tactical Road and Water Map</b><br/>
Community: ${escapeXml(community)}<br/>
Generated: ${new Date().toLocaleString()}<br/>
<br/>
<b>🔊 Radio Channels (${escapeXml(region)} District):</b><br/>
<a href="${radioMapUrl}">Download Radio Channel Map (PDF)</a><br/>
<br/>
<i>Note: Field signage overrides map channels. Always verify radio frequencies on posted signs.</i><br/>
<br/>
<b>Legend:</b><br/>
🛣️ Highways (Red)<br/>
🚜 Resource/Forest Service Roads (Orange)<br/>
🛤️ Local Roads (Yellow)<br/>
💧 Rivers/Streams (Blue)<br/>
🌊 Lakes/Water Bodies (Cyan)<br/>
    ]]></description>

    <!-- Styles -->
    <Style id="highway">
      <LineStyle>
        <color>ff0000ff</color>
        <width>4</width>
      </LineStyle>
    </Style>
    <Style id="resource_road">
      <LineStyle>
        <color>ff00a5ff</color>
        <width>3</width>
      </LineStyle>
    </Style>
    <Style id="local_road">
      <LineStyle>
        <color>ff00ffff</color>
        <width>2</width>
      </LineStyle>
    </Style>
    <Style id="waterway">
      <LineStyle>
        <color>ffff0000</color>
        <width>2</width>
      </LineStyle>
    </Style>
    <Style id="water_body">
      <LineStyle>
        <color>ffffff00</color>
        <width>2</width>
      </LineStyle>
      <PolyStyle>
        <color>7fffff00</color>
      </PolyStyle>
    </Style>

    <!-- Center Point -->
    <Placemark>
      <name>${escapeXml(community)}</name>
      <Point>
        <coordinates>${lng},${lat},0</coordinates>
      </Point>
    </Placemark>
`;

  // Add roads
  kml += `    <Folder>\n      <name>Roads</name>\n`;
  roads.forEach((road) => {
    const roadName = road.tags?.name || road.tags?.ref || "Unnamed Road";
    const roadType = road.tags?.highway || "unknown";

    let styleUrl = "#local_road";
    let roadCategory = "Local Road";

    if (["motorway", "trunk", "primary", "secondary"].includes(roadType)) {
      styleUrl = "#highway";
      roadCategory = "Highway";
    } else if (roadType.includes("service") || roadType.includes("track") || roadType === "unclassified") {
      styleUrl = "#resource_road";
      roadCategory = "Resource/FSR";
    }

    kml += `      <Placemark>\n`;
    kml += `        <name>${escapeXml(roadName)}</name>\n`;
    kml += `        <description>${escapeXml(roadCategory)} - ${escapeXml(roadType)}</description>\n`;
    kml += `        <styleUrl>${styleUrl}</styleUrl>\n`;
    kml += `        <LineString>\n`;
    kml += `          <coordinates>\n`;

    road.geometry?.forEach((point: any) => {
      kml += `            ${point.lon},${point.lat},0\n`;
    });

    kml += `          </coordinates>\n`;
    kml += `        </LineString>\n`;
    kml += `      </Placemark>\n`;
  });
  kml += `    </Folder>\n`;

  // Add waterways
  kml += `    <Folder>\n      <name>Water Features</name>\n`;
  waterways.forEach((water) => {
    const waterName = water.tags?.name || "Unnamed Waterway";
    const waterType = water.tags?.waterway || water.tags?.natural || "water";
    const isLake = water.tags?.natural === "water";

    kml += `      <Placemark>\n`;
    kml += `        <name>${escapeXml(waterName)}</name>\n`;
    kml += `        <description>${escapeXml(waterType)}</description>\n`;
    kml += `        <styleUrl>${isLake ? "#water_body" : "#waterway"}</styleUrl>\n`;
    kml += `        <LineString>\n`;
    kml += `          <coordinates>\n`;

    water.geometry?.forEach((point: any) => {
      kml += `            ${point.lon},${point.lat},0\n`;
    });

    kml += `          </coordinates>\n`;
    kml += `        </LineString>\n`;
    kml += `      </Placemark>\n`;
  });
  kml += `    </Folder>\n`;

  kml += `  </Document>\n</kml>`;
  return kml;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
