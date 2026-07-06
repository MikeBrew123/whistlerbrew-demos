"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";

const SUPABASE_URL  = "https://bdgmpkbbohbucwoiucyw.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZ21wa2Jib2hidWN3b2l1Y3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1Nzk3ODEsImV4cCI6MjA5MDE1NTc4MX0.WAuh1vJsqxkdQKoBQ6i_qfHiJyKM-TSJ9BLtn8EyUws";
const SB_HEADERS    = { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` };
const SB_WRITE      = { ...SB_HEADERS, "Content-Type": "application/json", Prefer: "return=minimal" };
const TRANSCRIPTS   = `${SUPABASE_URL}/rest/v1/firebox_transcripts`;
const CONFIG        = `${SUPABASE_URL}/rest/v1/firebox_config`;

// Whistler Village centre
const DEFAULT_LAT = 50.1163;
const DEFAULT_LON = -122.9574;
const DEFAULT_ZOOM = 13;

const TX_LIVE_MS   = 90_000;   // marker pulses this long after a transmission (live)
const TX_REPLAY_MS = 60_000;   // flash duration in replay time

// Per-unit colour palette (cycles if more units than colours)
const UNIT_COLORS = ["#f0a500","#38bdf8","#4ade80","#f87171","#c084fc","#fb923c","#34d399","#e879f9"];

const FIXED_STYLE: Record<string, { color: string; shape: string; tag: string }> = {
  weather: { color: "#22d3ee", shape: "◆", tag: "WX"   },
  relay:   { color: "#a78bfa", shape: "▲", tag: "RLY"  },
  base:    { color: "#f0a500", shape: "■", tag: "BASE" },
};

type Fix = {
  unit: string;          // normalized callsign key
  display: string;       // display name
  lat: number; lon: number; alt: number; speed: number;
  t: number;             // epoch ms
  src: "phone" | "mesh";
};

type TxEvent = {
  unit: string;          // normalized
  display: string;
  channel: string;
  text: string;
  t: number;
  kind: "radio" | "mesh";
};

type FixedNode = {
  call_sign: string;
  lat: number; lon: number;
  type: "weather" | "relay" | "base";
};

const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

function parseFix(row: { transcript: string; speaker: string | null; recorded_at: string; filename?: string | null }): Fix | null {
  const speaker = row.speaker ?? "Unknown";
  const out = { lat: NaN, lon: NaN, alt: 0, speed: 0 };
  for (const part of row.transcript.split("|").map(p => p.trim())) {
    const lat = part.match(/^Lat:\s*([-\d.]+)$/);   if (lat) out.lat = parseFloat(lat[1]);
    const lon = part.match(/^Lon:\s*([-\d.]+)$/);   if (lon) out.lon = parseFloat(lon[1]);
    const alt = part.match(/^Alt:\s*([-\d.]+)m$/);  if (alt) out.alt = parseFloat(alt[1]);
    const spd = part.match(/^Speed:\s*([\d.]+)km/); if (spd) out.speed = parseFloat(spd[1]);
  }
  if (isNaN(out.lat) || isNaN(out.lon)) return null;
  return {
    unit: norm(speaker), display: speaker,
    lat: out.lat, lon: out.lon, alt: out.alt, speed: out.speed,
    t: new Date(row.recorded_at).getTime(),
    src: (row.filename ?? "").startsWith("phone-pos") ? "phone" : "mesh",
  };
}

function fmtAge(t: number, ref: number): string {
  const s = Math.max(0, Math.floor((ref - t) / 1000));
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  return `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m ago`;
}

function fmtClock(t: number): string {
  return new Date(t).toLocaleTimeString("en-CA", { hour12: false });
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
interface LMap  {
  addLayer: (l: LLayer|LMarker) => void; removeLayer: (l: LLayer|LMarker) => void;
  setView: (pt:[number,number],z:number)=>void;
  fitBounds: (b:[[number,number],[number,number]])=>void;
  on: (ev: string, cb: (e: { latlng: { lat: number; lng: number } }) => void) => void;
  invalidateSize: () => void;
}
interface LLayer { addTo: (m: LMap) => LLayer; remove: () => void; }
interface LMarker { addTo: (m: LMap) => LMarker; remove: () => void; bindPopup: (s: string) => LMarker; }

export default function FireBoxMap() {
  const mapDivRef  = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<LMap | null>(null);
  const layersRef  = useRef<(LLayer|LMarker)[]>([]);
  const didFitRef  = useRef(false);
  const pickingRef = useRef(false);

  const [leafletReady, setLeafletReady] = useState(false);
  const [incident,   setIncident]   = useState<{ name: string; start_at: string; end_at?: string } | null>(null);
  const [lastFetch,  setLastFetch]  = useState<Date | null>(null);
  const [clock,      setClock]      = useState(() => Date.now());

  // Live data
  const [fixes,    setFixes]    = useState<Fix[]>([]);
  const [txEvents, setTxEvents] = useState<TxEvent[]>([]);
  const [live,     setLive]     = useState(true);

  // Fixed nodes
  const [fixedNodes, setFixedNodes] = useState<FixedNode[]>([]);
  const [editingFixed, setEditingFixed] = useState(false);
  const [fxForm, setFxForm] = useState<{ call_sign: string; lat: string; lon: string; type: FixedNode["type"] }>({ call_sign: "", lat: "", lon: "", type: "weather" });
  const [picking, setPicking] = useState(false);

  // Callsign / location sharing
  const [callsign, setCallsign] = useState("");
  const [sharing,  setSharing]  = useState(false);
  const watchIdRef  = useRef<number | null>(null);
  const lastPushRef = useRef<{ t: number; lat: number; lon: number } | null>(null);

  // Replay
  const [mode, setMode] = useState<"live" | "replay">("live");
  const [windowHrs, setWindowHrs] = useState(3);
  const [replayFixes,  setReplayFixes]  = useState<Fix[]>([]);
  const [replayEvents, setReplayEvents] = useState<TxEvent[]>([]);
  const [replayLoading, setReplayLoading] = useState(false);
  const [replayT,  setReplayT]  = useState(0);
  const [playing,  setPlaying]  = useState(false);
  const [speed,    setSpeed]    = useState(60);
  const windowStartRef = useRef(0);
  const windowEndRef   = useRef(0);

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
    map.on("click", (e) => {
      if (!pickingRef.current) return;
      setFxForm(f => ({ ...f, lat: e.latlng.lat.toFixed(5), lon: e.latlng.lng.toFixed(5) }));
      setPicking(false);
    });
    leafletRef.current = map;
    // Container can be 0-wide at init (flex layout settles late) — keep Leaflet's size current
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(mapDivRef.current);
    return () => ro.disconnect();
  }, [leafletReady]);

  useEffect(() => { pickingRef.current = picking; }, [picking]);

  // Replay bar toggling changes the map container height
  useEffect(() => {
    const t = setTimeout(() => leafletRef.current?.invalidateSize(), 150);
    return () => clearTimeout(t);
  }, [mode]);

  // ── Restore callsign ───────────────────────────────────────────────────────
  useEffect(() => {
    setCallsign(localStorage.getItem("firebox_callsign") ?? "");
  }, []);

  // ── Clock tick (drives TX pulse expiry + age labels in live mode) ─────────
  useEffect(() => {
    const t = setInterval(() => setClock(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  // ── Fetch active incident ──────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/firebox-incidents").then(r => r.ok ? r.json() : { incidents: [] })
      .then(d => {
        const active = (d.incidents ?? []).find((i: {status:string}) => i.status === "active");
        setIncident(active ?? null);
      }).catch(() => {});
  }, []);

  // ── Fetch fixed nodes ──────────────────────────────────────────────────────
  const fetchFixedNodes = useCallback(async () => {
    try {
      const r = await fetch(`${CONFIG}?key=eq.fixed_nodes&select=value`, { headers: SB_HEADERS });
      if (!r.ok) return;
      const rows = await r.json();
      const val = rows[0]?.value;
      if (Array.isArray(val)) setFixedNodes(val as FixedNode[]);
    } catch {}
  }, []);
  useEffect(() => { fetchFixedNodes(); }, [fetchFixedNodes]);

  const saveFixedNodes = useCallback(async (nodes: FixedNode[]) => {
    setFixedNodes(nodes);
    try {
      const body = JSON.stringify({ key: "fixed_nodes", value: nodes, updated_at: new Date().toISOString() });
      const check = await fetch(`${CONFIG}?key=eq.fixed_nodes&select=key`, { headers: SB_HEADERS });
      const exists = check.ok && (await check.json()).length > 0;
      await fetch(exists ? `${CONFIG}?key=eq.fixed_nodes` : CONFIG, {
        method: exists ? "PATCH" : "POST", headers: SB_WRITE, body,
      });
    } catch {}
  }, []);

  // ── Fetch live positions + transmissions ───────────────────────────────────
  const fetchLive = useCallback(async () => {
    try {
      const txSince = new Date(Date.now() - 15 * 60_000).toISOString();
      const [posRes, txRes] = await Promise.all([
        fetch(`${TRANSCRIPTS}?channel=eq.mesh-position&select=transcript,speaker,recorded_at,filename&order=recorded_at.desc&limit=500`, { headers: SB_HEADERS }),
        fetch(`${TRANSCRIPTS}?channel=not.in.(mesh-position,mesh-weather)&speaker=not.is.null&recorded_at=gte.${txSince}&select=channel,transcript,speaker,recorded_at&order=recorded_at.desc&limit=100`, { headers: SB_HEADERS }),
      ]);
      if (posRes.ok) {
        const rows: Array<{ transcript: string; speaker: string | null; recorded_at: string; filename: string | null }> = await posRes.json();
        setFixes(rows.map(parseFix).filter((p): p is Fix => p !== null));
      }
      if (txRes.ok) {
        const rows: Array<{ channel: string; transcript: string; speaker: string; recorded_at: string }> = await txRes.json();
        setTxEvents(rows.map(r => ({
          unit: norm(r.speaker), display: r.speaker,
          channel: r.channel, text: r.transcript,
          t: new Date(r.recorded_at).getTime(),
          kind: r.channel === "mesh-text" ? "mesh" as const : "radio" as const,
        })));
      }
      setLastFetch(new Date());
    } catch {}
  }, []);

  useEffect(() => {
    if (mode !== "live") return;
    fetchLive();
    if (!live) return;
    const t = setInterval(fetchLive, 20000);
    return () => clearInterval(t);
  }, [fetchLive, live, mode]);

  // ── Replay data fetch ──────────────────────────────────────────────────────
  const loadReplay = useCallback(async (hrs: number) => {
    setReplayLoading(true);
    const end = Date.now();
    const start = end - hrs * 3600_000;
    windowStartRef.current = start;
    windowEndRef.current = end;
    try {
      const iso = new Date(start).toISOString();
      const [posRes, txRes] = await Promise.all([
        fetch(`${TRANSCRIPTS}?channel=eq.mesh-position&recorded_at=gte.${iso}&select=transcript,speaker,recorded_at,filename&order=recorded_at.asc&limit=2000`, { headers: SB_HEADERS }),
        fetch(`${TRANSCRIPTS}?channel=not.in.(mesh-position,mesh-weather)&speaker=not.is.null&recorded_at=gte.${iso}&select=channel,transcript,speaker,recorded_at&order=recorded_at.asc&limit=1000`, { headers: SB_HEADERS }),
      ]);
      const pos: Fix[] = posRes.ok
        ? (await posRes.json() as Array<{ transcript: string; speaker: string | null; recorded_at: string; filename: string | null }>)
            .map(parseFix).filter((p): p is Fix => p !== null)
        : [];
      const evs: TxEvent[] = txRes.ok
        ? (await txRes.json() as Array<{ channel: string; transcript: string; speaker: string; recorded_at: string }>)
            .map(r => ({
              unit: norm(r.speaker), display: r.speaker,
              channel: r.channel, text: r.transcript,
              t: new Date(r.recorded_at).getTime(),
              kind: r.channel === "mesh-text" ? "mesh" as const : "radio" as const,
            }))
        : [];
      setReplayFixes(pos);
      setReplayEvents(evs);
      setReplayT(pos.length || evs.length
        ? Math.min(pos[0]?.t ?? Infinity, evs[0]?.t ?? Infinity)
        : start);
      setPlaying(false);
    } catch {}
    setReplayLoading(false);
  }, []);

  useEffect(() => {
    if (mode === "replay") loadReplay(windowHrs);
    else setPlaying(false);
  }, [mode, windowHrs, loadReplay]);

  // Replay playback clock
  useEffect(() => {
    if (mode !== "replay" || !playing) return;
    const t = setInterval(() => {
      setReplayT(prev => {
        const next = prev + 250 * speed;
        if (next >= windowEndRef.current) { setPlaying(false); return windowEndRef.current; }
        return next;
      });
    }, 250);
    return () => clearInterval(t);
  }, [mode, playing, speed]);

  // ── Phone GPS sharing ──────────────────────────────────────────────────────
  const pushPhoneFix = useCallback(async (pos: GeolocationPosition, cs: string) => {
    const { latitude: lat, longitude: lon, altitude, speed: ms } = pos.coords;
    const last = lastPushRef.current;
    const now = Date.now();
    if (last) {
      const dLat = (lat - last.lat) * 111_320;
      const dLon = (lon - last.lon) * 111_320 * Math.cos(lat * Math.PI / 180);
      const moved = Math.sqrt(dLat * dLat + dLon * dLon);
      if (now - last.t < 30_000 && moved < 30) return;  // throttle: 30s or 30m
    }
    lastPushRef.current = { t: now, lat, lon };
    const kmh = Math.round((ms ?? 0) * 3.6);
    const transcript = `Lat: ${lat.toFixed(5)} | Lon: ${lon.toFixed(5)} | Alt: ${Math.round(altitude ?? 0)}m | Speed: ${kmh}km/h`;
    try {
      await fetch(TRANSCRIPTS, {
        method: "POST", headers: SB_WRITE,
        body: JSON.stringify({
          channel: "mesh-position",
          filename: `phone-pos-${cs}-${Math.floor(now/1000)}.txt`,
          recorded_at: new Date(now).toISOString(),
          transcript, speaker: cs,
        }),
      });
    } catch {}
  }, []);

  const toggleSharing = useCallback(() => {
    if (sharing) {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setSharing(false);
      return;
    }
    let cs = callsign;
    if (!cs) {
      const entered = window.prompt("Enter your call sign (e.g. SPS145):", "");
      if (!entered) return;
      cs = norm(entered);
      if (cs.length < 2) return;
      setCallsign(cs);
      localStorage.setItem("firebox_callsign", cs);
    }
    if (!("geolocation" in navigator)) { alert("This device has no GPS available to the browser."); return; }
    const csFinal = cs;
    watchIdRef.current = navigator.geolocation.watchPosition(
      p => pushPhoneFix(p, csFinal),
      () => { alert("Location permission denied — enable it in your browser settings."); setSharing(false); },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    );
    setSharing(true);
  }, [sharing, callsign, pushPhoneFix]);

  useEffect(() => () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
  }, []);

  // ── Derived view (shared between live + replay) ────────────────────────────
  const view = useMemo(() => {
    const srcFixes  = mode === "live" ? fixes : replayFixes.filter(f => f.t <= replayT);
    const srcEvents = mode === "live" ? txEvents : replayEvents.filter(e => e.t <= replayT);
    const refNow    = mode === "live" ? clock : replayT;
    const txWindow  = mode === "live" ? TX_LIVE_MS : TX_REPLAY_MS;

    // Group fixes by unit, chronological
    const byUnit: Record<string, Fix[]> = {};
    const ordered = mode === "live" ? [...srcFixes].reverse() : srcFixes;
    ordered.forEach(f => { (byUnit[f.unit] ??= []).push(f); });

    const units = Object.keys(byUnit);
    const colorMap: Record<string, string> = {};
    units.forEach((u, i) => { colorMap[u] = UNIT_COLORS[i % UNIT_COLORS.length]; });

    const txActive = new Set(srcEvents.filter(e => refNow - e.t >= 0 && refNow - e.t < txWindow).map(e => e.unit));
    const lastTxByUnit: Record<string, TxEvent> = {};
    srcEvents.forEach(e => { if (!lastTxByUnit[e.unit] || e.t > lastTxByUnit[e.unit].t) lastTxByUnit[e.unit] = e; });

    // Units that transmitted but have no position
    const txOnly = Object.values(lastTxByUnit)
      .filter(e => !byUnit[e.unit] && !fixedNodes.some(n => norm(n.call_sign) === e.unit))
      .sort((a, b) => b.t - a.t);

    // Recent event ticker (last 10 min relative to refNow)
    const ticker = srcEvents
      .filter(e => refNow - e.t >= 0 && refNow - e.t < 10 * 60_000)
      .sort((a, b) => b.t - a.t)
      .slice(0, 4);

    return { byUnit, units, colorMap, txActive, lastTxByUnit, txOnly, ticker, refNow };
  }, [mode, fixes, txEvents, replayFixes, replayEvents, replayT, clock, fixedNodes]);

  // ── Draw / redraw map layers ───────────────────────────────────────────────
  useEffect(() => {
    const map = leafletRef.current;
    if (!map || !window.L) return;
    const L = window.L;

    layersRef.current.forEach(l => l.remove());
    layersRef.current = [];

    const { byUnit, colorMap, txActive, refNow } = view;
    const allPts: [number, number][] = [];

    // Fixed nodes
    fixedNodes.forEach(n => {
      const st = FIXED_STYLE[n.type] ?? FIXED_STYLE.weather;
      allPts.push([n.lat, n.lon]);
      const isTx = txActive.has(norm(n.call_sign));
      const icon = L.divIcon({
        className: "",
        html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%)">
          ${isTx ? `<div class="fbx-tx">📡</div>` : ""}
          <div style="color:${st.color};font-size:16px;line-height:1;text-shadow:0 0 8px ${st.color}">${st.shape}</div>
          <div style="background:#0a110a;border:1px solid ${st.color}60;color:${st.color};font-size:9px;font-weight:800;padding:1px 5px;border-radius:3px;font-family:monospace;letter-spacing:1px;white-space:nowrap">${n.call_sign} · ${st.tag}</div>
        </div>`,
        iconAnchor: [0, 0],
      });
      const m = L.marker([n.lat, n.lon], { icon } as object)
        .bindPopup(`<b>${n.call_sign}</b> (${n.type})<br>${n.lat.toFixed(5)}, ${n.lon.toFixed(5)}<br>Fixed position`)
        .addTo(map);
      layersRef.current.push(m);
    });

    // Unit tracks + markers
    Object.entries(byUnit).forEach(([unit, pts]) => {
      const color = colorMap[unit] ?? "#888";
      const coords: [number,number][] = pts.map(p => [p.lat, p.lon]);
      allPts.push(...coords);

      if (coords.length > 1) {
        const line = L.polyline(coords, { color, weight: 2, opacity: 0.5 }).addTo(map);
        layersRef.current.push(line);
      }
      pts.slice(0, -1).forEach(p => {
        const dot = L.circleMarker([p.lat, p.lon], { radius: 3, color, fillColor: color, fillOpacity: 0.4, weight: 1 }).addTo(map);
        layersRef.current.push(dot);
      });

      const latest = pts[pts.length - 1];
      const isTx = txActive.has(unit);
      const srcIcon = latest.src === "phone" ? "📱" : "";
      const icon = L.divIcon({
        className: "",
        html: `<div style="display:flex;align-items:center;gap:4px">
          <div style="background:${color};color:#000;font-size:10px;font-weight:800;padding:2px 6px;border-radius:4px;white-space:nowrap;font-family:monospace;letter-spacing:1px;box-shadow:0 0 6px ${color}80;${isTx ? `outline:2px solid #ff4444;` : ""}">${latest.display}${srcIcon ? " " + srcIcon : ""}</div>
          ${isTx ? `<div class="fbx-tx">📡</div>` : ""}
        </div>`,
        iconAnchor: [0, 20],
      });
      const marker = L.marker([latest.lat, latest.lon], { icon } as object)
        .bindPopup(`<b>${latest.display}</b> ${latest.src === "phone" ? "(phone GPS)" : "(mesh GPS)"}<br>${latest.lat.toFixed(5)}, ${latest.lon.toFixed(5)}<br>Alt: ${latest.alt}m · ${latest.speed}km/h<br>${fmtAge(latest.t, refNow)}`)
        .addTo(map);
      layersRef.current.push(marker);
    });

    // Fit map to all points on first data only — wait until the container has real size
    const el = mapDivRef.current;
    if (!didFitRef.current && allPts.length > 0 && el && el.clientWidth > 50 && el.clientHeight > 50) {
      map.invalidateSize();
      didFitRef.current = true;
      if (allPts.length > 1) {
        const lats = allPts.map(p => p[0]), lons = allPts.map(p => p[1]);
        map.fitBounds([[Math.min(...lats)-0.002, Math.min(...lons)-0.002], [Math.max(...lats)+0.002, Math.max(...lons)+0.002]]);
      } else {
        map.setView(allPts[0], 15);
      }
    }
  }, [view, fixedNodes, leafletReady]);

  // ── UI helpers ─────────────────────────────────────────────────────────────
  const hasData = view.units.length > 0 || fixedNodes.length > 0;

  const addFixedNode = () => {
    const cs = norm(fxForm.call_sign);
    const lat = parseFloat(fxForm.lat), lon = parseFloat(fxForm.lon);
    if (cs.length < 2 || isNaN(lat) || isNaN(lon)) return;
    saveFixedNodes([...fixedNodes.filter(n => norm(n.call_sign) !== cs), { call_sign: cs, lat, lon, type: fxForm.type }]);
    setFxForm({ call_sign: "", lat: "", lon: "", type: "weather" });
    setPicking(false);
  };

  const btn = (active: boolean, activeColor = "#39d353"): React.CSSProperties => ({
    padding: "5px 12px", border: `1px solid ${active ? "#0e2e0e" : "#1e1e1e"}`,
    background: active ? "#060e06" : "transparent", color: active ? activeColor : "#2a4a2a",
    fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 10, letterSpacing: 2, cursor: "pointer",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#060b06", color: "#b8d8a0", fontFamily: "'Rajdhani',sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=JetBrains+Mono:wght@400;700&display=swap');
        .leaflet-container { background: #0d0d0d !important; }
        .leaflet-popup-content-wrapper { background: #0a110a; border: 1px solid #1e3a1e; border-radius: 8px; color: #b8d8a0; font-family: monospace; font-size: 12px; }
        .leaflet-popup-tip { background: #0a110a; }
        .leaflet-popup-close-button { color: #4a6a4a !important; }
        @keyframes fbxpulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.35); } 100% { opacity: 1; transform: scale(1); } }
        .fbx-tx { animation: fbxpulse 1s ease-in-out infinite; font-size: 14px; filter: drop-shadow(0 0 4px #ff4444); }
        input.fbx, select.fbx { background:#0a110a; border:1px solid #1e3a1e; color:#b8d8a0; font-family:'JetBrains Mono',monospace; font-size:10px; padding:4px 6px; border-radius:4px; width:100%; }
        input[type=range].fbx-slider { -webkit-appearance:none; appearance:none; height:4px; background:#1e3a1e; border-radius:2px; outline:none; }
        input[type=range].fbx-slider::-webkit-slider-thumb { -webkit-appearance:none; width:14px; height:14px; border-radius:50%; background:#f0a500; cursor:pointer; box-shadow:0 0 8px #f0a500; }
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
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Mode toggle */}
          <div style={{ display: "flex", border: "1px solid #1a3a1a", borderRadius: 4, overflow: "hidden" }}>
            <button onClick={() => setMode("live")} style={{ ...btn(mode === "live"), border: "none" }}>LIVE</button>
            <button onClick={() => setMode("replay")} style={{ ...btn(mode === "replay", "#f0a500"), border: "none" }}>REPLAY</button>
          </div>

          {mode === "live" && (
            <>
              {lastFetch && (
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#1a3a1a" }}>↻ {lastFetch.toLocaleTimeString("en-CA",{hour12:false})}</span>
              )}
              <button onClick={() => setLive(v => !v)} style={btn(live)}>
                <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: live ? "#39d353" : "#333", marginRight: 5 }} />
                {live ? "AUTO" : "PAUSED"}
              </button>
              <button onClick={toggleSharing} style={btn(sharing, "#38bdf8")}>
                📍 {sharing ? `SHARING · ${callsign}` : "SHARE MY GPS"}
              </button>
            </>
          )}

          {mode === "replay" && (
            <select className="fbx" style={{ width: "auto" }} value={windowHrs} onChange={e => setWindowHrs(parseInt(e.target.value))}>
              {[1,3,6,12,24].map(h => <option key={h} value={h}>LAST {h}H</option>)}
            </select>
          )}
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Side panel */}
        <div style={{ width: 230, flexShrink: 0, background: "#050a05", borderRight: "1px solid #0e1a0e", display: "flex", flexDirection: "column", overflowY: "auto" }}>

          {/* Units */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #0e1a0e" }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: 2, color: "#1e3a1e", marginBottom: 8 }}>UNITS · {view.units.length}</div>
            {view.units.length === 0 ? (
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#1a2e1a", lineHeight: 1.6 }}>
                No position data{mode === "replay" ? " in this window" : " yet"}.<br />GPS nodes and shared phones appear here.
              </div>
            ) : view.units.map(unit => {
              const pts = view.byUnit[unit];
              const latest = pts[pts.length - 1];
              const color  = view.colorMap[unit] ?? "#888";
              const isTx = view.txActive.has(unit);
              const lastTx = view.lastTxByUnit[unit];
              return (
                <div key={unit} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}` }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color, letterSpacing: 1 }}>{latest.display}</span>
                    <span style={{ fontSize: 10 }}>{latest.src === "phone" ? "📱" : ""}</span>
                    {isTx && <span className="fbx-tx" style={{ fontSize: 11 }}>📡</span>}
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#2a5a2a", paddingLeft: 14, lineHeight: 1.8 }}>
                    <div>{latest.lat.toFixed(4)}°N · {Math.abs(latest.lon).toFixed(4)}°W</div>
                    <div>Alt: {latest.alt}m · {latest.speed}km/h</div>
                    <div style={{ color: "#1a3a1a" }}>{fmtAge(latest.t, view.refNow)}</div>
                    {lastTx && <div style={{ color: isTx ? "#ff6b6b" : "#1a3a1a" }}>TX {fmtAge(lastTx.t, view.refNow)} · {lastTx.kind === "mesh" ? "mesh" : lastTx.channel}</div>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* TX with no position */}
          {view.txOnly.length > 0 && (
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #0e1a0e" }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: 2, color: "#1e3a1e", marginBottom: 8 }}>ON AIR · NO GPS</div>
              {view.txOnly.slice(0, 6).map(e => (
                <div key={e.unit} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  {view.txActive.has(e.unit) && <span className="fbx-tx" style={{ fontSize: 10 }}>📡</span>}
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#8aa87a", letterSpacing: 1 }}>{e.display}</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, color: "#1a3a1a" }}>{fmtAge(e.t, view.refNow)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Fixed nodes */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #0e1a0e" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: 2, color: "#1e3a1e" }}>FIXED NODES · {fixedNodes.length}</div>
              <button onClick={() => { setEditingFixed(v => !v); setPicking(false); }} style={{ background: "none", border: "none", color: "#2a5a2a", fontSize: 10, cursor: "pointer", fontFamily: "'JetBrains Mono',monospace" }}>
                {editingFixed ? "done" : "edit"}
              </button>
            </div>
            {fixedNodes.map(n => {
              const st = FIXED_STYLE[n.type] ?? FIXED_STYLE.weather;
              return (
                <div key={n.call_sign} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ color: st.color, fontSize: 11 }}>{st.shape}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: st.color, letterSpacing: 1 }}>{n.call_sign}</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, color: "#1a3a1a" }}>{st.tag}</span>
                  {editingFixed && (
                    <button onClick={() => saveFixedNodes(fixedNodes.filter(x => x.call_sign !== n.call_sign))}
                      style={{ marginLeft: "auto", background: "none", border: "none", color: "#7a2a2a", cursor: "pointer", fontSize: 11 }}>×</button>
                  )}
                </div>
              );
            })}
            {editingFixed && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                <input className="fbx" placeholder="CALL SIGN / LABEL" value={fxForm.call_sign}
                  onChange={e => setFxForm(f => ({ ...f, call_sign: e.target.value.toUpperCase() }))} />
                <div style={{ display: "flex", gap: 6 }}>
                  <input className="fbx" placeholder="LAT" value={fxForm.lat} onChange={e => setFxForm(f => ({ ...f, lat: e.target.value }))} />
                  <input className="fbx" placeholder="LON" value={fxForm.lon} onChange={e => setFxForm(f => ({ ...f, lon: e.target.value }))} />
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <select className="fbx" value={fxForm.type} onChange={e => setFxForm(f => ({ ...f, type: e.target.value as FixedNode["type"] }))}>
                    <option value="weather">WEATHER</option>
                    <option value="relay">RELAY</option>
                    <option value="base">BASE</option>
                  </select>
                  <button onClick={() => setPicking(v => !v)} style={{ ...btn(picking, "#f0a500"), whiteSpace: "nowrap" }}>
                    {picking ? "CLICK MAP…" : "PICK ON MAP"}
                  </button>
                </div>
                <button onClick={addFixedNode} style={btn(true)}>＋ SAVE NODE</button>
              </div>
            )}
          </div>

          <div style={{ padding: "12px 16px", marginTop: "auto", borderTop: "1px solid #0e1a0e" }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#1a2e1a", lineHeight: 1.7 }}>
              <div>📡 = transmitting (radio or mesh)</div>
              <div>📱 = phone GPS · unmarked = mesh GPS</div>
              <div>◆ WX · ▲ relay · ■ base (fixed)</div>
              {mode === "live" && <div style={{ marginTop: 6 }}>20s refresh · TX pulse {TX_LIVE_MS/1000}s</div>}
            </div>
          </div>
        </div>

        {/* Map */}
        <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <div ref={mapDivRef} style={{ position: "absolute", inset: 0, cursor: picking ? "crosshair" : undefined }} />
            {!leafletReady && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#060b06" }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#1e3a1e", letterSpacing: 2 }}>LOADING MAP…</div>
              </div>
            )}
            {leafletReady && !hasData && !replayLoading && (
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none", zIndex: 500 }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#1e3a1e", letterSpacing: 2, marginBottom: 8 }}>● ● ●</div>
                <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: 4, color: "#2a5a2a" }}>AWAITING GPS</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#1a3a1a", marginTop: 6 }}>Mesh nodes, phones, and fixed nodes appear here</div>
              </div>
            )}
            {replayLoading && (
              <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 600, background: "#0a110a", border: "1px solid #1e3a1e", borderRadius: 6, padding: "6px 14px", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#f0a500", letterSpacing: 2 }}>
                LOADING REPLAY DATA…
              </div>
            )}

            {/* Event ticker */}
            {view.ticker.length > 0 && (
              <div style={{ position: "absolute", left: 12, bottom: 12, zIndex: 600, maxWidth: 440, display: "flex", flexDirection: "column", gap: 4 }}>
                {view.ticker.map((e, i) => (
                  <div key={`${e.unit}-${e.t}-${i}`} style={{ background: "#0a110acc", border: `1px solid ${view.refNow - e.t < (mode === "live" ? TX_LIVE_MS : TX_REPLAY_MS) ? "#ff444460" : "#1e3a1e"}`, borderRadius: 6, padding: "5px 10px", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#b8d8a0", backdropFilter: "blur(4px)" }}>
                    <span style={{ color: "#4a6a4a" }}>{fmtClock(e.t)}</span>{" "}
                    <span style={{ color: "#f0a500", fontWeight: 700 }}>{e.display}</span>{" "}
                    <span style={{ color: "#2a5a2a" }}>[{e.kind === "mesh" ? "mesh" : e.channel}]</span>{" "}
                    {e.text.length > 90 ? e.text.slice(0, 90) + "…" : e.text}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Replay control bar */}
          {mode === "replay" && (
            <div style={{ flexShrink: 0, background: "#050a05", borderTop: "1px solid #0e1a0e", padding: "10px 20px", display: "flex", alignItems: "center", gap: 14 }}>
              <button onClick={() => setPlaying(p => !p)} disabled={replayLoading} style={{ ...btn(playing, "#f0a500"), fontSize: 13, padding: "6px 16px" }}>
                {playing ? "❚❚" : "▶"}
              </button>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#f0a500", minWidth: 76 }}>{fmtClock(replayT)}</span>
              <input
                type="range" className="fbx-slider" style={{ flex: 1 }}
                min={windowStartRef.current} max={windowEndRef.current || 1} value={replayT}
                onChange={e => { setReplayT(parseInt(e.target.value)); setPlaying(false); }}
              />
              <div style={{ display: "flex", gap: 4 }}>
                {[10, 60, 300].map(s => (
                  <button key={s} onClick={() => setSpeed(s)} style={btn(speed === s, "#f0a500")}>{s}×</button>
                ))}
              </div>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#1a3a1a" }}>
                {replayFixes.length} fixes · {replayEvents.length} tx
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
