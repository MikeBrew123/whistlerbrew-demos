import { NextRequest, NextResponse } from "next/server";
export const runtime = "edge";


// Community operational data for emergency dispatch
// This data should be maintained and updated by local emergency coordinators

type CommunityOpsData = {
  community: string;
  eocContacts: {
    organization: string;
    email?: string;
    phone?: string;
    notes?: string;
  }[];
  rawsStation?: {
    id: string;
    name: string;
    ffmc?: number; // Fine Fuel Moisture Code
    isi?: number;  // Initial Spread Index
    fwi?: number;  // Fire Weather Index
    lastUpdated?: string;
    notes?: string;
  };
  fuelAndMechanical: {
    name: string;
    type: "fuel" | "mechanical" | "both";
    is24h: boolean;
    address?: string;
    phone?: string;
    notes?: string;
  }[];
  stagingAreas: {
    name: string;
    type: "staging" | "helipad" | "both";
    address?: string;
    coordinates?: { lat: number; lng: number };
    capacity?: string;
    notes?: string;
  }[];
  accessConstraints: string[];
  infrastructure: {
    power: string;
    telecom: string;
    notes?: string;
  };
  heavyEquipmentContractors: {
    name: string;
    services: string;
    phone?: string;
    location?: string;
  }[];
  essReceptionCentre?: {
    name: string;
    address: string;
    phone?: string;
    capacity?: string;
  };
  weatherAndTopo: {
    prevailingWinds: string;
    topoNotes: string;
    hazardTreeRisk?: string;
    beetleKill?: string;
  };
  airSupport: {
    nearestTankerBase?: string;
    nearestRappelBase?: string;
    localHelipads: string[];
    notes?: string;
  };
  hospitalTraumaLevel?: string;
};

// BC Community Ops Database - Expandable
const COMMUNITY_OPS_DATA: Record<string, CommunityOpsData> = {
  whistler: {
    community: "Whistler",
    eocContacts: [
      { organization: "Resort Municipality of Whistler Emergency Program", email: "emergency@whistler.ca", phone: "604-935-8100", notes: "24/7 Emergency Line" },
      { organization: "SLRD Emergency Operations", phone: "604-894-6371", email: "emergency@slrd.bc.ca" },
    ],
    rawsStation: {
      id: "C45712",
      name: "Whistler Mountain",
      notes: "Check BC Wildfire RAWS data for current indices",
    },
    fuelAndMechanical: [
      { name: "Petro-Canada Whistler", type: "fuel", is24h: false, address: "4295 Blackcomb Way", phone: "604-932-1142" },
      { name: "Whistler Car Rental & Service", type: "mechanical", is24h: false, phone: "604-932-1236" },
      { name: "Husky Function Junction", type: "fuel", is24h: false, address: "1045 Millar Creek Rd" },
    ],
    stagingAreas: [
      { name: "Whistler Olympic Plaza", type: "staging", address: "4365 Blackcomb Way", capacity: "Large event capacity", notes: "Central village location" },
      { name: "Whistler Health Care Centre Helipad", type: "helipad", coordinates: { lat: 50.1199, lng: -122.9551 }, notes: "Hospital helipad" },
      { name: "Meadow Park Sports Centre", type: "both", address: "8107 Camino Dr", capacity: "Large parking, field space", notes: "Good for base camp" },
      { name: "Lost Lake Fields", type: "staging", notes: "Open area, trail access" },
    ],
    accessConstraints: [
      "Highway 99 (Sea-to-Sky) prone to rockfall, avalanche, and weather closures",
      "Single highway access - no alternate route from south",
      "Pemberton alternate route via Hwy 99 north (longer)",
      "Winter: chains may be required, check DriveBC",
    ],
    infrastructure: {
      power: "BC Hydro - Whistler Substation",
      telecom: "TELUS primary, Rogers secondary",
      notes: "Microwave towers on Whistler and Blackcomb mountains",
    },
    heavyEquipmentContractors: [
      { name: "Whistler Excavating", services: "Excavators, loaders", phone: "604-932-4453", location: "Function Junction" },
      { name: "Nesters Equipment Rentals", services: "General equipment", phone: "604-932-9366" },
    ],
    essReceptionCentre: {
      name: "Myrtle Philip Community School",
      address: "6195 Lorimer Rd, Whistler",
      phone: "604-905-2581",
      capacity: "500+ persons",
    },
    weatherAndTopo: {
      prevailingWinds: "Valley channeling from south (Squamish) and north (Pemberton); strong afternoon upslope winds",
      topoNotes: "Alpine terrain, steep valley walls. Cheakamus River valley runs N-S. Elevations from 650m (village) to 2200m+ (alpine)",
      hazardTreeRisk: "Moderate in lower valley forests; post-storm wind-throw risk",
      beetleKill: "Low - coastal climate less affected",
    },
    airSupport: {
      nearestTankerBase: "Abbotsford Air Tanker Base (seasonal)",
      nearestRappelBase: "Kamloops or Campbell River",
      localHelipads: ["Whistler Health Care Centre", "Whistler Heli heliport (commercial)"],
      notes: "Good helicopter access; mountain flying considerations above treeline",
    },
    hospitalTraumaLevel: "Whistler Health Care Centre (Community-level, stabilize & transfer)",
  },
  squamish: {
    community: "Squamish",
    eocContacts: [
      { organization: "District of Squamish Emergency Program", email: "emergencypreparedness@squamish.ca", phone: "604-815-5000" },
      { organization: "Squamish Fire Rescue", phone: "604-892-5228", notes: "Non-emergency" },
    ],
    rawsStation: {
      id: "C45711",
      name: "Squamish North",
      ffmc: 89,
      isi: 5,
      fwi: 13,
      notes: "Values shown are example - check BC Wildfire for current",
    },
    fuelAndMechanical: [
      { name: "Chevron Squamish", type: "fuel", is24h: true, address: "1900 Garibaldi Way", phone: "604-892-9106" },
      { name: "Squamish Towing Ltd", type: "mechanical", is24h: true, phone: "604-892-2140", notes: "24h towing & repairs" },
      { name: "Esso Squamish", type: "fuel", is24h: false, address: "38551 Loggers Lane" },
    ],
    stagingAreas: [
      { name: "Brennan Park Recreation Centre", type: "both", address: "1009 Centennial Way", capacity: "Large fields & parking", notes: "Primary staging area" },
      { name: "Squamish General Hospital Helipad", type: "helipad", coordinates: { lat: 49.7017, lng: -123.1558 } },
      { name: "Quest University Fields", type: "staging", address: "3200 University Blvd", capacity: "Large open area" },
      { name: "Squamish Airport", type: "helipad", coordinates: { lat: 49.7833, lng: -123.1617 }, notes: "Small aircraft & heli" },
    ],
    accessConstraints: [
      "Highway 99 prone to rockfall hazards and weather closures",
      "Squamish Valley Road can flood seasonally",
      "Single highway access from Vancouver",
      "Ferry backup via Horseshoe Bay if highway closed",
    ],
    infrastructure: {
      power: "BC Hydro - Squamish Substation",
      telecom: "TELUS primary",
      notes: "Microwave tower at Smoke Bluffs; cell coverage good in town, spotty in valleys",
    },
    heavyEquipmentContractors: [
      { name: "Mackenzie Earthworks Ltd.", services: "Excavators, water tenders, heavy equipment", phone: "604-898-2588", location: "Squamish" },
      { name: "Valley Equipment", services: "General construction equipment", phone: "604-898-3366" },
    ],
    essReceptionCentre: {
      name: "Brennan Park Recreation Centre",
      address: "1009 Centennial Way",
      phone: "604-898-3604",
      capacity: "600+ persons",
    },
    weatherAndTopo: {
      prevailingWinds: "Predominantly southerly inflow winds from Howe Sound; canyon wind effects",
      topoNotes: "Steep valley walls, Howe Sound fjord geography. Squamish River delta. Strong outflow winds possible.",
      hazardTreeRisk: "Moderate wind-throw risk along forested slopes, especially post-storm",
      beetleKill: "Low - coastal climate",
    },
    airSupport: {
      nearestTankerBase: "Abbotsford Air Tanker Base (seasonal)",
      nearestRappelBase: "Campbell River or Abbotsford",
      localHelipads: ["Squamish General Hospital", "Squamish Airport"],
      notes: "Regional support from Campbell River or Abbotsford (season dependent)",
    },
    hospitalTraumaLevel: "Squamish General Hospital (Community-level care; trauma transfers to Vancouver)",
  },
  pemberton: {
    community: "Pemberton",
    eocContacts: [
      { organization: "Village of Pemberton Emergency Program", phone: "604-894-6135", email: "info@pemberton.ca" },
      { organization: "SLRD Emergency Operations", phone: "604-894-6371" },
    ],
    rawsStation: {
      id: "C45714",
      name: "Pemberton Airport",
      notes: "Check BC Wildfire RAWS for current indices",
    },
    fuelAndMechanical: [
      { name: "Pemberton Valley Supermarket (Petro-Canada)", type: "fuel", is24h: false, address: "1392 Portage Rd" },
      { name: "Pemberton Automotive", type: "mechanical", is24h: false, phone: "604-894-6812" },
    ],
    stagingAreas: [
      { name: "Pemberton Airport", type: "both", coordinates: { lat: 50.3025, lng: -122.7378 }, notes: "Runway & helipad" },
      { name: "Pemberton Secondary School", type: "staging", address: "1195 School Rd", capacity: "Fields & parking" },
      { name: "Pemberton Lions Park", type: "staging", notes: "Central location" },
    ],
    accessConstraints: [
      "Highway 99 only paved access from south (Whistler)",
      "Lillooet Road (unpaved) alternate to east",
      "Duffy Lake Road (Hwy 99 north) to Lillooet - winter conditions variable",
      "D'Arcy / Anderson Lake route to Lillooet (rough road)",
    ],
    infrastructure: {
      power: "BC Hydro",
      telecom: "TELUS; limited cell coverage outside town core",
    },
    heavyEquipmentContractors: [
      { name: "Sea to Sky Excavating", services: "Excavators, trucks", location: "Pemberton" },
    ],
    essReceptionCentre: {
      name: "Pemberton Community Centre",
      address: "7390 Cottonwood St",
      phone: "604-894-6135",
    },
    weatherAndTopo: {
      prevailingWinds: "Valley winds; Pemberton Valley opens to northwest",
      topoNotes: "Broad agricultural valley floor surrounded by Coast Mountains. Lillooet River floodplain.",
      hazardTreeRisk: "Moderate in forested areas",
    },
    airSupport: {
      nearestTankerBase: "Abbotsford",
      localHelipads: ["Pemberton Airport", "Pemberton Health Centre"],
      notes: "Good helicopter staging at airport",
    },
    hospitalTraumaLevel: "Pemberton Health Centre (Rural clinic; transfers to Whistler/Vancouver)",
  },
  kamloops: {
    community: "Kamloops",
    eocContacts: [
      { organization: "City of Kamloops Emergency Program", phone: "250-828-3499", email: "emergency@kamloops.ca" },
      { organization: "Kamloops Fire Rescue", phone: "250-372-5131" },
      { organization: "BC Wildfire Service - Kamloops Fire Centre", phone: "250-554-5965" },
    ],
    rawsStation: {
      id: "C3B025",
      name: "Kamloops Airport",
      notes: "Fire Centre location - comprehensive fire weather data available",
    },
    fuelAndMechanical: [
      { name: "Husky Kamloops (Trans-Canada)", type: "both", is24h: true, address: "Trans-Canada Hwy" },
      { name: "Petro-Canada Kamloops", type: "fuel", is24h: true },
      { name: "Lordco Kamloops", type: "mechanical", is24h: false, notes: "Parts & service" },
    ],
    stagingAreas: [
      { name: "Kamloops Airport", type: "both", notes: "Air tanker base, major staging" },
      { name: "Interior Savings Centre", type: "staging", capacity: "Large event capacity" },
      { name: "McArthur Island Park", type: "staging", notes: "Large open area" },
      { name: "Royal Inland Hospital Helipad", type: "helipad" },
    ],
    accessConstraints: [
      "Trans-Canada Highway (Hwy 1) main access E-W",
      "Highway 5 (Yellowhead) to north",
      "Highway 5A to Merritt south",
      "Multiple highway options provide good access",
    ],
    infrastructure: {
      power: "BC Hydro - major substation",
      telecom: "TELUS, Rogers, Shaw - full coverage",
      notes: "Regional hub with robust infrastructure",
    },
    heavyEquipmentContractors: [
      { name: "Finning CAT", services: "Heavy equipment sales & service", location: "Kamloops" },
      { name: "Interior Heavy Equipment", services: "Excavators, graders, trucks" },
    ],
    essReceptionCentre: {
      name: "Tournament Capital Centre",
      address: "910 McGill Rd",
      capacity: "Large facility",
    },
    weatherAndTopo: {
      prevailingWinds: "Variable; Thompson River valley influences. Strong afternoon thermals.",
      topoNotes: "Semi-arid grasslands and dry forests. Thompson & North Thompson River confluence. Fire-prone ecosystem.",
      hazardTreeRisk: "High - dry conditions and beetle-affected stands",
      beetleKill: "Significant mountain pine beetle impact in surrounding forests",
    },
    airSupport: {
      nearestTankerBase: "Kamloops Air Tanker Base (on-site)",
      nearestRappelBase: "Kamloops Rappel Base",
      localHelipads: ["Kamloops Airport", "Royal Inland Hospital"],
      notes: "Major fire response hub - air tanker and rappel base co-located",
    },
    hospitalTraumaLevel: "Royal Inland Hospital (Level 3 Trauma Centre)",
  },
  kelowna: {
    community: "Kelowna",
    eocContacts: [
      { organization: "City of Kelowna Emergency Program", phone: "250-469-8900", email: "emergency@kelowna.ca" },
      { organization: "Kelowna Fire Department", phone: "250-469-8801" },
      { organization: "BC Wildfire Service - Southeast Fire Centre", phone: "250-558-1700" },
    ],
    rawsStation: {
      id: "C3B040",
      name: "Kelowna Airport",
      notes: "Airport station; additional stations throughout Okanagan",
    },
    fuelAndMechanical: [
      { name: "Costco Gas Kelowna", type: "fuel", is24h: false },
      { name: "Esso Kelowna (Highway 97)", type: "fuel", is24h: true },
      { name: "OK Tire Kelowna", type: "mechanical", is24h: false },
    ],
    stagingAreas: [
      { name: "Kelowna International Airport", type: "both", notes: "Air tanker capable" },
      { name: "Prospera Place", type: "staging", capacity: "6,000+" },
      { name: "Kelowna General Hospital Helipad", type: "helipad" },
      { name: "City Park", type: "staging", notes: "Downtown waterfront" },
    ],
    accessConstraints: [
      "Highway 97 main north-south corridor",
      "Highway 33 to Rock Creek (east)",
      "Okanagan Lake can isolate west side communities",
      "Bennett Bridge (Hwy 97) key crossing",
    ],
    infrastructure: {
      power: "BC Hydro, FortisBC",
      telecom: "TELUS, Rogers, Shaw - excellent coverage",
    },
    heavyEquipmentContractors: [
      { name: "Brandt Kelowna", services: "John Deere equipment" },
      { name: "SMS Equipment", services: "Heavy equipment rental" },
    ],
    essReceptionCentre: {
      name: "Parkinson Recreation Centre",
      address: "1800 Parkinson Way",
      capacity: "Large capacity",
    },
    weatherAndTopo: {
      prevailingWinds: "Lake effect; afternoon up-valley winds. Strong thermal activity.",
      topoNotes: "Okanagan Valley dry forest ecosystem. Interface zones throughout. Steep terrain on valley sides.",
      hazardTreeRisk: "High - dry conditions, interface zones",
      beetleKill: "Significant pine beetle mortality in surrounding forests",
    },
    airSupport: {
      nearestTankerBase: "Kamloops (primary); Penticton regional",
      localHelipads: ["Kelowna Airport", "Kelowna General Hospital", "Various private"],
      notes: "Good air access; interface firefighting focus",
    },
    hospitalTraumaLevel: "Kelowna General Hospital (Level 3 Trauma Centre)",
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { community } = body;

    if (!community) {
      return NextResponse.json(
        { error: "community is required" },
        { status: 400 }
      );
    }

    const normalizedCommunity = community.toLowerCase().trim().replace(/\s+/g, "");
    const data = COMMUNITY_OPS_DATA[normalizedCommunity];

    if (!data) {
      // Return empty structure with community name for areas not yet in database
      return NextResponse.json({
        community,
        dataAvailable: false,
        message: `Operational data not yet available for ${community}. Contact local emergency management for details.`,
        suggestedContacts: [
          { organization: "BC Emergency Management", phone: "1-800-663-3456" },
          { organization: "BC Wildfire Service", phone: "1-888-336-7378" },
        ],
      });
    }

    return NextResponse.json({
      ...data,
      dataAvailable: true,
      lastUpdated: "2024-01-15", // Should be maintained with actual update dates
      disclaimer: "Verify all operational data before deployment. Contact local EOC for current conditions.",
    });
  } catch (error) {
    console.error("Error fetching community ops data:", error);
    return NextResponse.json(
      { error: "Failed to fetch community operational data" },
      { status: 500 }
    );
  }
}
