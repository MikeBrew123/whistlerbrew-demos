import { NextRequest, NextResponse } from "next/server";

type KMLPoint = {
  name: string;
  lat: number;
  lng: number;
  category: "fire" | "firstNation" | "fireDept" | "hospital" | "rcmp" | "grocery" | "hotel" | "waterSource" | "other";
  description?: string;
  isFireOfNote?: boolean;
};

type KMLRequest = {
  points: KMLPoint[];
  title: string;
  community: string;
};

// KML icon URLs (Google Maps icons)
const CATEGORY_ICONS: Record<string, string> = {
  fire: "http://maps.google.com/mapfiles/kml/shapes/firedept.png",
  fireOfNote: "http://maps.google.com/mapfiles/kml/paddle/red-stars.png",
  firstNation: "http://maps.google.com/mapfiles/kml/paddle/purple-circle.png",
  fireDept: "http://maps.google.com/mapfiles/kml/shapes/firedept.png",
  hospital: "http://maps.google.com/mapfiles/kml/shapes/hospitals.png",
  rcmp: "http://maps.google.com/mapfiles/kml/shapes/police.png",
  grocery: "http://maps.google.com/mapfiles/kml/shapes/grocery.png",
  hotel: "http://maps.google.com/mapfiles/kml/shapes/lodging.png",
  waterSource: "http://maps.google.com/mapfiles/kml/paddle/blu-circle.png",
  other: "http://maps.google.com/mapfiles/kml/paddle/wht-circle.png",
};

const CATEGORY_NAMES: Record<string, string> = {
  fire: "Active Fires",
  firstNation: "First Nations",
  fireDept: "Fire Departments",
  hospital: "Hospitals",
  rcmp: "RCMP Detachments",
  grocery: "Grocery Stores",
  hotel: "Accommodations",
  waterSource: "Water Access Points",
  other: "Other Points",
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function generatePlacemark(point: KMLPoint): string {
  const icon = point.category === "fire" && point.isFireOfNote
    ? CATEGORY_ICONS.fireOfNote
    : CATEGORY_ICONS[point.category] || CATEGORY_ICONS.other;

  const description = point.description ? escapeXml(point.description) : "";

  return `
    <Placemark>
      <name>${escapeXml(point.name)}</name>
      <description><![CDATA[${description}]]></description>
      <Style>
        <IconStyle>
          <Icon>
            <href>${icon}</href>
          </Icon>
          <scale>1.2</scale>
        </IconStyle>
      </Style>
      <Point>
        <coordinates>${point.lng},${point.lat},0</coordinates>
      </Point>
    </Placemark>`;
}

function generateFolder(name: string, points: KMLPoint[]): string {
  if (points.length === 0) return "";

  const placemarks = points.map(generatePlacemark).join("\n");

  return `
  <Folder>
    <name>${escapeXml(name)}</name>
    <open>1</open>
    ${placemarks}
  </Folder>`;
}

function generateKML(data: KMLRequest): string {
  const { points, title, community } = data;

  // Group points by category
  const grouped: Record<string, KMLPoint[]> = {};
  for (const point of points) {
    const category = point.category;
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(point);
  }

  // Generate folders in preferred order
  const categoryOrder = ["fire", "waterSource", "firstNation", "fireDept", "hospital", "rcmp", "grocery", "hotel", "other"];
  const folders = categoryOrder
    .filter((cat) => grouped[cat] && grouped[cat].length > 0)
    .map((cat) => generateFolder(CATEGORY_NAMES[cat], grouped[cat]))
    .join("\n");

  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(title)}</name>
    <description>SPS Dispatch Briefing for ${escapeXml(community)} - Generated ${new Date().toISOString()}</description>

    <!-- Shared Styles -->
    <Style id="fire">
      <IconStyle>
        <Icon><href>${CATEGORY_ICONS.fire}</href></Icon>
        <scale>1.2</scale>
      </IconStyle>
    </Style>
    <Style id="fireOfNote">
      <IconStyle>
        <Icon><href>${CATEGORY_ICONS.fireOfNote}</href></Icon>
        <scale>1.4</scale>
      </IconStyle>
    </Style>
    <Style id="firstNation">
      <IconStyle>
        <Icon><href>${CATEGORY_ICONS.firstNation}</href></Icon>
        <scale>1.0</scale>
      </IconStyle>
    </Style>
    <Style id="fireDept">
      <IconStyle>
        <Icon><href>${CATEGORY_ICONS.fireDept}</href></Icon>
        <scale>1.0</scale>
      </IconStyle>
    </Style>
    <Style id="hospital">
      <IconStyle>
        <Icon><href>${CATEGORY_ICONS.hospital}</href></Icon>
        <scale>1.0</scale>
      </IconStyle>
    </Style>
    <Style id="rcmp">
      <IconStyle>
        <Icon><href>${CATEGORY_ICONS.rcmp}</href></Icon>
        <scale>1.0</scale>
      </IconStyle>
    </Style>

    ${folders}
  </Document>
</kml>`;

  return kml;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { points, title, community } = body as KMLRequest;

    if (!points || !Array.isArray(points)) {
      return NextResponse.json(
        { error: "points array is required" },
        { status: 400 }
      );
    }

    if (!community) {
      return NextResponse.json(
        { error: "community is required" },
        { status: 400 }
      );
    }

    const kml = generateKML({
      points,
      title: title || `SPS Briefing - ${community}`,
      community,
    });

    // Return KML as downloadable file
    return new NextResponse(kml, {
      headers: {
        "Content-Type": "application/vnd.google-earth.kml+xml",
        "Content-Disposition": `attachment; filename="${community.replace(/[^a-z0-9]/gi, "_")}_briefing.kml"`,
      },
    });
  } catch (error) {
    console.error("Error generating KML:", error);
    return NextResponse.json(
      { error: "Failed to generate KML" },
      { status: 500 }
    );
  }
}
