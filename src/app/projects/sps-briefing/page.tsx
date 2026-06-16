"use client";

import { useEffect, useState, useRef, useCallback, Suspense, Fragment } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// ─── Types ───────────────────────────────────────────────────────────────────

type Screen = 'lookup' | 'map' | 'dashboard' | 'detail';
type EntryMode = 'fire' | 'camp' | null;
type ThreatLevel = 'order' | 'alert' | 'proximity';

interface FireData {
  id: string;
  name: string;
  sizeHa: number;
  status: string;
  fireOfNote: boolean;
  discovered: string;
  cause: string;
  centre: string;
  lat: number;
  lng: number;
  growth: string;
  resources: string;
  perimeter: [number, number][];
}

interface CommunityContact {
  name: string;
  phone: string;
}

interface FirstNation {
  band: string;
  pron: string;
  nation: string;
  office: string;
  territory: string;
  territoryPron: string;
  distanceKm: number;
}

interface ICSRow {
  org: string;
  phone: string;
}

interface CommunityData {
  id: string;
  name: string;
  type: string;
  population: number | null;
  lat: number;
  lng: number;
  distanceKm: number | null;
  fireZone: string;
  threat: ThreatLevel;
  evac: {
    status: string;
    label: string;
    since: string | null;
    by: string | null;
    zones: string;
  };
  contacts: {
    fireDept?: CommunityContact;
    hospital?: CommunityContact;
    rcmp?: CommunityContact;
    water?: CommunityContact;
  };
  firstNation?: FirstNation;
  ics: ICSRow[];
  infrastructure: ICSRow[];
  sections: Record<string, string>;
  manual?: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const REPORT_WILDFIRE = { org: "Report a Wildfire", phone: "1-800-663-5555", note: "or *5555 from a cell" };

const FIRE_CENTRE_CONTACTS: Record<string, ICSRow> = {
  "Kamloops Fire Centre": { org: "BCWS Kamloops Fire Centre", phone: "250-554-5532" },
  "Northwest Fire Centre": { org: "BCWS Northwest Fire Centre (Smithers)", phone: "250-847-6600" },
  "Prince George Fire Centre": { org: "BCWS Prince George Fire Centre", phone: "250-565-6194" },
  "Cariboo Fire Centre": { org: "BCWS Cariboo Fire Centre (Williams Lake)", phone: "250-989-2600" },
  "Southeast Fire Centre": { org: "BCWS Southeast Fire Centre (Castlegar)", phone: "250-365-4040" },
  "Coastal Fire Centre": { org: "BCWS Coastal Fire Centre (Parksville)", phone: "250-951-4200" },
};

const STANDARD_INFRASTRUCTURE: ICSRow[] = [
  { org: "BC Hydro — Outages & Emergencies", phone: "1-888-769-3766" },
  { org: "FortisBC — Gas Emergency", phone: "1-800-663-9911" },
  { org: "Telus — Outages", phone: "1-888-811-2323" },
  { org: "BCEHS (Ambulance)", phone: "911" },
];

function enrichCommunity(c: any, fireCentre?: string): CommunityData {
  const ics: ICSRow[] = [];
  if (typeof fireCentre === 'string' && FIRE_CENTRE_CONTACTS[fireCentre]) {
    ics.push(FIRE_CENTRE_CONTACTS[fireCentre]);
  }
  ics.push({ org: "Emergency Management BC", phone: "1-800-663-3456" });
  ics.push({ org: "RCMP Non-Emergency", phone: "250-310-1122" });

  return {
    id: c.id, name: c.name, type: c.type, population: c.population || 0,
    lat: c.lat, lng: c.lng, distanceKm: c.distanceKm,
    fireZone: typeof fireCentre === 'string' ? fireCentre.replace(' Fire Centre', '') : '',
    threat: 'proximity' as ThreatLevel,
    evac: { status: 'none', label: 'PROXIMITY', since: null, by: null, zones: 'No evac in effect — monitor' },
    contacts: {
      rcmp: { name: "RCMP Non-Emergency Line", phone: "250-310-1122" },
      hospital: { name: "HealthLink BC", phone: "8-1-1" },
    },
    firstNation: undefined,
    ics,
    infrastructure: STANDARD_INFRASTRUCTURE,
    sections: {
      terrainWeather: `Check Environment Canada forecast for ${c.name} area. Monitor BCWS fire behaviour updates.`,
      water: `Identify local water sources. Check with community for hydrant access or natural draft points.`,
      staging: `Confirm staging areas with local fire department or EOC. Check road access before committing resources.`,
    },
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function threatStyle(threat: ThreatLevel) {
  if (threat === 'order') return { dot: '#ff3333', badgeBg: '#ffe2e0', badgeFg: '#c01515', badgeText: 'EVAC ORDER', border: '#ff3333' };
  if (threat === 'alert') return { dot: '#ffa500', badgeBg: '#fff0d3', badgeFg: '#a06400', badgeText: 'EVAC ALERT', border: '#ffa500' };
  return { dot: '#0066cc', badgeBg: '#e2eefb', badgeFg: '#0058b0', badgeText: 'PROXIMITY', border: '#0066cc' };
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function generateKML(
  community: CommunityData,
  fire: FireData | null,
  extras?: {
    fireHalls?: Array<{ name: string; locality: string; phone: string | null; chief: string | null; lat: number; lng: number; distanceKm: number }>;
    waterSources?: Array<{ name: string; type: string; distanceKm: number; accessNotes: string; lat: number; lng: number }>;
    weather?: { temp?: string; wind?: string; rh?: string; condition?: string; warnings: string[]; forecast: Array<{ day: string; summary: string }> } | null;
    terrain?: { becZone?: string; becSubzone?: string; becLabel?: string; fuelTypeCode?: string; fuelTypeLabel?: string; ndtFireRisk?: string; elevationM?: number } | null;
  }
): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const halls = extras?.fireHalls || [];
  const water = extras?.waterSources || [];
  const wx = extras?.weather;
  const terr = extras?.terrain;

  let communityDesc = `<b>${esc(community.name)}</b><br/>Pop: ${community.population || 'Unknown'} · ${community.distanceKm ?? '?'} km from fire<br/>Type: ${esc(community.type)}`;
  if (terr) {
    communityDesc += `<br/><br/><b>Terrain &amp; Fuel</b>`;
    if (terr.elevationM != null) communityDesc += `<br/>Elevation: ${terr.elevationM}m`;
    if (terr.becLabel) communityDesc += `<br/>BEC Zone: ${esc(terr.becLabel)}`;
    if (terr.becZone) communityDesc += ` (${esc(terr.becZone)}${terr.becSubzone ? ' — ' + esc(terr.becSubzone) : ''})`;
    if (terr.fuelTypeCode) communityDesc += `<br/>Fuel: ${esc(terr.fuelTypeCode)}${terr.fuelTypeLabel ? ' (' + esc(terr.fuelTypeLabel) + ')' : ''}`;
    if (terr.ndtFireRisk) communityDesc += `<br/>Fire Regime: ${esc(terr.ndtFireRisk)}`;
  }
  if (wx) {
    communityDesc += `<br/><br/><b>Weather</b>`;
    if (wx.condition) communityDesc += `<br/>${esc(wx.condition)}`;
    if (wx.temp) communityDesc += ` · ${esc(wx.temp)}`;
    if (wx.wind) communityDesc += `<br/>Wind: ${esc(wx.wind)}`;
    if (wx.rh) communityDesc += ` · RH: ${esc(wx.rh)}`;
    if (wx.warnings.length > 0) communityDesc += `<br/>⚠ ${esc(wx.warnings.join(' · '))}`;
    wx.forecast.slice(0, 3).forEach(f => { communityDesc += `<br/>${esc(f.day)}: ${esc(f.summary)}`; });
  }

  const hallPlacemarks = halls.map(h => `  <Placemark>
    <name>🚒 ${esc(h.name)}</name>
    <description>${esc(h.locality)} · ${h.distanceKm} km${h.phone ? '\nPhone: ' + esc(h.phone) : ''}${h.chief ? '\nChief: ' + esc(h.chief) : ''}</description>
    <Style><IconStyle><color>ff0055ff</color><scale>0.8</scale></IconStyle></Style>
    <Point><coordinates>${h.lng},${h.lat},0</coordinates></Point>
  </Placemark>`).join('\n');

  const waterFolder = water.length > 0 ? `  <Folder>
    <name>Water Sources</name>
${water.map(w => `    <Placemark>
      <name>💧 ${esc(w.name)}</name>
      <description>${esc(w.type)} · ${w.distanceKm} km\n${esc(w.accessNotes)}</description>
      <Style><IconStyle><color>ffff6600</color><scale>0.7</scale></IconStyle></Style>
      <Point><coordinates>${w.lng},${w.lat},0</coordinates></Point>
    </Placemark>`).join('\n')}
  </Folder>` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
  <name>${esc(community.name)} — SPS Briefing</name>
  <description>Generated ${new Date().toLocaleDateString('en-CA')} for ${fire ? esc(fire.id + ' ' + fire.name) : 'Unknown fire'}</description>
  <Placemark>
    <name>${esc(community.name)}</name>
    <description><![CDATA[${communityDesc}]]></description>
    <Style><IconStyle><color>ff00aaff</color><scale>1.2</scale></IconStyle></Style>
    <Point><coordinates>${community.lng},${community.lat},0</coordinates></Point>
  </Placemark>
  ${fire ? `<Placemark>
    <name>${esc(fire.id)} ${esc(fire.name)}</name>
    <description>${fire.sizeHa} ha · ${esc(fire.status)}</description>
    <Style><PolyStyle><color>440000ff</color></PolyStyle><LineStyle><color>ff0000ff</color><width>2</width></LineStyle></Style>
    <Polygon><outerBoundaryIs><LinearRing><coordinates>${fire.perimeter.map(p => `${p[1]},${p[0]},0`).join(' ')}</coordinates></LinearRing></outerBoundaryIs></Polygon>
  </Placemark>` : ''}
${hallPlacemarks}
${waterFolder}
</Document>
</kml>`;
}

function downloadKML(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/vnd.google-earth.kml+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Inline Styles ───────────────────────────────────────────────────────────

const FONT_SANS = "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif";
const FONT_MONO = "'IBM Plex Mono', monospace";

const S = {
  page: {
    fontFamily: FONT_SANS,
    background: '#eef0f2',
    color: '#16181d',
    minHeight: '100vh',
    fontSize: 15,
    lineHeight: 1.55,
  } as React.CSSProperties,
  // lookup screen
  lookupWrap: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '24px 16px',
  } as React.CSSProperties,
  lookupInner: {
    width: '100%',
    maxWidth: 560,
    textAlign: 'center' as const,
  } as React.CSSProperties,
  iconBox: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56,
    borderRadius: 14,
    background: '#0066cc',
    marginBottom: 20,
  } as React.CSSProperties,
  eyebrow: {
    fontFamily: FONT_SANS,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.14em',
    textTransform: 'uppercase' as const,
    color: '#8a939c',
    marginBottom: 6,
  } as React.CSSProperties,
  h1: {
    fontFamily: FONT_SANS,
    fontSize: 35,
    fontWeight: 700,
    color: '#16181d',
    margin: '0 0 6px',
    lineHeight: 1.15,
  } as React.CSSProperties,
  subtitle: {
    fontFamily: FONT_SANS,
    fontSize: 16,
    color: '#5b6570',
    margin: '0 0 32px',
  } as React.CSSProperties,
  card: {
    background: '#fff',
    border: '1px solid #e1e5e9',
    borderRadius: 16,
    padding: '28px 28px 24px',
    textAlign: 'left' as const,
  } as React.CSSProperties,
  label: {
    fontFamily: FONT_MONO,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: '#5b6570',
    display: 'block',
    marginBottom: 8,
  } as React.CSSProperties,
  inputRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 0,
  } as React.CSSProperties,
  input: {
    fontFamily: FONT_MONO,
    fontSize: 15,
    fontWeight: 500,
    padding: '10px 14px',
    border: '1px solid #d1d5db',
    borderRadius: 9,
    flex: 1,
    outline: 'none',
    background: '#fafbfc',
    color: '#16181d',
    transition: 'border-color 0.15s',
  } as React.CSSProperties,
  inputRegular: {
    fontFamily: FONT_SANS,
    fontSize: 15,
    fontWeight: 400,
    padding: '10px 14px',
    border: '1px solid #d1d5db',
    borderRadius: 9,
    flex: 1,
    outline: 'none',
    background: '#fafbfc',
    color: '#16181d',
    transition: 'border-color 0.15s',
  } as React.CSSProperties,
  btnPrimary: {
    fontFamily: FONT_SANS,
    fontSize: 14,
    fontWeight: 600,
    padding: '10px 20px',
    background: '#0066cc',
    color: '#fff',
    border: 'none',
    borderRadius: 9,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    whiteSpace: 'nowrap' as const,
    transition: 'background 0.15s',
  } as React.CSSProperties,
  btnPrimaryDisabled: {
    fontFamily: FONT_SANS,
    fontSize: 14,
    fontWeight: 600,
    padding: '10px 20px',
    background: '#a0c4e8',
    color: '#fff',
    border: 'none',
    borderRadius: 9,
    cursor: 'not-allowed',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    margin: '22px 0',
    color: '#9aa3ab',
    fontSize: 13,
  } as React.CSSProperties,
  dividerLine: {
    flex: 1,
    height: 1,
    background: '#e1e5e9',
  } as React.CSSProperties,
  tagline: {
    fontFamily: FONT_SANS,
    fontSize: 13,
    color: '#9aa3ab',
    marginTop: 20,
    textAlign: 'center' as const,
  } as React.CSSProperties,
  // map screen
  mapContainer: {
    position: 'relative' as const,
    width: '100%',
    height: '100vh',
  } as React.CSSProperties,
  mapBackBtn: {
    position: 'absolute' as const,
    top: 16,
    left: 16,
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  } as React.CSSProperties,
  mapBackCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    background: '#fff',
    border: '1px solid #e1e5e9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
  } as React.CSSProperties,
  mapInfoCard: {
    background: '#fff',
    border: '1px solid #e1e5e9',
    borderRadius: 12,
    padding: '12px 18px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
    maxWidth: 320,
  } as React.CSSProperties,
  mapBottomPanel: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'center',
    padding: '0 16px 16px',
    pointerEvents: 'none' as const,
  } as React.CSSProperties,
  mapPanel: {
    background: '#fff',
    border: '1px solid #e1e5e9',
    borderRadius: 16,
    padding: '20px 24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
    maxWidth: 780,
    width: '100%',
    pointerEvents: 'auto' as const,
    maxHeight: '40vh',
    overflowY: 'auto' as const,
  } as React.CSSProperties,
  mapPanelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  } as React.CSSProperties,
  chipRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 8,
    marginBottom: 12,
  } as React.CSSProperties,
  fireChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: '#fff5f5',
    border: '1px solid #ffccc7',
    borderRadius: 10,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 500,
  } as React.CSSProperties,
  communityChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: '#f7f8fa',
    border: '1px solid #e1e5e9',
    borderRadius: 10,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 500,
  } as React.CSSProperties,
  chipRemove: {
    width: 18,
    height: 18,
    borderRadius: 9,
    background: '#e8eaed',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    color: '#5b6570',
    padding: 0,
    lineHeight: 1,
  } as React.CSSProperties,
  manualRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 14,
  } as React.CSSProperties,
  generateBtn: {
    fontFamily: FONT_SANS,
    fontSize: 15,
    fontWeight: 600,
    padding: '12px 28px',
    background: '#0066cc',
    color: '#fff',
    border: 'none',
    borderRadius: 11,
    cursor: 'pointer',
    width: '100%',
    transition: 'background 0.15s',
  } as React.CSSProperties,
  generateBtnDisabled: {
    fontFamily: FONT_SANS,
    fontSize: 15,
    fontWeight: 600,
    padding: '12px 28px',
    background: '#a0c4e8',
    color: '#fff',
    border: 'none',
    borderRadius: 11,
    cursor: 'not-allowed',
    width: '100%',
  } as React.CSSProperties,
  darkPill: {
    position: 'absolute' as const,
    top: 72,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1000,
    background: '#16181d',
    color: '#fff',
    borderRadius: 20,
    padding: '8px 20px',
    fontSize: 13,
    fontWeight: 500,
    whiteSpace: 'nowrap' as const,
    boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
  } as React.CSSProperties,
  // dashboard screen
  dashHeader: {
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
    background: '#fff',
    borderBottom: '1px solid #e1e5e9',
    padding: '14px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  } as React.CSSProperties,
  dashHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  } as React.CSSProperties,
  dashHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  } as React.CSSProperties,
  dashFireIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    background: '#0066cc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as React.CSSProperties,
  layoutBtn: (active: boolean) => ({
    fontFamily: FONT_SANS,
    fontSize: 13,
    fontWeight: 500,
    padding: '6px 14px',
    background: active ? '#0066cc' : '#f0f2f5',
    color: active ? '#fff' : '#5b6570',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.15s',
  } as React.CSSProperties),
  newSearchBtn: {
    fontFamily: FONT_SANS,
    fontSize: 13,
    fontWeight: 500,
    padding: '6px 14px',
    background: '#fff',
    color: '#5b6570',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    cursor: 'pointer',
  } as React.CSSProperties,
  dashBody: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '24px 20px 60px',
  } as React.CSSProperties,
  summaryBar: (color: string, isExpanded: boolean) => ({
    background: '#fff',
    border: '1px solid #e1e5e9',
    borderRadius: 12,
    marginBottom: 10,
    borderLeft: `4px solid ${color}`,
    overflow: 'hidden' as const,
    cursor: 'pointer',
    transition: 'box-shadow 0.15s',
    boxShadow: isExpanded ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
  } as React.CSSProperties),
  summaryBarHeader: {
    padding: '14px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  } as React.CSSProperties,
  summaryBarExpanded: {
    padding: '0 20px 16px',
    borderTop: '1px solid #f0f2f5',
  } as React.CSSProperties,
  fonBadge: {
    fontFamily: FONT_MONO,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.06em',
    background: '#fff0d3',
    color: '#a06400',
    padding: '2px 8px',
    borderRadius: 6,
    textTransform: 'uppercase' as const,
  } as React.CSSProperties,
  communityCard: (threat: ThreatLevel, layout: 1 | 2 | 3) => {
    const ts = threatStyle(threat);
    const base: React.CSSProperties = {
      background: '#fff',
      border: '1px solid #e1e5e9',
      borderLeft: `4px solid ${ts.border}`,
      borderRadius: layout === 3 ? 0 : 12,
      padding: '20px 22px',
      marginBottom: layout === 3 ? 0 : 14,
    };
    if (layout === 2) base.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
    if (layout === 3) { base.borderBottom = 'none'; base.border = '1px solid #e1e5e9'; base.borderLeft = `4px solid ${ts.border}`; }
    return base;
  },
  contactGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 10,
    marginTop: 14,
  } as React.CSSProperties,
  contactCell: {
    background: '#f7f8fa',
    borderRadius: 8,
    padding: '10px 12px',
  } as React.CSSProperties,
  contactLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#8a939c',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
    marginBottom: 2,
  } as React.CSSProperties,
  contactName: {
    fontSize: 13,
    fontWeight: 500,
    color: '#16181d',
    marginBottom: 1,
  } as React.CSSProperties,
  phoneLink: {
    fontFamily: FONT_MONO,
    fontSize: 13,
    fontWeight: 500,
    color: '#0066cc',
    textDecoration: 'none',
  } as React.CSSProperties,
  viewBriefBtn: {
    fontFamily: FONT_SANS,
    fontSize: 13,
    fontWeight: 600,
    padding: '8px 18px',
    background: '#0066cc',
    color: '#fff',
    border: 'none',
    borderRadius: 9,
    cursor: 'pointer',
    marginRight: 8,
  } as React.CSSProperties,
  kmlBtn: {
    fontFamily: FONT_SANS,
    fontSize: 13,
    fontWeight: 500,
    padding: '8px 18px',
    background: '#f0f2f5',
    color: '#5b6570',
    border: '1px solid #d1d5db',
    borderRadius: 9,
    cursor: 'pointer',
  } as React.CSSProperties,
  communityGridWrap: (layout: 1 | 2 | 3) => {
    if (layout === 2) return { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 } as React.CSSProperties;
    return {} as React.CSSProperties;
  },
  // detail screen
  detailHeader: {
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
    background: '#fff',
    borderBottom: '1px solid #e1e5e9',
    padding: '14px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  } as React.CSSProperties,
  detailBack: {
    width: 36,
    height: 36,
    borderRadius: 18,
    background: '#f0f2f5',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as React.CSSProperties,
  detailBody: {
    maxWidth: 860,
    margin: '0 auto',
    padding: '28px 20px 60px',
  } as React.CSSProperties,
  sectionBlock: (accentColor: string) => ({
    background: '#fff',
    border: '1px solid #e1e5e9',
    borderRadius: 12,
    marginBottom: 16,
    borderLeft: `4px solid ${accentColor}`,
    overflow: 'hidden' as const,
  } as React.CSSProperties),
  sectionTitle: {
    fontFamily: FONT_SANS,
    fontSize: 14,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    color: '#5b6570',
    padding: '16px 20px 10px',
  } as React.CSSProperties,
  sectionContent: {
    padding: '0 20px 18px',
  } as React.CSSProperties,
  fnCard: {
    background: '#f0f7f0',
    border: '1px solid #c8e6c8',
    borderRadius: 10,
    padding: '14px 16px',
    marginTop: 12,
  } as React.CSSProperties,
  fnTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#16181d',
    marginBottom: 4,
  } as React.CSSProperties,
  fnPron: {
    fontFamily: FONT_MONO,
    fontSize: 12,
    color: '#5b6570',
    marginBottom: 6,
  } as React.CSSProperties,
  fnDetail: {
    fontSize: 13,
    color: '#5b6570',
    marginBottom: 2,
  } as React.CSSProperties,
  tableRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid #f0f2f5',
  } as React.CSSProperties,
  collapsibleHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    cursor: 'pointer',
    background: '#fafbfc',
    borderTop: '1px solid #f0f2f5',
  } as React.CSSProperties,
  collapsibleBody: {
    padding: '0 20px 16px',
    fontSize: 14,
    color: '#5b6570',
    lineHeight: 1.7,
  } as React.CSSProperties,
  evacBadge: (threat: ThreatLevel) => {
    const ts = threatStyle(threat);
    return {
      fontFamily: FONT_MONO,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.04em',
      background: ts.badgeBg,
      color: ts.badgeFg,
      padding: '3px 10px',
      borderRadius: 6,
      display: 'inline-block',
    } as React.CSSProperties;
  },
  bottomBar: {
    display: 'flex',
    gap: 10,
    justifyContent: 'center',
    padding: '20px 0',
  } as React.CSSProperties,
  printBtn: {
    fontFamily: FONT_SANS,
    fontSize: 14,
    fontWeight: 500,
    padding: '10px 22px',
    background: '#fff',
    color: '#5b6570',
    border: '1px solid #d1d5db',
    borderRadius: 9,
    cursor: 'pointer',
  } as React.CSSProperties,
};

// ─── SVG Icons ───────────────────────────────────────────────────────────────

const FlameIcon = ({ size = 24, color = '#fff' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C12 2 6 8.5 6 13.5C6 17.09 8.69 20 12 20C15.31 20 18 17.09 18 13.5C18 8.5 12 2 12 2ZM12 18C9.79 18 8 16.21 8 14C8 11.58 10.22 7.89 12 5.56C13.78 7.89 16 11.58 16 14C16 16.21 14.21 18 12 18Z" fill={color}/>
    <path d="M12 16C13.1 16 14 15.1 14 14C14 12.63 12 10 12 10C12 10 10 12.63 10 14C10 15.1 10.9 16 12 16Z" fill={color}/>
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="2"/>
    <line x1="10.5" y1="10.5" x2="14" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const LocationIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 1C5.24 1 3 3.24 3 6C3 9.75 8 15 8 15C8 15 13 9.75 13 6C13 3.24 10.76 1 8 1ZM8 8C6.9 8 6 7.1 6 6C6 4.9 6.9 4 8 4C9.1 4 10 4.9 10 6C10 7.1 9.1 8 8 8Z" fill="currentColor"/>
  </svg>
);

const BackArrow = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 4L6 9L11 14" stroke="#16181d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ChevronDown = ({ open }: { open: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
    <path d="M4 6L8 10L12 6" stroke="#8a939c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M2 6L5 9L10 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const TentIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 2L1 14H15L8 2Z" stroke="#fff" strokeWidth="1.5" fill="none"/>
    <line x1="8" y1="2" x2="8" y2="14" stroke="#fff" strokeWidth="1.5"/>
  </svg>
);

// ─── Print Styles ────────────────────────────────────────────────────────────

const PRINT_CSS = `
@media print {
  .sps-noprint { display: none !important; }
  body { background: #fff !important; }
  * { box-shadow: none !important; }
}
`;

// ─── Subcomponents ───────────────────────────────────────────────────────────

function PhoneLink({ phone }: { phone: string }) {
  const digits = phone.replace(/[^\d+]/g, '');
  const isPhone = /^[\d\-+() ]+$/.test(phone);
  if (!isPhone) return <span style={{ ...S.phoneLink, color: '#5b6570' }}>{phone}</span>;
  return <a href={`tel:${digits}`} style={S.phoneLink}>{phone}</a>;
}

function EvacBadge({ threat }: { threat: ThreatLevel }) {
  const ts = threatStyle(threat);
  return <span style={S.evacBadge(threat)}>{ts.badgeText}</span>;
}

function ContactCell({ label, contact }: { label: string; contact?: CommunityContact }) {
  if (!contact) return null;
  return (
    <div style={S.contactCell}>
      <div style={S.contactLabel}>{label}</div>
      <div style={S.contactName}>{contact.name}</div>
      <PhoneLink phone={contact.phone} />
    </div>
  );
}

// ─── Section Labels for Community ────────────────────────────────────────────

const SECTION_LABELS: Record<string, string> = {
  airSupport: "Air Support & Landing",
  staging: "Staging Areas",
  fuelMechanical: "Fuel & Mechanical",
  water: "Water Supply",
  terrainWeather: "Terrain & Weather Factors",
  accommodations: "Accommodations",
  grocery: "Grocery & Supplies",
};

// ─── Main Component ──────────────────────────────────────────────────────────

function SPSBriefingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [screen, setScreen] = useState<Screen>('lookup');
  const [entryMode, setEntryMode] = useState<EntryMode>(null);
  const [fireInput, setFireInput] = useState('');
  const [campInput, setCampInput] = useState('');
  const [campLocation, setCampLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedFireId, setSelectedFireId] = useState<string | null>(null);
  const [selectedCommunityIds, setSelectedCommunityIds] = useState<string[]>([]);
  const [manualCommunities, setManualCommunities] = useState<CommunityData[]>([]);
  const [manualInput, setManualInput] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [dashboardLook, setDashboardLook] = useState<1 | 2 | 3>(1);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [liveFires, setLiveFires] = useState<FireData[]>([]);
  const [liveCommunities, setLiveCommunities] = useState<CommunityData[]>([]);
  const [roadEvents, setRoadEvents] = useState<Array<{ roadName: string; description: string; severity: string; eventType: string }>>([]);
  const [weatherData, setWeatherData] = useState<{ temp?: string; wind?: string; rh?: string; condition?: string; warnings: string[]; forecast: Array<{ day: string; summary: string }> } | null>(null);
  const [newsArticles, setNewsArticles] = useState<Array<{ title: string; link: string; source: string; published: string }>>([]);
  const [nearbyFireHalls, setNearbyFireHalls] = useState<Array<{ name: string; address: string; locality: string; phone: string | null; chief: string | null; website: string | null; lat: number; lng: number; distanceKm: number }>>([]);
  const [detailWeather, setDetailWeather] = useState<{ temp?: string; wind?: string; rh?: string; condition?: string; warnings: string[]; forecast: Array<{ day: string; summary: string }> } | null>(null);
  const [terrainData, setTerrainData] = useState<{ becZone?: string; becSubzone?: string; becLabel?: string; naturalDisturbance?: string; ndtFireRisk?: string; fuelTypeCode?: string; fuelTypeLabel?: string; elevationM?: number } | null>(null);
  const [waterSources, setWaterSources] = useState<Array<{ name: string; type: string; distanceKm: number; accessNotes: string; lat: number; lng: number }>>([]);

  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Auth check
  useEffect(() => {
    const exp = parseInt(sessionStorage.getItem("wb_auth_exp") || localStorage.getItem("wb_auth_exp") || "0");
    if (exp < Date.now()) {
      const redirect = encodeURIComponent(window.location.pathname + window.location.search);
      router.push(`/?redirect=${redirect}`);
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  // Font loading
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const existing = document.querySelector('link[href*="IBM+Plex"]');
    if (!existing) {
      const pre1 = document.createElement('link');
      pre1.rel = 'preconnect';
      pre1.href = 'https://fonts.googleapis.com';
      document.head.appendChild(pre1);
      const pre2 = document.createElement('link');
      pre2.rel = 'preconnect';
      pre2.href = 'https://fonts.gstatic.com';
      pre2.crossOrigin = 'anonymous';
      document.head.appendChild(pre2);
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  // Derived data
  const activeFires = liveFires;
  const baseCommunities = liveCommunities;
  const selectedFire = activeFires.find(f => f.id === selectedFireId) || null;
  const allCommunities = [...baseCommunities, ...manualCommunities];
  const selectedCommunities = allCommunities.filter(c => selectedCommunityIds.includes(c.id));
  const detailCommunity = allCommunities.find(c => c.id === detailId) || null;

  // Toggle helpers
  const toggleExpand = useCallback((key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const toggleCommunity = useCallback((id: string) => {
    setSelectedCommunityIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const handleFireSearch = async () => {
    const q = fireInput.trim().toUpperCase();
    if (!q) {
      setSearchError('Enter a fire number (e.g. K20570)');
      return;
    }
    setIsSearching(true);
    setSearchError('');
    try {
      const res = await fetch('/api/fires/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fireNumber: q }),
      });
      if (!res.ok) {
        const err = await res.json();
        setSearchError(err.error || `Fire ${q} not found`);
        setIsSearching(false);
        return;
      }
      const { fire } = await res.json();
      // Fetch perimeter
      let perimeter: [number, number][] = [];
      try {
        const perimRes = await fetch('/api/fires/perimeter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fireNumber: q }),
        });
        if (perimRes.ok) {
          const pd = await perimRes.json();
          if (pd.perimeter) perimeter = pd.perimeter;
        }
      } catch { /* perimeter is optional */ }
      // Fetch nearby fires for context
      const nearbyRes = await fetch('/api/fires/nearby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: fire.lat, longitude: fire.lng, radiusKm: 80 }),
      });
      const nearbyData = nearbyRes.ok ? await nearbyRes.json() : { fires: [] };
      // Convert API fires to our FireData format
      const lf: FireData[] = nearbyData.fires.map((f: any) => ({
        id: f.fireNumber,
        name: f.name,
        sizeHa: f.size,
        status: f.status,
        fireOfNote: f.isFireOfNote,
        discovered: '',
        cause: f.cause || 'Unknown',
        centre: f.fireCentre || '',
        lat: f.lat,
        lng: f.lng,
        growth: '',
        resources: '',
        perimeter: f.fireNumber === q ? perimeter : [],
      }));
      // Ensure the searched fire is in the list
      if (!lf.find(f => f.id === q)) {
        lf.unshift({
          id: fire.fireNumber, name: fire.name, sizeHa: fire.size, status: fire.status,
          fireOfNote: fire.isFireOfNote, discovered: '', cause: fire.cause || 'Unknown',
          centre: fire.fireCentre || '', lat: fire.lat, lng: fire.lng,
          growth: '', resources: '', perimeter,
        });
      } else {
        // Attach perimeter to the matched fire
        const idx = lf.findIndex(f => f.id === q);
        if (idx >= 0) lf[idx].perimeter = perimeter;
      }
      setLiveFires(lf);
      setSelectedFireId(q);
      setEntryMode('fire');
      setSelectedCommunityIds([]);
      // Fetch nearby communities
      fetch('/api/communities/nearby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: fire.lat, longitude: fire.lng, radiusKm: 50 }),
      })
        .then(r => r.ok ? r.json() : { communities: [] })
        .then(d => {
          const comms: CommunityData[] = (d.communities || []).map((c: any) => enrichCommunity(c, fire.fireCentre || fire.centre));
          setLiveCommunities(comms);
        })
        .catch((err) => { console.error('Community fetch error:', err); setLiveCommunities([]); });
      setScreen('map');
    } catch (e) {
      console.error('Fire search error:', e);
      setSearchError('Failed to look up fire. Try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleCampSearch = async () => {
    const q = campInput.trim();
    if (!q) {
      setSearchError('Enter a camp location (e.g. Burns Lake)');
      return;
    }
    setIsSearching(true);
    setSearchError('');
    try {
      // Geocode the camp location
      const geoRes = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: q }),
      });
      if (!geoRes.ok) {
        setSearchError('Could not find that location in BC');
        setIsSearching(false);
        return;
      }
      const geoData = await geoRes.json();
      const lat = geoData.latitude;
      const lng = geoData.longitude;
      // Fetch nearby fires
      const nearbyRes = await fetch('/api/fires/nearby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lng, radiusKm: 50 }),
      });
      const nearbyData = nearbyRes.ok ? await nearbyRes.json() : { fires: [] };
      const lf: FireData[] = nearbyData.fires.map((f: any) => ({
        id: f.fireNumber, name: f.name, sizeHa: f.size, status: f.status,
        fireOfNote: f.isFireOfNote, discovered: '', cause: f.cause || 'Unknown',
        centre: f.fireCentre || '', lat: f.lat, lng: f.lng,
        growth: '', resources: '', perimeter: [],
      }));
      setLiveFires(lf);
      setCampLocation({ lat, lng });
      setEntryMode('camp');
      setSelectedFireId(null);
      setSelectedCommunityIds([]);
      // Fetch nearby communities
      fetch('/api/communities/nearby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lng, radiusKm: 50 }),
      })
        .then(r => r.ok ? r.json() : { communities: [] })
        .then(d => {
          const comms: CommunityData[] = (d.communities || []).map((c: any) => enrichCommunity(c));
          setLiveCommunities(comms);
        })
        .catch(() => setLiveCommunities([]));
      setScreen('map');
    } catch {
      setSearchError('Search failed. Try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddManual = () => {
    const name = manualInput.trim();
    if (!name) return;
    const id = 'manual-' + name.toLowerCase().replace(/\s+/g, '-');
    if (allCommunities.find(c => c.id === id)) return;
    const manual: CommunityData = {
      id,
      name,
      type: 'Manual entry',
      population: null,
      lat: 0,
      lng: 0,
      distanceKm: null,
      fireZone: 'Unknown',
      threat: 'proximity',
      evac: { status: 'none', label: 'Unknown', since: null, by: null, zones: 'N/A' },
      contacts: {},
      ics: [],
      infrastructure: [],
      sections: {},
      manual: true,
    };
    setManualCommunities(prev => [...prev, manual]);
    setSelectedCommunityIds(prev => [...prev, id]);
    setManualInput('');
  };

  const handleGenerate = () => {
    if (!selectedFireId) return;
    if (selectedCommunityIds.length <= 1) {
      const target = selectedCommunityIds.length === 1
        ? selectedCommunityIds[0]
        : liveCommunities[0]?.id || null;
      if (target) {
        setDetailId(target);
        setScreen('detail');
      } else {
        setScreen('dashboard');
      }
    } else {
      setScreen('dashboard');
    }
  };

  // ─── Fetch summary data when dashboard loads ────────────────────────────
  useEffect(() => {
    if (screen !== 'dashboard') return;
    const fire = activeFires.find(f => f.id === selectedFireId);
    if (!fire) return;

    // Fetch road events near the fire
    fetch('/api/road-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude: fire.lat, longitude: fire.lng, radiusKm: 80 }),
    })
      .then(r => r.ok ? r.json() : { events: [] })
      .then(d => setRoadEvents(d.events || []))
      .catch(() => setRoadEvents([]));

    // Fetch weather near the fire
    fetch('/api/weather', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude: fire.lat, longitude: fire.lng }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d || d.error) { setWeatherData(null); return; }
        setWeatherData({
          temp: d.current?.temperature != null ? `${d.current.temperature}°C` : undefined,
          wind: d.current?.wind || undefined,
          rh: d.current?.humidity != null ? `RH ${d.current.humidity}%` : undefined,
          condition: d.current?.condition || undefined,
          warnings: d.warnings || [],
          forecast: d.forecast || [],
        });
      })
      .catch(() => setWeatherData(null));
  }, [screen, selectedFireId, activeFires]);

  // ─── Fetch local news when detail view loads ──────────────────────────────
  const detailCommunityName = detailCommunity?.name || null;
  const detailCommunityLat = detailCommunity?.lat || null;
  const detailCommunityLng = detailCommunity?.lng || null;
  const selectedFireName = selectedFire?.name || null;
  useEffect(() => {
    if (screen !== 'detail' || !detailId) return;
    setNewsArticles([]);
    setNearbyFireHalls([]);
    setDetailWeather(null);
    setTerrainData(null);
    setWaterSources([]);
    fetch('/api/news/local', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fireNumber: selectedFireId,
        communityName: detailCommunityName,
        fireName: selectedFireName,
      }),
    })
      .then(r => r.ok ? r.json() : { articles: [] })
      .then(d => setNewsArticles(d.articles || []))
      .catch(() => setNewsArticles([]));

    if (detailCommunityLat && detailCommunityLng) {
      fetch('/api/fire-departments/nearby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: detailCommunityLat, longitude: detailCommunityLng, radiusKm: 60 }),
      })
        .then(r => r.ok ? r.json() : { fireHalls: [] })
        .then(d => setNearbyFireHalls(d.fireHalls || []))
        .catch(() => setNearbyFireHalls([]));

      fetch('/api/weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: detailCommunityLat, longitude: detailCommunityLng, community: detailCommunityName }),
      })
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (!d || d.error) { setDetailWeather(null); return; }
          setDetailWeather({
            temp: d.current?.temperature != null ? `${d.current.temperature}°C` : undefined,
            wind: d.current?.wind || undefined,
            rh: d.current?.humidity != null ? `${d.current.humidity}%` : undefined,
            condition: d.current?.condition || undefined,
            warnings: d.warnings || [],
            forecast: d.forecast || [],
          });
        })
        .catch(() => setDetailWeather(null));

      fetch('/api/terrain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: detailCommunityLat, longitude: detailCommunityLng }),
      })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d && !d.error) setTerrainData(d); })
        .catch(() => setTerrainData(null));

      fetch('/api/water-sources/nearby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: detailCommunityLat, longitude: detailCommunityLng, radiusKm: 40 }),
      })
        .then(r => r.ok ? r.json() : { waterSources: [] })
        .then(d => setWaterSources(d.waterSources || []))
        .catch(() => setWaterSources([]));
    }
  }, [screen, detailId, selectedFireId, detailCommunityName, detailCommunityLat, detailCommunityLng, selectedFireName]);

  // ─── Map Effect ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (screen !== 'map' || !mapRef.current) return;
    // Dynamic leaflet import
    let cancelled = false;
    const initMap = async () => {
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      const L = (await import('leaflet')).default;
      if (cancelled || !mapRef.current) return;
      // Clean up previous
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }

      const map = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: true,
      });

      leafletMapRef.current = map;

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19,
      }).addTo(map);

      const bounds: [number, number][] = [];

      // Fire perimeters
      activeFires.forEach(fire => {
        const isSelected = fire.id === selectedFireId;
        if (fire.perimeter.length > 0) {
          L.polygon(fire.perimeter, {
            color: '#ff3b1f',
            weight: isSelected ? 3 : 2,
            fillColor: '#ff3b1f',
            fillOpacity: isSelected ? 0.18 : 0.08,
            dashArray: isSelected ? '' : '6 4',
          }).addTo(map);
          fire.perimeter.forEach(p => bounds.push(p));
        }
        bounds.push([fire.lat, fire.lng]);

        // Fire marker
        const fireIcon = L.divIcon({
          html: `<div style="width:${isSelected ? 32 : 24}px;height:${isSelected ? 32 : 24}px;border-radius:50%;background:#ff3b1f;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer;">
            <svg width="${isSelected ? 16 : 12}" height="${isSelected ? 16 : 12}" viewBox="0 0 24 24" fill="#fff"><path d="M12 2C12 2 6 8.5 6 13.5C6 17.09 8.69 20 12 20C15.31 20 18 17.09 18 13.5C18 8.5 12 2 12 2Z"/></svg>
          </div>`,
          iconSize: [isSelected ? 32 : 24, isSelected ? 32 : 24],
          iconAnchor: [isSelected ? 16 : 12, isSelected ? 16 : 12],
          className: '',
        });

        const marker = L.marker([fire.lat, fire.lng], { icon: fireIcon }).addTo(map);
        marker.bindTooltip(fire.id, { permanent: true, direction: 'top', offset: [0, isSelected ? -18 : -14], className: 'sps-tooltip' });

        if (entryMode === 'camp' && !selectedFireId) {
          marker.on('click', () => {
            setSelectedFireId(fire.id);
          });
        }
      });

      // Camp marker
      if (entryMode === 'camp' && campLocation) {
        const campIcon = L.divIcon({
          html: `<div style="width:28px;height:28px;border-radius:6px;background:#16181d;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2L1 14H15L8 2Z" stroke="#fff" stroke-width="1.5" fill="none"/><line x1="8" y1="2" x2="8" y2="14" stroke="#fff" stroke-width="1.5"/></svg>
          </div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          className: '',
        });
        L.marker([campLocation.lat, campLocation.lng], { icon: campIcon }).addTo(map)
          .bindTooltip('Camp', { permanent: true, direction: 'top', offset: [0, -16], className: 'sps-tooltip' });
        bounds.push([campLocation.lat, campLocation.lng]);
      }

      // Evac zone circles and community markers
      baseCommunities.forEach(community => {
        const isSelected = selectedCommunityIds.includes(community.id);
        const ts = threatStyle(community.threat);

        // Evac zone circle
        if (community.threat === 'order' || community.threat === 'alert') {
          L.circle([community.lat, community.lng], {
            radius: community.threat === 'order' ? 5000 : 3000,
            color: ts.dot,
            weight: 2,
            dashArray: '8 6',
            fillColor: ts.dot,
            fillOpacity: 0.06,
          }).addTo(map);
        }

        // Community marker
        const size = 26;
        const communityIcon = L.divIcon({
          html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${isSelected ? '#0066cc' : '#fff'};border:2px solid ${isSelected ? '#0066cc' : '#d1d5db'};display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.15);">
            ${isSelected ? '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}
          </div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
          className: '',
        });

        const marker = L.marker([community.lat, community.lng], { icon: communityIcon }).addTo(map);
        const showLabel = isSelected || (community.distanceKm ?? 999) <= 30;
        marker.bindTooltip(community.name + (community.distanceKm ? ` · ${community.distanceKm} km` : ''), { permanent: showLabel, direction: 'top', offset: [0, -15], className: 'sps-tooltip' });
        marker.on('click', () => toggleCommunity(community.id));
        bounds.push([community.lat, community.lng]);
      });

      // Fit bounds
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 11 });
        // Adjust for bottom panel
        setTimeout(() => {
          map.panBy([0, -80]);
        }, 300);
      }

      // Add tooltip CSS
      const style = document.createElement('style');
      style.textContent = `
        .sps-tooltip { background: #fff; border: 1px solid #e1e5e9; border-radius: 6px; padding: 3px 8px; font-family: ${FONT_SANS}; font-size: 12px; font-weight: 600; color: #16181d; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
        .sps-tooltip::before { border-top-color: #e1e5e9 !important; }
        ${PRINT_CSS}
      `;
      document.head.appendChild(style);
    };

    initMap();

    return () => {
      cancelled = true;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [screen, selectedFireId, selectedCommunityIds, entryMode, toggleCommunity, activeFires, baseCommunities, campLocation]);

  // ─── Render ────────────────────────────────────────────────────────────

  if (!isAuthenticated) return null;

  // ─── Screen 1: Lookup ──────────────────────────────────────────────────

  if (screen === 'lookup') {
    return (
      <div style={S.page}>
        <style>{PRINT_CSS}</style>
        <div style={S.lookupWrap}>
          <div style={S.lookupInner}>
            <img src="/logo.png" alt="WhistlerBrew" style={{ width: 56, height: 56, borderRadius: 14, marginBottom: 20, display: 'block', margin: '0 auto 20px' }} />
            <div style={S.eyebrow}>WHISTLERBREW &middot; FIRE INTELLIGENCE</div>
            <h1 style={S.h1}>SPS Dispatch Briefing</h1>
            <p style={S.subtitle}>Structure Protection Intelligence System</p>

            <div style={S.card}>
              <label style={S.label}>FIRE / COMPLEX NUMBER</label>
              <div style={S.inputRow}>
                <input
                  type="text"
                  style={S.input}
                  placeholder="e.g. K21456"
                  value={fireInput}
                  onChange={e => setFireInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleFireSearch()}
                />
                <button style={{ ...S.btnPrimary, opacity: isSearching ? 0.6 : 1 }} onClick={handleFireSearch} disabled={isSearching} onMouseOver={e => !isSearching && (e.currentTarget.style.background = '#0055aa')} onMouseOut={e => (e.currentTarget.style.background = '#0066cc')}>
                  <SearchIcon /> {isSearching ? '...' : 'Search'}
                </button>
              </div>

              <div style={S.divider}>
                <div style={S.dividerLine} />
                <span>&mdash; or &mdash;</span>
                <div style={S.dividerLine} />
              </div>

              <label style={S.label}>CAMP LOCATION</label>
              <div style={S.inputRow}>
                <input
                  type="text"
                  style={S.inputRegular}
                  placeholder="e.g. Lakes District Fire Camp, Burns Lake"
                  value={campInput}
                  onChange={e => setCampInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCampSearch()}
                />
                <button style={{ ...S.btnPrimary, opacity: isSearching ? 0.6 : 1 }} onClick={handleCampSearch} disabled={isSearching} onMouseOver={e => !isSearching && (e.currentTarget.style.background = '#0055aa')} onMouseOut={e => (e.currentTarget.style.background = '#0066cc')}>
                  <LocationIcon /> {isSearching ? '...' : 'Search'}
                </button>
              </div>
            </div>

            {searchError && (
              <div style={{ textAlign: 'center', color: '#c01515', fontSize: 15, marginTop: 12, padding: '10px 16px', background: '#fff0ef', borderRadius: 10 }}>
                {searchError}
              </div>
            )}
            {isSearching && (
              <div style={{ textAlign: 'center', color: '#0066cc', fontSize: 15, marginTop: 12 }}>
                Searching BCWS fire data...
              </div>
            )}

            <div style={S.tagline}>
              Community intel &middot; ICS contacts &middot; infrastructure &middot; KML export
              <br />
              <span style={{ fontSize: 13 }}></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Screen 2: Map ─────────────────────────────────────────────────────

  if (screen === 'map') {
    const canGenerate = !!selectedFireId;
    return (
      <div style={S.page}>
        <style>{PRINT_CSS}</style>
        <div style={S.mapContainer}>
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

          {/* Top-left: back + info */}
          <div style={S.mapBackBtn} className="sps-noprint">
            <div style={S.mapBackCircle} onClick={() => { setScreen('lookup'); setEntryMode(null); setSelectedFireId(null); setSelectedCommunityIds([]); }}>
              <BackArrow />
            </div>
            <div style={S.mapInfoCard}>
              <div style={{ ...S.eyebrow, marginBottom: 4, fontSize: 10 }}>
                {entryMode === 'fire' ? 'Fire perimeter' : 'Camp area · active fires'}
              </div>
              <div style={{ fontWeight: 600, fontSize: 16, color: '#16181d' }}>
                {entryMode === 'fire' && selectedFire ? `${selectedFire.id} ${selectedFire.name}` : (campInput || 'Camp Location')}
              </div>
              {entryMode === 'fire' && selectedFire && (
                <div style={{ fontSize: 13, color: '#5b6570', marginTop: 2 }}>
                  {formatNumber(selectedFire.sizeHa)} ha &middot; {selectedFire.status}
                </div>
              )}
            </div>
          </div>

          {/* Dark pill for camp mode */}
          {entryMode === 'camp' && !selectedFireId && (
            <div style={S.darkPill} className="sps-noprint">
              Tap a fire pin to associate it with this briefing
            </div>
          )}

          {/* Bottom panel */}
          <div style={S.mapBottomPanel} className="sps-noprint">
            <div style={S.mapPanel}>
              <div style={S.mapPanelHeader}>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#16181d' }}>Selected for briefing</div>
                <div style={{ fontSize: 13, color: '#8a939c' }}>{selectedCommunityIds.length} / {allCommunities.length} communities</div>
              </div>

              <div style={S.chipRow}>
                {selectedFire && (
                  <div style={S.fireChip}>
                    <div style={{ width: 20, height: 20, borderRadius: 5, background: '#ff3b1f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FlameIcon size={12} color="#fff" />
                    </div>
                    <div>
                      <span style={{ fontWeight: 600 }}>{selectedFire.id}</span>{' '}
                      <span style={{ color: '#5b6570' }}>{selectedFire.name} &middot; {formatNumber(selectedFire.sizeHa)} ha &middot; {selectedFire.status}</span>
                    </div>
                  </div>
                )}

                {selectedCommunities.map(c => {
                  const ts = threatStyle(c.threat);
                  return (
                    <div key={c.id} style={S.communityChip}>
                      <div style={{ width: 8, height: 8, borderRadius: 4, background: ts.dot, flexShrink: 0 }} />
                      <span>{c.name}</span>
                      <span style={S.evacBadge(c.threat)}>{ts.badgeText}</span>
                      <button style={S.chipRemove} onClick={() => toggleCommunity(c.id)}>&times;</button>
                    </div>
                  );
                })}
              </div>

              <div style={S.manualRow}>
                <input
                  type="text"
                  style={{ ...S.inputRegular, fontSize: 13 }}
                  placeholder="Add community manually..."
                  value={manualInput}
                  onChange={e => setManualInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddManual()}
                />
                <button style={{ ...S.btnPrimary, fontSize: 13, padding: '8px 16px' }} onClick={handleAddManual}>Add</button>
              </div>

              <button
                style={canGenerate ? S.generateBtn : S.generateBtnDisabled}
                onClick={handleGenerate}
                disabled={!canGenerate}
                onMouseOver={e => { if (canGenerate) e.currentTarget.style.background = '#0055aa'; }}
                onMouseOut={e => { if (canGenerate) e.currentTarget.style.background = '#0066cc'; }}
              >
                Generate Briefing
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Screen 3: Dashboard ──────────────────────────────────────────────

  if (screen === 'dashboard') {
    return (
      <div style={S.page}>
        <style>{PRINT_CSS}</style>

        {/* Header */}
        <div style={S.dashHeader} className="sps-noprint">
          <div style={S.dashHeaderLeft}>
            <img src="/logo.png" alt="WhistlerBrew" style={{ width: 36, height: 36, borderRadius: 8 }} />
            <div>
              <div style={{ ...S.eyebrow, marginBottom: 0, fontSize: 10 }}>Dispatch Briefing</div>
              <div style={{ fontWeight: 600, fontSize: 17, color: '#16181d' }}>
                {selectedFire ? `${selectedFire.id} ${selectedFire.name}` : 'Briefing'}
              </div>
            </div>
          </div>
          <div style={S.dashHeaderRight}>
            <button style={S.layoutBtn(dashboardLook === 1)} onClick={() => setDashboardLook(1)}>Stacked</button>
            <button style={S.layoutBtn(dashboardLook === 2)} onClick={() => setDashboardLook(2)}>Grid</button>
            <button style={S.layoutBtn(dashboardLook === 3)} onClick={() => setDashboardLook(3)}>Sheet</button>
            <button style={S.newSearchBtn} onClick={() => { setScreen('lookup'); setEntryMode(null); setSelectedFireId(null); setSelectedCommunityIds([]); setExpanded({}); }}>
              New Search
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={S.dashBody}>
          {/* Fire summary bar */}
          {selectedFire && (
            <div style={S.summaryBar('#ff3b1f', !!expanded['fire'])} onClick={() => toggleExpand('fire')}>
              <div style={S.summaryBarHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                  <FlameIcon size={18} color="#ff3b1f" />
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{selectedFire.id}</span>
                  <span style={{ color: '#5b6570', fontSize: 14 }}>{formatNumber(selectedFire.sizeHa)} ha &middot; {selectedFire.status}</span>
                  {selectedFire.fireOfNote && <span style={S.fonBadge}>Fire of Note</span>}
                </div>
                <ChevronDown open={!!expanded['fire']} />
              </div>
              {expanded['fire'] && (
                <div style={S.summaryBarExpanded} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, paddingTop: 12 }}>
                    {[
                      ['Discovered', selectedFire.discovered],
                      ['Cause', selectedFire.cause],
                      ['Centre', selectedFire.centre],
                      ['Growth', selectedFire.growth],
                      ['Resources', selectedFire.resources],
                      ['Location', `${selectedFire.lat.toFixed(3)}°N, ${Math.abs(selectedFire.lng).toFixed(3)}°W`],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#8a939c', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>{label}</div>
                        <div style={{ fontSize: 14, color: '#16181d' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Evacuations summary bar */}
          <div style={S.summaryBar('#ffa500', !!expanded['evac'])} onClick={() => toggleExpand('evac')}>
            <div style={S.summaryBarHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 1L1 16H17L9 1Z" fill="#ffa500"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">!</text></svg>
                <span style={{ fontWeight: 600, fontSize: 15 }}>Evacuations</span>
                <span style={{ color: '#5b6570', fontSize: 14 }}>{selectedCommunities.filter(c => c.evac.status === 'order').length} orders &middot; {selectedCommunities.filter(c => c.evac.status === 'alert').length} alerts</span>
              </div>
              <ChevronDown open={!!expanded['evac']} />
            </div>
            {expanded['evac'] && (
              <div style={S.summaryBarExpanded} onClick={e => e.stopPropagation()}>
                <div style={{ paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedCommunities.filter(c => c.evac.status !== 'none').map(c => {
                    const ts = threatStyle(c.threat);
                    return (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f0f2f5' }}>
                        <span style={S.evacBadge(c.threat)}>{ts.badgeText}</span>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</span>
                        <span style={{ color: '#5b6570', fontSize: 13 }}>{c.evac.since ? `${c.evac.since} — by ${c.evac.by}` : ''}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Roads summary bar — live from DriveBC Open511 API */}
          <div style={S.summaryBar('#e8b500', !!expanded['roads'])} onClick={() => toggleExpand('roads')}>
            <div style={S.summaryBarHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="6" width="14" height="6" rx="1" fill="#e8b500"/><rect x="6" y="4" width="6" height="2" rx="1" fill="#e8b500" opacity="0.5"/></svg>
                <span style={{ fontWeight: 600, fontSize: 15 }}>Roads</span>
                <span style={{ color: '#5b6570', fontSize: 14 }}>
                  {roadEvents.length === 0 ? 'No events nearby' : `${roadEvents.length} event${roadEvents.length > 1 ? 's' : ''} nearby`}
                </span>
              </div>
              <ChevronDown open={!!expanded['roads']} />
            </div>
            {expanded['roads'] && (
              <div style={S.summaryBarExpanded} onClick={e => e.stopPropagation()}>
                <div style={{ paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {roadEvents.length === 0 && <div style={{ fontSize: 13, color: '#8a939c' }}>No active road events in the area</div>}
                  {roadEvents.map((road, i) => (
                    <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #f0f2f5' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{road.roadName}</span>
                        <span style={{
                          fontFamily: FONT_MONO, fontSize: 10, fontWeight: 600,
                          background: road.severity === 'Major' ? '#ffe2e0' : '#fff0d3',
                          color: road.severity === 'Major' ? '#c01515' : '#a06400',
                          padding: '2px 8px', borderRadius: 5, textTransform: 'uppercase' as const,
                        }}>{road.severity}</span>
                      </div>
                      <div style={{ fontSize: 13, color: '#5b6570' }}>{road.description.substring(0, 200)}{road.description.length > 200 ? '...' : ''}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Weather summary bar — live from Environment Canada */}
          <div style={S.summaryBar('#0066cc', !!expanded['weather'])} onClick={() => toggleExpand('weather')}>
            <div style={S.summaryBarHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="4" fill="#0066cc"/><g stroke="#0066cc" strokeWidth="1.5" strokeLinecap="round"><line x1="9" y1="1" x2="9" y2="3"/><line x1="9" y1="15" x2="9" y2="17"/><line x1="1" y1="9" x2="3" y2="9"/><line x1="15" y1="9" x2="17" y2="9"/></g></svg>
                <span style={{ fontWeight: 600, fontSize: 15 }}>Weather</span>
                <span style={{ color: '#5b6570', fontSize: 14 }}>
                  {weatherData ? `${weatherData.temp || '—'}, ${weatherData.wind || '—'}` : 'Loading...'}
                </span>
              </div>
              <ChevronDown open={!!expanded['weather']} />
            </div>
            {expanded['weather'] && (
              <div style={S.summaryBarExpanded} onClick={e => e.stopPropagation()}>
                {weatherData ? (
                  <div style={{ paddingTop: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#8a939c', textTransform: 'uppercase' as const, letterSpacing: '0.04em', marginBottom: 3 }}>Temperature</div>
                        <div style={{ fontSize: 14, color: '#16181d' }}>{weatherData.temp || '—'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#8a939c', textTransform: 'uppercase' as const, letterSpacing: '0.04em', marginBottom: 3 }}>Wind</div>
                        <div style={{ fontSize: 14, color: '#16181d' }}>{weatherData.wind || '—'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#8a939c', textTransform: 'uppercase' as const, letterSpacing: '0.04em', marginBottom: 3 }}>Humidity</div>
                        <div style={{ fontSize: 14, color: '#16181d' }}>{weatherData.rh || '—'}</div>
                      </div>
                    </div>
                    {weatherData.warnings.length > 0 && (
                      <div style={{ background: '#fff5f5', borderRadius: 8, padding: '10px 14px', marginBottom: 10, fontSize: 13, color: '#c01515' }}>
                        {weatherData.warnings.join(' · ')}
                      </div>
                    )}
                    {weatherData.forecast.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#8a939c', textTransform: 'uppercase' as const, letterSpacing: '0.04em', marginBottom: 6 }}>Forecast</div>
                        {weatherData.forecast.slice(0, 4).map((f, i) => (
                          <div key={i} style={{ fontSize: 13, color: '#5b6570', lineHeight: 1.6 }}>
                            <strong style={{ color: '#16181d' }}>{f.day}:</strong> {f.summary}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ paddingTop: 12, fontSize: 13, color: '#8a939c' }}>Loading weather data...</div>
                )}
              </div>
            )}
          </div>

          {/* Report wildfire banner */}
          <div style={{ background: '#fff5f5', border: '1px solid #ffccc7', borderRadius: 10, padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '20px 0 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FlameIcon size={16} color="#ff3b1f" />
              <span style={{ fontWeight: 600, fontSize: 14 }}>{REPORT_WILDFIRE.org}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <a href={`tel:${REPORT_WILDFIRE.phone.replace(/[^\d]/g, '')}`} style={{ ...S.phoneLink, fontSize: 14, fontWeight: 600 }}>{REPORT_WILDFIRE.phone}</a>
              <span style={{ fontSize: 12, color: '#8a939c' }}>{REPORT_WILDFIRE.note}</span>
            </div>
          </div>

          {/* Community cards */}
          <div style={{ ...S.communityGridWrap(dashboardLook), marginTop: 8 }}>
            {selectedCommunities.map(c => {
              const ts = threatStyle(c.threat);
              return (
                <div key={c.id} style={S.communityCard(c.threat, dashboardLook)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#16181d' }}>{c.name}</h3>
                        <EvacBadge threat={c.threat} />
                      </div>
                      <div style={{ fontSize: 13, color: '#5b6570' }}>
                        {c.type}{c.population ? ` · pop. ${formatNumber(c.population)}` : ''}{c.distanceKm ? ` · ${c.distanceKm} km from fire` : ''}
                      </div>
                    </div>
                  </div>

                  {/* Evac detail */}
                  {c.evac.status !== 'none' && (
                    <div style={{ background: ts.badgeBg, borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13 }}>
                      <span style={{ fontWeight: 600, color: ts.badgeFg }}>{c.evac.label}</span>
                      {c.evac.since && <span style={{ color: '#5b6570' }}> — {c.evac.since} by {c.evac.by}</span>}
                      <div style={{ color: '#5b6570', marginTop: 3, fontSize: 12 }}>{c.evac.zones}</div>
                    </div>
                  )}

                  {/* Contact grid */}
                  <div style={S.contactGrid}>
                    <ContactCell label="Fire Dept" contact={c.contacts.fireDept} />
                    <ContactCell label="Hospital" contact={c.contacts.hospital} />
                    <ContactCell label="RCMP" contact={c.contacts.rcmp} />
                    <ContactCell label="Water" contact={c.contacts.water} />
                  </div>

                  {/* Buttons */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    <button style={S.viewBriefBtn} onClick={() => { setDetailId(c.id); setScreen('detail'); }} onMouseOver={e => (e.currentTarget.style.background = '#0055aa')} onMouseOut={e => (e.currentTarget.style.background = '#0066cc')}>
                      View Full Briefing
                    </button>
                    <button style={S.kmlBtn} onClick={() => { const kml = generateKML(c, selectedFire); downloadKML(`${c.name.replace(/\s+/g, '-')}-briefing.kml`, kml); }}>
                      KML
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom actions */}
          <div style={S.bottomBar} className="sps-noprint">
            <button style={S.kmlBtn} onClick={() => {
              selectedCommunities.forEach(c => {
                const kml = generateKML(c, selectedFire);
                downloadKML(`${c.name.replace(/\s+/g, '-')}-briefing.kml`, kml);
              });
            }}>
              Export All KML
            </button>
            <button style={S.printBtn} onClick={() => window.print()}>
              Print All
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Screen 4: Community Detail ────────────────────────────────────────

  if (screen === 'detail' && detailCommunity) {
    const c = detailCommunity;
    const ts = threatStyle(c.threat);
    return (
      <div style={S.page}>
        <style>{PRINT_CSS}</style>

        {/* Header */}
        <div style={S.detailHeader} className="sps-noprint">
          <button style={S.detailBack} onClick={() => { if (selectedCommunityIds.length <= 1) { setScreen('map'); } else { setScreen('dashboard'); } setDetailId(null); }}>
            <BackArrow />
          </button>
          <div style={{ fontSize: 13, color: '#8a939c' }}>
            {selectedFire ? `${selectedFire.id} ${selectedFire.name}` : 'Briefing'} &rarr;
          </div>
        </div>

        <div style={S.detailBody}>
          {/* Community header */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, color: '#16181d' }}>{c.name}</h1>
              <EvacBadge threat={c.threat} />
            </div>
            <div style={{ fontSize: 14, color: '#5b6570' }}>
              {c.type}{c.population ? ` · pop. ${formatNumber(c.population)}` : ''}{c.distanceKm ? ` · ${c.distanceKm} km from fire` : ''} &middot; {c.fireZone} Fire Zone
            </div>
            {c.evac.status !== 'none' && (
              <div style={{ background: ts.badgeBg, borderRadius: 8, padding: '10px 14px', marginTop: 12, fontSize: 14 }}>
                <span style={{ fontWeight: 600, color: ts.badgeFg }}>{c.evac.label}</span>
                {c.evac.since && <span style={{ color: '#5b6570' }}> — {c.evac.since} by {c.evac.by}</span>}
                <div style={{ color: '#5b6570', marginTop: 4, fontSize: 13 }}>{c.evac.zones}</div>
              </div>
            )}
          </div>

          {/* Emergency section */}
          <div style={S.sectionBlock('#ff3b1f')}>
            <div style={S.sectionTitle}>Emergency Contacts</div>
            <div style={S.sectionContent}>
              <div style={S.contactGrid}>
                <ContactCell label="Fire Dept" contact={c.contacts.fireDept} />
                <ContactCell label="Hospital" contact={c.contacts.hospital} />
                <ContactCell label="RCMP" contact={c.contacts.rcmp} />
                <ContactCell label="Water" contact={c.contacts.water} />
              </div>

              {/* Report Wildfire */}
              <div style={{ background: '#fff5f5', borderRadius: 8, padding: '10px 14px', marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FlameIcon size={14} color="#ff3b1f" />
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{REPORT_WILDFIRE.org}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <a href={`tel:${REPORT_WILDFIRE.phone.replace(/[^\d]/g, '')}`} style={{ ...S.phoneLink, fontSize: 13 }}>{REPORT_WILDFIRE.phone}</a>
                  <span style={{ fontSize: 11, color: '#8a939c' }}>{REPORT_WILDFIRE.note}</span>
                </div>
              </div>

              {/* First Nations card */}
              {c.firstNation && (
                <div style={S.fnCard}>
                  <div style={S.fnTitle}>{c.firstNation.band}</div>
                  <div style={S.fnPron}>{c.firstNation.pron}</div>
                  <div style={S.fnDetail}><strong>Nation:</strong> {c.firstNation.nation}</div>
                  <div style={S.fnDetail}><strong>Band office:</strong> <a href={`tel:${c.firstNation.office.replace(/[^\d]/g, '')}`} style={S.phoneLink}>{c.firstNation.office}</a></div>
                  <div style={S.fnDetail}><strong>Territory:</strong> {c.firstNation.territory} <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: '#8a939c' }}>({c.firstNation.territoryPron})</span></div>
                  <div style={S.fnDetail}><strong>Distance:</strong> {c.firstNation.distanceKm} km from fire</div>
                </div>
              )}
            </div>
          </div>

          {/* Local Fire Departments */}
          {nearbyFireHalls.length > 0 && (
            <div style={S.sectionBlock('#e65100')}>
              <div style={S.sectionTitle}>Local Fire Departments</div>
              <div style={S.sectionContent}>
                {nearbyFireHalls.slice(0, 5).map((h, i) => (
                  <div key={i} style={{ padding: '8px 0', borderBottom: i < Math.min(nearbyFireHalls.length, 5) - 1 ? '1px solid #edf0f3' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#16181d' }}>{h.name}</div>
                        <div style={{ fontSize: 12, color: '#8a939c' }}>
                          {h.locality}{h.distanceKm ? ` · ${h.distanceKm} km` : ''}
                          {h.chief && <span> · Chief: {h.chief}</span>}
                        </div>
                      </div>
                      {h.phone && <a href={`tel:${h.phone.replace(/[^\d+]/g, '')}`} style={S.phoneLink}>{h.phone}</a>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Operations / ICS section */}
          {c.ics.length > 0 && (
            <div style={S.sectionBlock('#0066cc')}>
              <div style={S.sectionTitle}>Operations / ICS</div>
              <div style={S.sectionContent}>
                {c.ics.map((row, i) => (
                  <div key={i} style={{ ...S.tableRow, borderBottom: i < c.ics.length - 1 ? '1px solid #f0f2f5' : 'none' }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#16181d' }}>{row.org}</span>
                    <PhoneLink phone={row.phone} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Infrastructure section */}
          {c.infrastructure.length > 0 && (
            <div style={S.sectionBlock('#ffa500')}>
              <div style={S.sectionTitle}>Infrastructure</div>
              <div style={S.sectionContent}>
                {c.infrastructure.map((row, i) => (
                  <div key={i} style={{ ...S.tableRow, borderBottom: i < c.infrastructure.length - 1 ? '1px solid #f0f2f5' : 'none' }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#16181d' }}>{row.org}</span>
                    <PhoneLink phone={row.phone} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Terrain & Weather */}
          <div style={S.sectionBlock('#2e7d32')}>
            <div style={S.sectionTitle}>Terrain & Weather</div>
            <div style={S.sectionContent}>
              {/* Current Weather */}
              {detailWeather ? (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#2e7d32', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Current Conditions</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
                    {detailWeather.condition && <div style={{ fontSize: 14, color: '#16181d' }}><strong>Sky:</strong> {detailWeather.condition}</div>}
                    {detailWeather.temp && <div style={{ fontSize: 14, color: '#16181d' }}><strong>Temp:</strong> {detailWeather.temp}</div>}
                    {detailWeather.wind && <div style={{ fontSize: 14, color: '#16181d' }}><strong>Wind:</strong> {detailWeather.wind}</div>}
                    {detailWeather.rh && <div style={{ fontSize: 14, color: '#16181d' }}><strong>RH:</strong> {detailWeather.rh}</div>}
                  </div>
                  {detailWeather.warnings.length > 0 && (
                    <div style={{ marginTop: 8, padding: '6px 10px', background: '#fff3e0', borderRadius: 6, fontSize: 13, color: '#e65100', fontWeight: 500 }}>⚠ {detailWeather.warnings.join(' · ')}</div>
                  )}
                  {detailWeather.forecast.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 12, color: '#8a939c', fontWeight: 600, marginBottom: 4 }}>FORECAST</div>
                      {detailWeather.forecast.slice(0, 4).map((f, i) => (
                        <div key={i} style={{ fontSize: 13, color: '#16181d', padding: '3px 0', borderBottom: i < 3 ? '1px solid #f0f2f5' : 'none' }}>
                          <strong>{f.day}:</strong> {f.summary}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: '#8a939c', marginBottom: 12 }}>Loading weather...</div>
              )}
              {/* Terrain / BEC / Fuel */}
              {terrainData ? (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#2e7d32', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, borderTop: '1px solid #e0e0e0', paddingTop: 10 }}>Terrain & Fuel</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
                    {terrainData.elevationM != null && <div style={{ fontSize: 14, color: '#16181d' }}><strong>Elevation:</strong> {terrainData.elevationM}m</div>}
                    {terrainData.becLabel && <div style={{ fontSize: 14, color: '#16181d' }}><strong>BEC Zone:</strong> {terrainData.becLabel}</div>}
                    {terrainData.becZone && <div style={{ fontSize: 14, color: '#16181d', gridColumn: '1 / -1' }}><strong>Ecosystem:</strong> {terrainData.becZone}{terrainData.becSubzone ? ` — ${terrainData.becSubzone}` : ''}</div>}
                    {terrainData.fuelTypeCode && <div style={{ fontSize: 14, color: '#16181d', gridColumn: '1 / -1' }}><strong>Fuel Type:</strong> {terrainData.fuelTypeCode}{terrainData.fuelTypeLabel ? ` (${terrainData.fuelTypeLabel})` : ''}</div>}
                    {terrainData.ndtFireRisk && <div style={{ fontSize: 14, color: '#16181d', gridColumn: '1 / -1' }}><strong>Fire Regime:</strong> {terrainData.ndtFireRisk}</div>}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: '#8a939c' }}>Loading terrain data...</div>
              )}
            </div>
          </div>

          {/* Water Sources */}
          {waterSources.length > 0 && (
            <div style={S.sectionBlock('#1565c0')}>
              <div style={S.sectionTitle}>Water Sources</div>
              <div style={{ fontSize: 12, color: '#8a939c', marginBottom: 8 }}>Nearby water sources for firefighting operations. Verify access before deployment.</div>
              <div style={S.sectionContent}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0', fontSize: 13 }}>
                  <div style={{ fontWeight: 600, color: '#8a939c', fontSize: 11, textTransform: 'uppercase', padding: '4px 0', borderBottom: '1px solid #e0e0e0' }}>Name</div>
                  <div style={{ fontWeight: 600, color: '#8a939c', fontSize: 11, textTransform: 'uppercase', padding: '4px 8px', borderBottom: '1px solid #e0e0e0', textAlign: 'right' }}>Type</div>
                  <div style={{ fontWeight: 600, color: '#8a939c', fontSize: 11, textTransform: 'uppercase', padding: '4px 0', borderBottom: '1px solid #e0e0e0', textAlign: 'right' }}>Dist</div>
                  {waterSources.map((w, i) => (
                    <Fragment key={i}>
                      <div style={{ padding: '6px 0', borderBottom: i < waterSources.length - 1 ? '1px solid #f0f2f5' : 'none', color: '#16181d' }}>
                        {w.name}
                        {w.accessNotes && <div style={{ fontSize: 11, color: '#8a939c' }}>{w.accessNotes}</div>}
                      </div>
                      <div style={{ padding: '6px 8px', borderBottom: i < waterSources.length - 1 ? '1px solid #f0f2f5' : 'none', color: '#8a939c', textAlign: 'right', whiteSpace: 'nowrap' }}>{w.type}</div>
                      <div style={{ padding: '6px 0', borderBottom: i < waterSources.length - 1 ? '1px solid #f0f2f5' : 'none', color: '#16181d', fontWeight: 500, textAlign: 'right', whiteSpace: 'nowrap' }}>{w.distanceKm} km</div>
                    </Fragment>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Staging Areas */}
          {c.sections.staging && (
            <div style={S.sectionBlock('#8a939c')}>
              <div style={S.sectionTitle}>Staging Areas</div>
              <div style={{ fontSize: 13, color: '#4a5568', lineHeight: 1.5, padding: '4px 0' }}>{c.sections.staging}</div>
            </div>
          )}

          {/* Local News */}
          {newsArticles.length > 0 && (
            <div style={S.sectionBlock('#d97706')}>
              <div style={S.sectionTitle}>Local News</div>
              {newsArticles.map((a, i) => (
                <a key={i} href={a.link} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: i < newsArticles.length - 1 ? '1px solid #edf0f3' : 'none', textDecoration: 'none', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#16181d', lineHeight: 1.4 }}>{a.title}</div>
                    <div style={{ fontSize: 12, color: '#8a939c', marginTop: 3 }}>{a.source}{a.published ? ` · ${a.published}` : ''}</div>
                  </div>
                  <span style={{ fontSize: 14, color: '#8a939c', flexShrink: 0 }}>↗</span>
                </a>
              ))}
            </div>
          )}

          {/* Bottom actions */}
          <div style={S.bottomBar} className="sps-noprint">
            <button style={S.kmlBtn} onClick={() => {
              const kml = generateKML(c, selectedFire, { fireHalls: nearbyFireHalls, waterSources, weather: detailWeather, terrain: terrainData });
              downloadKML(`${c.name.replace(/\s+/g, '-')}-briefing.kml`, kml);
            }}>
              Export KML
            </button>
            <button style={S.printBtn} onClick={() => window.print()}>
              Print
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return null;
}

// ─── Page Export ──────────────────────────────────────────────────────────────

export default function SPSBriefingPage() {
  return (
    <Suspense fallback={<div style={{ fontFamily: FONT_SANS, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#8a939c' }}>Loading...</div>}>
      <SPSBriefingInner />
    </Suspense>
  );
}
