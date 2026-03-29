"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

const SUPABASE_URL  = "https://bdgmpkbbohbucwoiucyw.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZ21wa2Jib2hidWN3b2l1Y3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1Nzk3ODEsImV4cCI6MjA5MDE1NTc4MX0.WAuh1vJsqxkdQKoBQ6i_qfHiJyKM-TSJ9BLtn8EyUws";
const SB_HEADERS    = { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` };

// Whistler Village centre
const DEFAULT_LAT = 50.1163;
const DEFAULT_LON = -122.9574;
const DEFAULT_ZOOM = 13;

// Per-unit colour palette (cycles if more units than colours)
const UNIT_COLORS = ["#f0a500","#38bdf8","#4ade80","#f87171","#c084fc","#fb923c","#34d399","#e879f9"];

type Position = {
  speaker: string;
  lat: number; lon: number; alt: number; speed: number;
  recorded_at: string;
};

function parsePosition(transcript: string, speaker: string, recorded_at: string): Position | null {
  const out: Partial<Position> = { speaker, recorded_at, alt: 0, speed: 0 };
  for (const part of transcript.split("|").map(p => p.trim())) {
    const lat = part.match(/^Lat:\s*([-\d.]+)$/);   if (lat) out.lat = parseFloat(lat[1]);
    const lon = part.match(/^Lon:\s*([-\d.]+)$/);   if (lon) out.lon = parseFloat(lon[1]);
    const alt = part.match(/^Alt:\s*([\d.]+)m$/);   if (alt) out.alt = parseFloat(alt[1]);
    const spd = part.match(/^Speed:\s*([\d.]+)km/); if (spd) out.speed = parseFloat(spd[1]);
  }
  if (out.lat == null || out.lon == null) return null;
  return out as Position;
}

function fmtAge(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)  return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  return `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m ago`;
}

// ── Declare Leaflet types (loaded via CDN) ────────────────────────────────────
declare global {
  interface Window {
    L: {
      map: (el: HTMLElement, opts: object) => LMap;
      tileLayer: (url: string, opts: object) => { addTo: (m: LMap) => void };
      polyline: (pts: [number,number][], opts: object) => LLayer;
      circleMarker: (pt: [number,number], opts: object) => LMarker;
      divIcon: (opts: object) => object;
      marker: (pt: [number,number], opts: object) => LMarker;
    };
  }
}
interface LMap  { addLayer: (l: LLayer|LMarker) => void; removeLayer: (l: LLayer|LMarker) => void; setView: (pt:[number,number],z:number)=>void; fitBounds: (b:[[number,number],[number,number]])=>void; }
interface LLayer { addTo: (m: LMap) => LLayer; remove: () => void; }
interface LMarker { addTo: (m: LMap) => LMarker; remove: () => void; bindPopup: (s: string) => LMarker; }

export default function FireBoxMap() {
  const mapDivRef  = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<LMap | null>(null);
  const layersRef  = useRef<(LLayer|LMarker)[]>([]);
  const [positions,  setPositions]  = useState<Position[]>([]);
  const [units,      setUnits]      = useState<string[]>([]);
  const [colorMap,   setColorMap]   = useState<Record<string, string>>({});
  const [live,       setLive]       = useState(true);
  const [lastFetch,  setLastFetch]  = useState<Date | null>(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const [incident,   setIncident]   = useState<{ name: string; start_at: string; end_at?: string } | null>(null);

  // ── Load Leaflet CSS + JS from CDN ─────────────────────────────────────────
  useEffect(() => {
    if (document.getElementById("leaflet-css")) { setLeafletReady(true); return; }
    const css = document.createElement("link");
    css.id = "leaflet-css"; css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);

    const js = document.createElement("script");
    js.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    js.onload = () => setLeafletReady(true);
    document.body.appendChild(js);
  }, []);

  // ── Init map once Leaflet + div are ready ──────────────────────────────────
  useEffect(() => {
    if (!leafletReady || !mapDivRef.current || leafletRef.current) return;
    const L = window.L;
    const map = L.map(mapDivRef.current, { center: [DEFAULT_LAT, DEFAULT_LON], zoom: DEFAULT_ZOOM } as object);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "© CartoDB © OSM",
      subdomains: "abcd", maxZoom: 19,
    }).addTo(map);
    leafletRef.current = map;
  }, [leafletReady]);

  // ── Fetch active incident ──────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/firebox-incidents").then(r => r.ok ? r.json() : { incidents: [] })
      .then(d => {
        const active = (d.incidents ?? []).find((i: {status:string}) => i.status === "active");
        setIncident(active ?? null);
      }).catch(() => {});
  }, []);

  // ── Fetch positions ────────────────────────────────────────────────────────
  const fetchPositions = useCallback(async () => {
    try {
      const url = `${SUPABASE_URL}/rest/v1/firebox_transcripts?channel=eq.mesh-position&order=recorded_at.desc&limit=500`;
      const r   = await fetch(url, { headers: SB_HEADERS });
      if (!r.ok) return;
      const rows: Array<{ transcript: string; speaker: string | null; recorded_at: string }> = await r.json();
      const parsed = rows
        .map(row => parsePosition(row.transcript, row.speaker ?? "Unknown", row.recorded_at))
        .filter((p): p is Position => p !== null);

      setPositions(parsed);
      setLastFetch(new Date());

      // Build unit list + colour map
      const seen: string[] = [];
      const cm: Record<string, string> = {};
      parsed.forEach(p => { if (!seen.includes(p.speaker)) seen.push(p.speaker); });
      seen.forEach((u, i) => { cm[u] = UNIT_COLORS[i % UNIT_COLORS.length]; });
      setUnits(seen);
      setColorMap(cm);
    } catch {}
  }, []);

  useEffect(() => {
    fetchPositions();
    if (!live) return;
    const t = setInterval(fetchPositions, 30000);
    return () => clearInterval(t);
  }, [fetchPositions, live]);

  // ── Draw / redraw map layers when positions change ─────────────────────────
  useEffect(() => {
    const map = leafletRef.current;
    if (!map || !window.L || positions.length === 0) return;
    const L = window.L;

    // Clear old layers
    layersRef.current.forEach(l => l.remove());
    layersRef.current = [];

    // Group by unit, chronological order (reversed since we fetched desc)
    const byUnit: Record<string, Position[]> = {};
    [...positions].reverse().forEach(p => {
      if (!byUnit[p.speaker]) byUnit[p.speaker] = [];
      byUnit[p.speaker].push(p);
    });

    const allPts: [number, number][] = [];

    Object.entries(byUnit).forEach(([unit, pts]) => {
      const color = colorMap[unit] ?? "#888";
      const coords: [number,number][] = pts.map(p => [p.lat, p.lon]);
      allPts.push(...coords);

      // Track line
      if (coords.length > 1) {
        const line = L.polyline(coords, { color, weight: 2, opacity: 0.5 }).addTo(map);
        layersRef.current.push(line);
      }

      // Dot for each historical point
      pts.slice(0, -1).forEach(p => {
        const dot = L.circleMarker([p.lat, p.lon], { radius: 3, color, fillColor: color, fillOpacity: 0.4, weight: 1 }).addTo(map);
        layersRef.current.push(dot);
      });

      // Latest position — larger marker with label
      const latest = pts[pts.length - 1];
      const icon = L.divIcon({
        className: "",
        html: `<div style="background:${color};color:#000;font-size:10px;font-weight:800;padding:2px 6px;border-radius:4px;white-space:nowrap;font-family:monospace;letter-spacing:1px;box-shadow:0 0 6px ${color}80">${unit}</div>`,
        iconAnchor: [0, 20],
      });
      const marker = L.marker([latest.lat, latest.lon], { icon } as object)
        .bindPopup(`<b>${unit}</b><br>${latest.lat.toFixed(5)}, ${latest.lon.toFixed(5)}<br>Alt: ${latest.alt}m · ${latest.speed}km/h<br>${fmtAge(latest.recorded_at)}`)
        .addTo(map);
      layersRef.current.push(marker);
    });

    // Fit map to all points on first load
    if (allPts.length > 1) {
      const lats = allPts.map(p => p[0]), lons = allPts.map(p => p[1]);
      map.fitBounds([[Math.min(...lats)-0.002, Math.min(...lons)-0.002], [Math.max(...lats)+0.002, Math.max(...lons)+0.002]]);
    } else if (allPts.length === 1) {
      map.setView(allPts[0], 15);
    }
  }, [positions, colorMap]);

  return (
    <div style={{ minHeight: "100vh", background: "#060b06", color: "#b8d8a0", fontFamily: "'Rajdhani',sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=JetBrains+Mono:wght@400;700&display=swap');
        .leaflet-container { background: #0d0d0d !important; }
        .leaflet-popup-content-wrapper { background: #0a110a; border: 1px solid #1e3a1e; border-radius: 8px; color: #b8d8a0; font-family: monospace; font-size: 12px; }
        .leaflet-popup-tip { background: #0a110a; }
        .leaflet-popup-close-button { color: #4a6a4a !important; }
      `}</style>

      {/* Header */}
      <header style={{ background: "#050a05", borderBottom: "1px solid #0e1a0e", padding: "0 24px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/projects/firebox" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#1e3a1e", textDecoration: "none", letterSpacing: 1 }}>← FIREBOX</Link>
          <div style={{ width: 1, height: 20, background: "#0e1a0e" }} />
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 4, color: "#c8e8b0" }}>UNIT TRACKS</div>
          {incident && (
            <div style={{ padding: "2px 10px", borderRadius: 6, background: "#1a0e00", border: "1px solid #f0a50030", fontSize: 10, fontWeight: 700, color: "#f0a500", letterSpacing: 1 }}>
              ⚡ {incident.name.toUpperCase()}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {lastFetch && (
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#1a3a1a" }}>↻ {lastFetch.toLocaleTimeString("en-CA",{hour12:false})}</span>
          )}
          <button onClick={() => setLive(v => !v)} style={{
            padding: "5px 12px", border: `1px solid ${live ? "#0e2e0e" : "#1e1e1e"}`,
            background: live ? "#060e06" : "transparent", color: live ? "#39d353" : "#2a4a2a",
            fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 10, letterSpacing: 2, cursor: "pointer",
          }}>
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: live ? "#39d353" : "#333", marginRight: 5 }} />
            {live ? "LIVE" : "PAUSED"}
          </button>
          <button onClick={fetchPositions} style={{
            padding: "5px 12px", border: "1px solid #1a3a1a", background: "transparent",
            color: "#2a5a2a", fontFamily: "'Rajdhani',sans-serif", fontWeight: 600, fontSize: 10, letterSpacing: 1, cursor: "pointer",
          }}>↺ REFRESH</button>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Side panel */}
        <div style={{ width: 220, flexShrink: 0, background: "#050a05", borderRight: "1px solid #0e1a0e", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #0e1a0e" }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: 2, color: "#1e3a1e", marginBottom: 8 }}>UNITS · {units.length}</div>
            {units.length === 0 ? (
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#1a2e1a", lineHeight: 1.6 }}>
                No position data yet.<br />Nodes with GPS will appear here automatically.
              </div>
            ) : units.map(unit => {
              const latest = positions.find(p => p.speaker === unit);
              const color  = colorMap[unit] ?? "#888";
              return (
                <div key={unit} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}` }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color, letterSpacing: 1 }}>{unit}</span>
                  </div>
                  {latest && (
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#2a5a2a", paddingLeft: 14, lineHeight: 1.8 }}>
                      <div>{latest.lat.toFixed(4)}°N</div>
                      <div>{Math.abs(latest.lon).toFixed(4)}°W</div>
                      <div>Alt: {latest.alt}m · {latest.speed}km/h</div>
                      <div style={{ color: "#1a3a1a" }}>{fmtAge(latest.recorded_at)}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ padding: "12px 16px", marginTop: "auto", borderTop: "1px solid #0e1a0e" }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#1a2e1a", lineHeight: 1.7 }}>
              <div>{positions.length} position fixes</div>
              <div>30s refresh interval</div>
              <div style={{ marginTop: 6, color: "#1a2a1a" }}>Tracks show last 500 fixes. GPS from Meshtastic nodes with BME280/GPS module.</div>
            </div>
          </div>
        </div>

        {/* Map */}
        <div style={{ flex: 1, position: "relative" }}>
          <div ref={mapDivRef} style={{ position: "absolute", inset: 0 }} />
          {!leafletReady && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#060b06" }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#1e3a1e", letterSpacing: 2 }}>LOADING MAP…</div>
            </div>
          )}
          {leafletReady && positions.length === 0 && (
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none", zIndex: 500 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#1e3a1e", letterSpacing: 2, marginBottom: 8 }}>● ● ●</div>
              <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: 4, color: "#2a5a2a" }}>AWAITING GPS</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#1a3a1a", marginTop: 6 }}>Meshtastic nodes with GPS will appear here</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
