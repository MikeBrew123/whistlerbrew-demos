"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";

const FIREBOX_PASSWORD = "FireBox";
const SUPABASE_URL  = "https://bdgmpkbbohbucwoiucyw.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZ21wa2Jib2hidWN3b2l1Y3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1Nzk3ODEsImV4cCI6MjA5MDE1NTc4MX0.WAuh1vJsqxkdQKoBQ6i_qfHiJyKM-TSJ9BLtn8EyUws";

type Transcript = {
  channel: string; filename: string;
  timestamp: string; transcript: string; speaker?: string;
  signal?: number; readability?: number;
};

const TRANSCRIBE_CHANNELS = new Set(["wfd-ch2-scene", "wfd-ch6-ce"]);

// D2 = requires Dongle 2 (150.5 MHz center) · D2D = Dongle 2 deployment profile (163.9 MHz) · D3 = Dongle 3 (142.5 MHz)
const CHANNEL_STYLE: Record<string, { label: string; color: string; code: string; icon?: string; dongle?: string }> = {
  // ── Dongle 1 (151.22–153.78 MHz) ──────────────────────────────────────────
  "wfd-ch2-scene":       { label: "WFD On Scene",          code: "WFD·CH2",   color: "#f0a500" },
  "wfd-ch6-ce":          { label: "WFD Comb. Events",      code: "WFD·CH6",   color: "#fb923c" },
  "wb-lift-ops":         { label: "WB Lift Ops",           code: "WB·LIFT",   color: "#67e8f9" },
  "wb-ops":              { label: "WB Operations",         code: "WB·OPS",    color: "#a5f3fc" },
  "wb-heliski":          { label: "WB Heliskiing",         code: "WB·HELI",   color: "#7dd3fc" },
  // ── Dongle 2 (149.22–151.78 MHz) ──────────────────────────────────────────
  "wfd-ch5-garibaldi":   { label: "WFD Garibaldi M/A",     code: "WFD·CH5",   color: "#fdba74", dongle: "D2" },
  "bcas-whistler":       { label: "BCAS Whistler",         code: "BCAS·W",    color: "#f87171", dongle: "D2" },
  "pep-sar1":            { label: "PEP SAR 1",             code: "SAR·1",     color: "#c084fc", dongle: "D2" },
  "pep-sar2":            { label: "PEP SAR 2",             code: "SAR·2",     color: "#a78bfa", dongle: "D2" },
  "canada-sar":          { label: "Canada-Wide SAR",       code: "SAR·CAN",   color: "#818cf8", dongle: "D2" },
  // ── Deployment profile (162–165 MHz) — active on Dongle 1 in deployment mode ─
  "wfd-ch3-lost-lake":   { label: "WFD Lost Lake",         code: "WFD·CH3",   color: "#fbbf24" },
  "wfd-ch4-cheakamus":   { label: "WFD Cheakamus",         code: "WFD·CH4",   color: "#fcd34d" },
  "nrs-gold":            { label: "NRS Gold",              code: "NRS·GOLD",  color: "#f59e0b" },
  "nrs-silver":          { label: "NRS Silver",            code: "NRS·SLVR",  color: "#94a3b8" },
  "nrs-bronze":          { label: "NRS Bronze",            code: "NRS·BRNZ",  color: "#b45309" },
  "nrs-white":           { label: "NRS White",             code: "NRS·WHT",   color: "#e2e8f0" },
  "nrs-red":             { label: "NRS Red",               code: "NRS·RED",   color: "#ef4444" },
  "nrs-purple":          { label: "NRS Purple",            code: "NRS·PURP",  color: "#a855f7" },
  "nrs-green":           { label: "NRS Green",             code: "NRS·GRN",   color: "#22c55e" },
  "nrs-pink":            { label: "NRS Pink",              code: "NRS·PNK",   color: "#ec4899" },
  "nrs-blue":            { label: "NRS Blue",              code: "NRS·BLUE",  color: "#3b82f6" },
  "nrs-maroon":          { label: "NRS Maroon",            code: "NRS·MARN",  color: "#9f1239" },
  "nrs-orange":          { label: "NRS Orange",            code: "NRS·ORG",   color: "#f97316" },
  "nrs-brown":           { label: "NRS Brown",             code: "NRS·BRWN",  color: "#92400e" },
  "nrs-yellow":          { label: "NRS Yellow",            code: "NRS·YLW",   color: "#eab308" },
  "nrs-grey":            { label: "NRS Grey",              code: "NRS·GREY",  color: "#6b7280" },
  "nrs-black":           { label: "NRS Black",             code: "NRS·BLK",   color: "#374151" },
  "nrs-copper":          { label: "NRS Copper",            code: "NRS·COPR",  color: "#b45309" },
  // ── Dongle 3 (142.5 MHz) ──────────────────────────────────────────────────
  "ehs-mount-london":    { label: "EHS Mt. London",        code: "EHS·MTNLN", color: "#fb7185", dongle: "D3" },
  // ── Mesh ──────────────────────────────────────────────────────────────────
  "mesh-text":           { label: "Mesh · Text",           code: "MESH·TXT",  color: "#39d353", icon: "📡" },
  "mesh-weather":        { label: "Mesh · Weather",        code: "MESH·WX",   color: "#38bdf8", icon: "🌡" },
};

// Channels per mode — controlled by firebox_config active_mode in Supabase
const HOME_CHANNELS       = ["wfd-ch2-scene", "wfd-ch6-ce", "wb-lift-ops", "wb-ops", "wb-heliski"];
const DEPLOYMENT_CHANNELS = [
  "nrs-gold", "nrs-silver", "nrs-bronze", "nrs-copper",
  "nrs-white", "nrs-red", "nrs-purple", "nrs-green", "nrs-pink",
  "nrs-blue", "nrs-maroon", "nrs-orange", "nrs-brown", "nrs-yellow",
  "nrs-grey", "nrs-black",
];

// Planned channels (D2/D3 not yet connected) — shown in UI with dongle badge
const PLANNED_CHANNELS = [
  "wfd-ch5-garibaldi", "bcas-whistler",
  "pep-sar1", "pep-sar2", "canada-sar",
  "ehs-mount-london",
];

function ch(channel: string) {
  return CHANNEL_STYLE[channel] ?? { label: channel, code: channel.toUpperCase(), color: "#666" };
}

function formatTime(iso: string) {
  try {
    const d   = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const now = new Date();
    const isToday = d.getFullYear() === now.getFullYear()
                 && d.getMonth()    === now.getMonth()
                 && d.getDate()     === now.getDate();
    const time = `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
    if (isToday) return time;
    const mon = String(d.getMonth() + 1).padStart(2,"0");
    const day = String(d.getDate()).padStart(2,"0");
    return `${mon}-${day} ${time}`;
  } catch { return iso; }
}

function QualityBadge({ signal, readability }: { signal?: number; readability?: number }) {
  if (!signal && !readability) return null;
  const s = signal ?? "–";
  const r = readability ?? "–";
  const sum = (signal ?? 0) + (readability ?? 0);
  const color = sum >= 9 ? "#39d353" : sum >= 7 ? "#f0a500" : sum >= 5 ? "#fb923c" : "#ef4444";
  return (
    <span style={{
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 9, fontWeight: 700,
      color, letterSpacing: 0.5,
      opacity: 0.85,
    }}>{s}×{r}</span>
  );
}

type WeatherReading = { ts: string; node: string; temp?: number; humidity?: number; pressure?: number; };

type Incident = {
  id: string; name: string; start_at: string;
  end_at?: string; status: "active" | "closed"; notes?: string;
};

// ── Keyword alerting ──────────────────────────────────────────────────────────
const ALERT_KEYWORDS = [
  "mayday","may day","structure fire","working fire","evacuation","evacuate",
  "missing person","overrun","spot fire","cardiac","unconscious","entrapment",
];
function detectKeyword(text: string): string | null {
  const lower = text.toLowerCase();
  return ALERT_KEYWORDS.find(k => lower.includes(k)) ?? null;
}

// ── Incident helpers ──────────────────────────────────────────────────────────
function fmtIncidentDuration(start: string, end?: string): string {
  const ms  = new Date(end ?? new Date()).getTime() - new Date(start).getTime();
  const h   = Math.floor(ms / 3600000);
  const m   = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-CA", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

function parseWeather(transcript: string, speaker?: string, ts?: string): WeatherReading {
  const r: WeatherReading = { ts: ts ?? "", node: speaker ?? "?" };
  for (const part of transcript.split("|")) {
    const t = part.trim();
    if (t.startsWith("Temp:"))     r.temp     = parseFloat(t.replace("Temp:","").replace("C","").trim());
    if (t.startsWith("Humidity:")) r.humidity = parseFloat(t.replace("Humidity:","").replace("%","").trim());
    if (t.startsWith("Pressure:")) r.pressure = parseFloat(t.replace("Pressure:","").replace("hPa","").trim());
  }
  return r;
}

function trendArrow(curr?: number, old?: number, thr = 0.5): { sym: string; color: string } {
  if (curr == null || old == null) return { sym: "—", color: "#2a3a2a" };
  if (curr > old + thr) return { sym: "↑", color: "#39d353" };
  if (curr < old - thr) return { sym: "↓", color: "#ff6b6b" };
  return { sym: "→", color: "#4a6a3a" };
}

function ageLabel(iso: string): { text: string; color: string } {
  const sec = (Date.now() - new Date(iso).getTime()) / 1000;
  if (sec < 300)  return { text: `${Math.round(sec/60)}m ago`, color: "#39d353" };
  if (sec < 1800) return { text: `${Math.round(sec/60)}m ago`, color: "#f0a500" };
  if (sec < 7200) return { text: `${Math.round(sec/3600)}h ago`, color: "#f0a500" };
  return { text: "stale", color: "#3a3a3a" };
}

function useClock() {
  const [t, setT] = useState("");
  useEffect(() => {
    const tick = () => setT(new Date().toLocaleTimeString("en-CA", { hour12: false }));
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, []);
  return t;
}

// ── Corner bracket decoration ─────────────────────────────────────────────────
function Brackets({ color = "#1a2e1a", size = 7 }: { color?: string; size?: number }) {
  const s = (extra: React.CSSProperties): React.CSSProperties => ({
    position: "absolute", width: size, height: size,
    borderColor: color, borderStyle: "solid", pointerEvents: "none", ...extra,
  });
  return (
    <>
      <span style={s({ top: 0, left: 0, borderWidth: "2px 0 0 2px" })} />
      <span style={s({ top: 0, right: 0, borderWidth: "2px 2px 0 0" })} />
      <span style={s({ bottom: 0, left: 0, borderWidth: "0 0 2px 2px" })} />
      <span style={s({ bottom: 0, right: 0, borderWidth: "0 2px 2px 0" })} />
    </>
  );
}

// ── Global styles ─────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700&family=JetBrains+Mono:wght@400;500;700&family=Barlow+Condensed:wght@400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  @keyframes pulse     { 0%,100%{opacity:1} 50%{opacity:0.35} }
  @keyframes blink     { 0%,49%{opacity:1} 50%,100%{opacity:0} }
  @keyframes fbTicker  { 0%{transform:translateX(100vw)} 100%{transform:translateX(-100%)} }
  @keyframes slideIn   { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }
  @keyframes ripple    { 0%{box-shadow:0 0 0 0 rgba(255,68,68,0.4)} 70%{box-shadow:0 0 0 8px rgba(255,68,68,0)} 100%{box-shadow:0 0 0 0 rgba(255,68,68,0)} }
  @keyframes scanPulse { 0%,100%{opacity:0.03} 50%{opacity:0.06} }

  .fb-card   { animation: slideIn 0.2s ease both; }
  .fb-reply:hover  { border-color: #1a4a1a !important; color: #39d353 !important; background: #081408 !important; }
  .fb-tab:hover    { color: #b8d8a0 !important; background: #0f160f !important; }
  .fb-btn:hover    { opacity: 0.8; }
  .fb-textarea:focus { border-color: #f0a500 !important; outline: none; }
  .crossover-card  { animation: ripple 2s ease-in-out infinite; }
`;

function FireBoxStyles() { return <style dangerouslySetInnerHTML={{ __html: CSS }} />; }

// ── Mesh compose ───────────────────────────────────────────────────────────────
const OUTBOX_URL = `${SUPABASE_URL}/rest/v1/firebox_outbox`;
const SB_HEADERS = { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` };

async function sendMesh(message: string): Promise<boolean> {
  try {
    const r = await fetch(OUTBOX_URL, {
      method: "POST",
      headers: { ...SB_HEADERS, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ message }),
    });
    return r.ok;
  } catch { return false; }
}

function MeshCompose({ replyTo, onClose }: { replyTo?: string; onClose: () => void }) {
  const [text, setText] = useState(replyTo ? `↩ ` : "");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { taRef.current?.focus(); }, []);

  const submit = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    const ok = await sendMesh(text.trim());
    setBusy(false);
    if (ok) { setSent(true); setTimeout(onClose, 1400); }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(2,6,2,0.92)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width: "100%", maxWidth: 500, position: "relative",
        background: "#080e08",
        border: "1px solid #1c2e1c",
      }}>
        <Brackets color="#2a4a2a" size={9} />

        {/* Title bar */}
        <div style={{
          borderBottom: "1px solid #1c2e1c", padding: "10px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "#0b120b",
        }}>
          <span style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: 3, color: "#39d353" }}>
            ▶ MESH TRANSMIT
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#2a4a2a", letterSpacing: 1 }}>
              VIA BREW1
            </span>
            <button onClick={onClose} className="fb-btn" style={{ background: "none", border: "none", color: "#3a5a3a", fontSize: 18, cursor: "pointer", lineHeight: 1, padding: "0 2px" }}>×</button>
          </div>
        </div>

        <div style={{ padding: "16px 20px 20px" }}>
          {sent ? (
            <div style={{ textAlign: "center", padding: "28px 0" }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 28, color: "#39d353", marginBottom: 10 }}>✓</div>
              <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 600, fontSize: 14, letterSpacing: 2, color: "#39d353" }}>MESSAGE QUEUED</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#2a5a2a", marginTop: 6 }}>Brew1 will transmit within 5 seconds</div>
            </div>
          ) : (
            <>
              {/* Prompt line */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: "#39d353", marginTop: 11, flexShrink: 0 }}>▶</span>
                <textarea
                  ref={taRef} value={text} rows={4}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}
                  placeholder="Enter message…"
                  className="fb-textarea"
                  style={{
                    flex: 1, background: "#040a04",
                    border: "1px solid #1a2e1a", padding: "10px 12px",
                    color: "#b8d8a0", fontSize: 13, lineHeight: 1.6,
                    resize: "none", fontFamily: "'JetBrains Mono',monospace",
                    transition: "border-color 0.2s",
                  }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#1e3a1e", letterSpacing: 0.5 }}>⌘↵ transmit</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={onClose} className="fb-btn" style={{
                    padding: "7px 16px", border: "1px solid #1c2e1c", background: "transparent",
                    color: "#3a5a3a", fontSize: 11, cursor: "pointer",
                    fontFamily: "'Rajdhani',sans-serif", fontWeight: 600, letterSpacing: 2,
                  }}>ABORT</button>
                  <button onClick={submit} disabled={busy || !text.trim()} className="fb-btn" style={{
                    padding: "7px 20px", border: "none",
                    background: busy ? "#0d200d" : "#0f2a0f",
                    color: busy ? "#2a5a2a" : "#39d353",
                    fontSize: 11, fontWeight: 700, cursor: busy ? "default" : "pointer",
                    fontFamily: "'Rajdhani',sans-serif", letterSpacing: 2,
                    borderLeft: `3px solid ${busy ? "#1a3a1a" : "#39d353"}`,
                  }}>{busy ? "SENDING…" : "TRANSMIT"}</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Weather node card ──────────────────────────────────────────────────────────
function WeatherNodeCard({ nodeHistory }: { nodeHistory: WeatherReading[] }) {
  const latest = nodeHistory[0];
  const old    = nodeHistory.length >= 5 ? nodeHistory[nodeHistory.length - 1] : undefined;
  const age    = ageLabel(latest.ts);

  const tTemp = trendArrow(latest.temp,     old?.temp,     0.5);
  const tHum  = trendArrow(latest.humidity, old?.humidity, 2);
  const tPres = trendArrow(latest.pressure, old?.pressure, 0.5);

  const tSpan = old ? Math.round((new Date(latest.ts).getTime() - new Date(old.ts).getTime()) / 60000) : 0;
  const crossover = latest.temp != null && latest.humidity != null && latest.temp >= latest.humidity;
  const extreme   = latest.temp != null && latest.humidity != null && latest.temp >= 30 && latest.humidity <= 15;

  return (
    <div className={crossover ? "crossover-card" : ""} style={{
      position: "relative", flex: "0 0 auto",
      padding: "10px 16px 10px 14px",
      background: crossover ? (extreme ? "#130400" : "#0e0900") : "#090e09",
      border: `1px solid ${crossover ? (extreme ? "#5a1a1a" : "#4a2a00") : "#1a2a1a"}`,
      borderTop: `2px solid ${crossover ? (extreme ? "#ff4444" : "#f0a500") : "#1a3a1a"}`,
      transition: "border-color 0.4s",
      minWidth: 280,
    }}>
      <Brackets color={crossover ? (extreme ? "#5a1a1a" : "#4a2a00") : "#1a2e1a"} size={6} />

      {/* Node ID + age */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div>
          <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: 2.5, color: crossover ? "#6a3a00" : "#1e4a1e", marginBottom: 2 }}>WX NODE</div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700, color: crossover ? "#fb923c" : "#38bdf8" }}>{latest.node}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end", marginBottom: 2 }}>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: age.color, animation: "pulse 2s ease-in-out infinite", display: "inline-block" }} />
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: age.color }}>{age.text}</span>
          </div>
          {tSpan > 0 && <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#2a4a2a" }}>{tSpan}m trend</div>}
        </div>
      </div>

      {/* Metrics row */}
      <div style={{ display: "flex", gap: 16, alignItems: "flex-end" }}>
        {[
          { key: "TEMP",  val: latest.temp     != null ? `${latest.temp.toFixed(1)}°` : "—",      unit: "C", trend: tTemp },
          { key: "RH",    val: latest.humidity != null ? `${Math.round(latest.humidity)}`  : "—", unit: "%", trend: tHum  },
          { key: "hPa",   val: latest.pressure != null ? `${latest.pressure.toFixed(1)}`   : "—", unit: "",  trend: tPres },
        ].map(({ key, val, unit, trend }) => (
          <div key={key}>
            <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: 2, color: "#2a4a2a", marginBottom: 1 }}>{key}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 700, color: crossover && key !== "hPa" ? (extreme ? "#ff6b6b" : "#fbbf24") : "#c8e8b0", letterSpacing: -1 }}>{val}</span>
              {unit && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#3a5a3a" }}>{unit}</span>}
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, fontWeight: 700, color: trend.color, marginLeft: 2 }}>{trend.sym}</span>
            </div>
          </div>
        ))}

        {crossover && (
          <div style={{
            marginLeft: "auto",
            padding: "4px 10px",
            background: extreme ? "#2a0000" : "#1e1000",
            border: `1px solid ${extreme ? "#ff4444" : "#f0a500"}`,
            animation: extreme ? "blink 1.2s step-end infinite" : undefined,
          }}>
            <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: 2, color: extreme ? "#ff6b6b" : "#fbbf24" }}>
              {extreme ? "⚠ EXTREME" : "⚠ CROSSOVER"}
            </div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, color: extreme ? "#ff4444" : "#f0a500", marginTop: 1 }}>
              T{latest.temp?.toFixed(0)}≥RH{latest.humidity?.toFixed(0)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function WeatherPanel({ history }: { history: WeatherReading[] }) {
  if (history.length === 0) return null;
  const nodes = new Map<string, WeatherReading[]>();
  for (const r of history) {
    if (!nodes.has(r.node)) nodes.set(r.node, []);
    nodes.get(r.node)!.push(r);
  }
  return (
    <div style={{ borderBottom: "1px solid #0e1a0e", padding: "8px 24px", background: "#060b06" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 2 }}>
          {Array.from(nodes.entries()).map(([node, nh]) => <WeatherNodeCard key={node} nodeHistory={nh} />)}
        </div>
      </div>
    </div>
  );
}

// ── Mesh ticker ────────────────────────────────────────────────────────────────
function MeshTicker({ messages }: { messages: Transcript[] }) {
  const latest = messages.filter(m => m.channel !== "mesh-weather")[0];
  if (!latest) return null;
  const label = `${latest.speaker ?? "MESH"} ▶ ${latest.transcript}`;
  const secs  = Math.max(16, label.length * 0.21);
  return (
    <div style={{ height: 30, background: "#040904", borderBottom: "1px solid #0b160b", display: "flex", alignItems: "center", overflow: "hidden" }}>
      {/* Label pill */}
      <div style={{
        flexShrink: 0, padding: "0 14px", height: "100%",
        display: "flex", alignItems: "center", gap: 8,
        borderRight: "1px solid #0b160b", background: "#060e06",
      }}>
        <span style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 9, letterSpacing: 3, color: "#1a4a1a" }}>MESH</span>
        <span style={{
          fontFamily: "'JetBrains Mono',monospace", fontSize: 9,
          padding: "1px 5px", background: "#0b1e0b",
          color: "#39d353",
        }}>{messages.length}</span>
      </div>
      {/* Scrolling text */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <div key={latest.timestamp} style={{
          animation: `fbTicker ${secs}s linear 1 forwards`,
          whiteSpace: "nowrap", fontFamily: "'JetBrains Mono',monospace",
          fontSize: 11, color: "#39d353", lineHeight: "30px", paddingLeft: 14,
          letterSpacing: 0.3,
        }}>
          {label}
          {messages.length > 1 && <span style={{ color: "#1a3a1a", marginLeft: 40 }}>+{messages.length - 1} more</span>}
        </div>
      </div>
    </div>
  );
}

// ── Login ──────────────────────────────────────────────────────────────────────
function LoginScreen({ onAuth }: { onAuth: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const clock = useClock();

  const submit = () => {
    if (value === FIREBOX_PASSWORD) { sessionStorage.setItem("firebox_auth","true"); onAuth(); }
    else { setError(true); setShake(true); setValue(""); setTimeout(() => setShake(false), 400); }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#060b06",
      backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(57,211,83,0.015) 3px, rgba(57,211,83,0.015) 4px)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 32, fontFamily: "'Rajdhani',sans-serif",
    }}>
      <FireBoxStyles />

      {/* Status bar */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, height: 32,
        borderBottom: "1px solid #0e1a0e", background: "#040904",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px",
      }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#1a3a1a", letterSpacing: 1 }}>FIREBOX v2 · SEA TO SKY</span>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#1a3a1a" }}>{clock}</span>
      </div>

      <div style={{ width: "100%", maxWidth: 380, position: "relative" }}>
        <Brackets color="#1a3a1a" size={10} />

        <div style={{
          border: "1px solid #1a2e1a",
          background: "#080e08",
          padding: "36px 36px 32px",
          transform: shake ? "translateX(-4px)" : "none",
          transition: "transform 0.08s",
        }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 10, letterSpacing: 5, color: "#1a3a1a", marginBottom: 12 }}>WHISTLER, BC · 50°07′N 122°57′W</div>
            <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: 6, color: "#b8d8a0" }}>FIREBOX</div>
            <div style={{ fontSize: 10, letterSpacing: 4, color: "#2a5a2a", marginTop: 8 }}>AUTHENTICATION REQUIRED</div>
            <div style={{ width: 40, height: 1, background: "#1a3a1a", margin: "16px auto 0" }} />
          </div>

          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 9, letterSpacing: 3, color: "#1e4a1e", marginBottom: 6 }}>ACCESS CODE</div>
            <input
              type="password" value={value} autoFocus
              onChange={e => { setValue(e.target.value); setError(false); }}
              onKeyDown={e => e.key === "Enter" && submit()}
              className="fb-textarea"
              style={{
                width: "100%", background: "#040904",
                border: `1px solid ${error ? "#ff4444" : "#1a2e1a"}`,
                padding: "11px 14px", color: "#b8d8a0", fontSize: 13,
                fontFamily: "'JetBrains Mono',monospace",
                transition: "border-color 0.2s",
              }}
            />
            {error && (
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#ff4444", marginTop: 6, letterSpacing: 1 }}>
                ✕ ACCESS DENIED
              </div>
            )}
          </div>

          <button onClick={submit} className="fb-btn" style={{
            width: "100%", padding: "12px 0", border: "none", marginTop: 16,
            background: "#f0a500", color: "#000",
            fontFamily: "'Rajdhani',sans-serif", fontWeight: 700,
            fontSize: 13, letterSpacing: 4, cursor: "pointer",
          }}>AUTHENTICATE</button>

          <div style={{ textAlign: "center", marginTop: 20 }}>
            <Image src="/logo.png" alt="WhistlerBrew" width={100} height={25} style={{ height: "auto", opacity: 0.2 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main feed ─────────────────────────────────────────────────────────────────
function FireBoxFeed() {
  const [transcripts,    setTranscripts]    = useState<Transcript[]>([]);
  const [meshMessages,   setMeshMessages]   = useState<Transcript[]>([]);
  const [weatherHistory, setWeatherHistory] = useState<WeatherReading[]>([]);
  const [channelFilter,  setFilter]         = useState<string>("all");
  const [compose,        setCompose]        = useState<{ replyTo?: string } | null>(null);
  const [lastUpdated,    setLastUpdated]    = useState<Date | null>(null);
  const [live,    setLive]    = useState(true);
  const [offset,  setOffset]  = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [nodeAliases,    setNodeAliases]    = useState<Record<string, string>>({});
  const [incidents,      setIncidents]      = useState<Incident[]>([]);
  const [showIncident,   setShowIncident]   = useState(false);
  const [showExport,     setShowExport]     = useState<Incident | null>(null);
  const [exportData,     setExportData]     = useState<string>("");
  const [exportLoading,  setExportLoading]  = useState(false);
  const [keyword,        setKeyword]        = useState<string | null>(null);
  const [incidentForm,   setIncidentForm]   = useState({ name: "", start_at: "" });
  const [activeMode,     setActiveMode]     = useState<"home" | "deployment">("home");
  const [modeSending,    setModeSending]    = useState(false);

  const MONITORED_CHANNELS = activeMode === "deployment" ? DEPLOYMENT_CHANNELS : HOME_CHANNELS;

  const activeIncident = incidents.find(i => i.status === "active") ?? null;

  // Resolve display name: alias map → raw speaker value
  const resolveName = useCallback((speaker?: string) => {
    if (!speaker) return speaker;
    // Try matching by hex suffix (e.g. "e598" → alias for node ending in e598)
    const lower = speaker.toLowerCase();
    for (const [hex, alias] of Object.entries(nodeAliases)) {
      if (hex.endsWith(lower) || hex === lower) return alias;
    }
    return speaker;
  }, [nodeAliases]);
  const feedRef = useRef<HTMLDivElement>(null);
  const prevRef = useRef(0);
  const clock   = useClock();
  const PAGE = 50;

  const fetchFeed = useCallback(async () => {
    try {
      const q = channelFilter === "all" ? "" : `&channel=${channelFilter}`;
      const r = await fetch(`/api/firebox?limit=${PAGE}&offset=0${q}`);
      if (!r.ok) return;
      const d = await r.json();
      const txs: Transcript[] = d.transcripts ?? [];
      setTranscripts(txs);
      setOffset(PAGE);
      setHasMore(txs.length === PAGE);
      setLastUpdated(new Date());
      if (txs.length > prevRef.current) feedRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      prevRef.current = txs.length;
    } catch {}
  }, [channelFilter]);

  const fetchMesh = useCallback(async () => {
    try {
      const url = `${SUPABASE_URL}/rest/v1/firebox_transcripts?channel=in.(mesh-text,mesh-weather)&order=recorded_at.desc&limit=10`;
      const r = await fetch(url, { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } });
      if (!r.ok) return;
      const rows = await r.json();
      setMeshMessages(rows.map((row: Record<string, string>) => ({
        channel: row.channel, filename: row.filename,
        timestamp: row.recorded_at, transcript: row.transcript, speaker: row.speaker,
      })));
    } catch {}
  }, []);

  const fetchWeather = useCallback(async () => {
    try {
      const url = `${SUPABASE_URL}/rest/v1/firebox_transcripts?channel=eq.mesh-weather&order=recorded_at.desc&limit=60`;
      const r = await fetch(url, { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } });
      if (!r.ok) return;
      const rows = await r.json();
      setWeatherHistory(rows.map((row: Record<string, string>) =>
        parseWeather(row.transcript, row.speaker, row.recorded_at)
      ));
    } catch {}
  }, []);

  const loadMore = async () => {
    setLoading(true);
    try {
      const q = channelFilter === "all" ? "" : `&channel=${channelFilter}`;
      const r = await fetch(`/api/firebox?limit=${PAGE}&offset=${offset}${q}`);
      if (!r.ok) return;
      const d = await r.json();
      const more: Transcript[] = d.transcripts ?? [];
      setTranscripts(p => [...p, ...more]);
      setOffset(o => o + PAGE);
      setHasMore(more.length === PAGE);
    } catch {}
    setLoading(false);
  };

  // Fetch node aliases once on mount, refresh every 5 min
  useEffect(() => {
    const load = () => fetch("/api/firebox-provision")
      .then(r => r.ok ? r.json() : {}).then(d => setNodeAliases(d)).catch(() => {});
    load(); const t = setInterval(load, 300000); return () => clearInterval(t);
  }, []);

  // Fetch incidents
  const fetchIncidents = useCallback(async () => {
    const r = await fetch("/api/firebox-incidents").catch(() => null);
    if (r?.ok) { const d = await r.json(); setIncidents(d.incidents ?? []); }
  }, []);
  useEffect(() => { fetchIncidents(); }, [fetchIncidents]);

  // Fetch + poll active mode from Supabase firebox_config
  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/firebox_config?key=eq.active_mode&select=value`, { headers: SB_HEADERS });
        if (!r.ok) return;
        const rows = await r.json();
        if (rows[0]?.value) setActiveMode(rows[0].value as "home" | "deployment");
      } catch {}
    };
    load(); const t = setInterval(load, 15000); return () => clearInterval(t);
  }, []);

  const sendMode = async (mode: "home" | "deployment") => {
    setModeSending(true);
    await sendMesh(`__SET_MODE__:${mode}`);
    setActiveMode(mode);
    setModeSending(false);
  };

  // Keyword scan — check newest 3 transcripts on each fetch
  useEffect(() => {
    for (const tx of transcripts.slice(0, 3)) {
      const hit = detectKeyword(tx.transcript);
      if (hit) { setKeyword(hit); return; }
    }
  }, [transcripts]);

  const startIncident = async () => {
    if (!incidentForm.name.trim()) return;
    await fetch("/api/firebox-incidents", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: incidentForm.name, start_at: incidentForm.start_at || undefined }),
    });
    setShowIncident(false); setIncidentForm({ name: "", start_at: "" }); fetchIncidents();
  };

  const endIncident = async (id: string) => {
    await fetch("/api/firebox-incidents", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "closed" }),
    });
    fetchIncidents();
  };

  const exportIncident = async (inc: Incident) => {
    setExportLoading(true); setShowExport(inc);
    const r = await fetch(`/api/firebox-incidents?id=${inc.id}`, { method: "DELETE" }).catch(() => null);
    if (!r?.ok) { setExportLoading(false); return; }
    const d = await r.json();
    const txs: Array<{ channel: string; recorded_at: string; speaker: string | null; transcript: string }> = d.transcripts ?? [];

    const CHANNEL_LABELS: Record<string, string> = {
      "wfd-ch2-scene": "WFD ON SCENE", "wfd-ch6-ce": "WFD COMB.EVENTS",
      "mesh-text": "MESH·TEXT", "mesh-weather": "MESH·WEATHER",
    };
    const speakers = new Set(txs.map(t => t.speaker).filter(Boolean));
    const byCh: Record<string, number> = {};
    txs.forEach(t => { byCh[t.channel] = (byCh[t.channel] ?? 0) + 1; });

    const lines = [
      "╔══════════════════════════════════════════════════════╗",
      "║            FIREBOX DEBRIEF EXPORT                    ║",
      "╚══════════════════════════════════════════════════════╝",
      "",
      `INCIDENT : ${inc.name}`,
      `START    : ${fmtDate(inc.start_at)}`,
      `END      : ${inc.end_at ? fmtDate(inc.end_at) : "ONGOING"}`,
      `DURATION : ${fmtIncidentDuration(inc.start_at, inc.end_at)}`,
      `EXPORTED : ${fmtDate(new Date().toISOString())}`,
      "",
      "── UNITS DEPLOYED ────────────────────────────────────",
      Array.from(speakers).join(" · ") || "(none recorded)",
      "",
      "── CHANNEL ACTIVITY ──────────────────────────────────",
      ...Object.entries(byCh).map(([ch, n]) => `  ${(CHANNEL_LABELS[ch] ?? ch).padEnd(22)} ${n} transmissions`),
      "",
      `── TRANSCRIPTS (${txs.length} total) ──────────────────────────`,
      "",
      ...txs.filter(t => !t.channel.startsWith("mesh-weather")).map(t =>
        `[${new Date(t.recorded_at).toLocaleTimeString("en-CA",{hour12:false})}] ${(CHANNEL_LABELS[t.channel]??t.channel).padEnd(18)} ${t.speaker ? `[${t.speaker}] ` : ""}${t.transcript}`
      ),
      "",
      "── WEATHER READINGS ──────────────────────────────────",
      "",
      ...txs.filter(t => t.channel === "mesh-weather").map(t =>
        `[${new Date(t.recorded_at).toLocaleTimeString("en-CA",{hour12:false})}] ${t.speaker ?? ""} ${t.transcript}`
      ),
      "",
      "══════════════════════════════════════════════════════",
      "Paste this block into Claude to generate your debrief.",
      "══════════════════════════════════════════════════════",
    ];
    setExportData(lines.join("\n")); setExportLoading(false);
  };

  useEffect(() => { setOffset(0); setHasMore(true); }, [channelFilter]);
  useEffect(() => {
    fetchFeed(); fetchMesh(); fetchWeather();
    if (!live) return;
    const t1 = setInterval(fetchFeed,    30000);
    const t2 = setInterval(fetchMesh,    15000);
    const t3 = setInterval(fetchWeather, 60000);
    return () => { clearInterval(t1); clearInterval(t2); clearInterval(t3); };
  }, [fetchFeed, fetchMesh, fetchWeather, live]);

  const activeChannels = Array.from(new Set([
    ...MONITORED_CHANNELS,
    ...PLANNED_CHANNELS,
    ...transcripts.map(t => t.channel).filter(c => !c.startsWith("mesh-")),
  ]));

  const isMeshFilter = channelFilter.startsWith("mesh-");
  const isPlanned    = PLANNED_CHANNELS.includes(channelFilter);
  const isAudioOnly  = channelFilter !== "all" && !TRANSCRIBE_CHANNELS.has(channelFilter) && !isMeshFilter && !isPlanned;
  const filteredTx   = channelFilter === "all"
    ? transcripts
    : transcripts.filter(t => t.channel === channelFilter);

  return (
    <div style={{
      minHeight: "100vh", background: "#060b06", color: "#b8d8a0",
      fontFamily: "'Rajdhani',sans-serif",
      backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(57,211,83,0.012) 3px,rgba(57,211,83,0.012) 4px)",
      display: "flex", flexDirection: "column",
    }}>
      <FireBoxStyles />

      {/* ── Header ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "#050a05", borderBottom: "1px solid #0e1a0e",
        padding: "0 24px",
      }}>
        <div style={{ maxWidth: 760, margin: "0 auto", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>

          {/* Left: nav + title + live status */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link href="/projects" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#1e3a1e", textDecoration: "none", letterSpacing: 1 }}>← BACK</Link>
            <div style={{ width: 1, height: 20, background: "#0e1a0e" }} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 5, color: "#c8e8b0", lineHeight: 1 }}>FIREBOX</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, color: "#1e3a1e", letterSpacing: 1.5, marginTop: 1 }}>SEA TO SKY RADIO</div>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "3px 10px", border: `1px solid ${live ? "#0e2e0e" : "#1e1e1e"}`,
              background: live ? "#060e06" : "transparent",
            }}>
              <span style={{ width: 5, height: 5, background: live ? "#39d353" : "#333", borderRadius: "50%", animation: live ? "pulse 2s ease-in-out infinite" : "none" }} />
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: live ? "#39d353" : "#333", letterSpacing: 2 }}>{live ? "LIVE" : "PAUSED"}</span>
            </div>
          </div>

          {/* Right: clock + buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, color: "#2a5a2a", letterSpacing: 1 }}>{clock}</span>
            {lastUpdated && (
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#1a3a1a" }}>
                ↻ {formatTime(lastUpdated.toISOString())}
              </span>
            )}
            <Link href="/projects/firebox/map" style={{
              padding: "5px 12px", border: "1px solid #1a3a1a", background: "#060e06",
              color: "#38bdf8", cursor: "pointer", textDecoration: "none",
              fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 10, letterSpacing: 2,
              display: "inline-block", lineHeight: "normal",
            }}>🗺 MAP</Link>
            <button onClick={() => setShowIncident(true)} className="fb-btn" style={{
              padding: "5px 12px", border: `1px solid ${activeIncident ? "#f0a50040" : "#1a3a1a"}`,
              background: activeIncident ? "#1a0e00" : "#060e06",
              color: activeIncident ? "#f0a500" : "#2a5a2a", cursor: "pointer",
              fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 10, letterSpacing: 1.5,
            }}>{activeIncident ? `⚡ ${activeIncident.name.toUpperCase()}` : "+ INCIDENT"}</button>
            <button
              onClick={() => sendMode(activeMode === "home" ? "deployment" : "home")}
              disabled={modeSending}
              className="fb-btn"
              style={{
                padding: "5px 12px", border: `1px solid ${activeMode === "deployment" ? "#7a200080" : "#1a5c2e80"}`,
                background: activeMode === "deployment" ? "#1a0a00" : "#001a0a",
                color: activeMode === "deployment" ? "#fb923c" : "#39d353",
                cursor: modeSending ? "default" : "pointer",
                fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 10, letterSpacing: 1.5,
                opacity: modeSending ? 0.5 : 1,
              }}
            >{activeMode === "deployment" ? "🔥 DEPLOY" : "🏔 WHISTLER"}</button>
            <button onClick={() => setCompose({})} className="fb-btn" style={{
              padding: "5px 14px", border: "1px solid #1a3a1a", background: "#060e06",
              color: "#39d353", cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
              fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: 2,
            }}>📡 MESH</button>
            <button onClick={() => setLive(v => !v)} className="fb-btn" style={{
              padding: "5px 12px", border: "1px solid #1a1a1a", background: "transparent",
              color: "#2a4a2a", cursor: "pointer",
              fontFamily: "'Rajdhani',sans-serif", fontWeight: 600, fontSize: 10, letterSpacing: 2,
            }}>{live ? "PAUSE" : "RESUME"}</button>
          </div>
        </div>
      </header>

      {/* ── Keyword alert ── */}
      {keyword && (
        <div style={{
          background: "#3a0000", borderBottom: "1px solid #ff000040",
          padding: "8px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
          animation: "pulse 1s ease-in-out 3",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16 }}>🚨</span>
            <span style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 800, fontSize: 13, letterSpacing: 2, color: "#ff4444" }}>
              KEYWORD DETECTED: {keyword.toUpperCase()}
            </span>
          </div>
          <button onClick={() => setKeyword(null)} style={{ background: "none", border: "none", color: "#ff444480", cursor: "pointer", fontSize: 18 }}>×</button>
        </div>
      )}

      {/* ── Mesh ticker ── */}
      <MeshTicker messages={meshMessages} />

      {/* ── Weather ── */}
      <WeatherPanel history={weatherHistory} />

      {/* ── Channel tabs ── */}
      <div style={{ borderBottom: "1px solid #0e1a0e", padding: "0 24px", overflowX: "auto", background: "#060b06" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", gap: 1, paddingTop: 8 }}>
          {(["all", ...activeChannels, "mesh-text", "mesh-weather"] as string[]).map(c => {
            const s       = c === "all" ? { label: "ALL", code: "ALL", color: "#4a6a4a", dongle: undefined } : ch(c);
            const active  = channelFilter === c;
            const isMesh  = c.startsWith("mesh-");
            const planned = PLANNED_CHANNELS.includes(c);
            const dongle  = (s as { dongle?: string }).dongle;
            const dongleColor = dongle === "D3" ? "#fb7185" : dongle === "D2D" ? "#fbbf24" : "#a78bfa";
            return (
              <button key={c} onClick={() => setFilter(c)} className="fb-tab" style={{
                padding: "5px 10px 7px", cursor: "pointer", border: "none",
                borderBottom: active ? `2px solid ${s.color}` : "2px solid transparent",
                borderTop: planned && !active ? "1px solid #1a1a1a" : "1px solid transparent",
                background: active ? `${s.color}12` : "transparent",
                color: active ? s.color : planned ? "#283828" : "#2a4a2a",
                fontFamily: "'Rajdhani',sans-serif", fontWeight: active ? 700 : 600,
                fontSize: 10, letterSpacing: active ? 2 : 1.5,
                whiteSpace: "nowrap", transition: "all 0.15s",
                display: "flex", alignItems: "center", gap: 4,
                opacity: planned && !active ? 0.6 : 1,
              }}>
                {isMesh && <span style={{ fontSize: 9 }}>{(CHANNEL_STYLE[c] as { icon?: string })?.icon}</span>}
                {s.code ?? s.label}
                {dongle && (
                  <span style={{
                    fontSize: 7, fontFamily: "'JetBrains Mono',monospace",
                    color: active ? dongleColor : dongleColor + "80",
                    letterSpacing: 0, fontWeight: 700,
                    padding: "0 3px", border: `1px solid ${dongleColor}40`,
                  }}>{dongle}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Audio player ── */}
      {channelFilter !== "all" && !isMeshFilter && !isPlanned && (
        <div style={{ borderBottom: "1px solid #0e1a0e", padding: "8px 24px", background: "#050905" }}>
          <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <span style={{ width: 5, height: 5, background: "#39d353", borderRadius: "50%", animation: "pulse 2s ease-in-out infinite" }} />
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#1e4a1e", letterSpacing: 2 }}>LIVE AUDIO</span>
            </div>
            <audio controls src={`https://firebox.tail4bb545.ts.net/${channelFilter}.mp3`}
              style={{ width: "100%", height: 28, colorScheme: "dark" } as React.CSSProperties} />
          </div>
        </div>
      )}

      {/* ── Feed ── */}
      <main style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }} ref={feedRef}>
        <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 8 }}>

          {isPlanned ? (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              {(() => { const s = ch(channelFilter); const d = (s as {dongle?:string}).dongle ?? "D2"; const dc = d === "D3" ? "#fb7185" : d === "D2D" ? "#fbbf24" : "#a78bfa"; return (
                <>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: dc, letterSpacing: 2, marginBottom: 12,
                    padding: "4px 14px", border: `1px solid ${dc}40`, display: "inline-block" }}>{d} REQUIRED</div>
                  <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: 4, color: s.color, marginBottom: 8 }}>{s.code}</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#1e3a1e" }}>{s.label.toUpperCase()}</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#1a2a1a", marginTop: 8 }}>DONGLE NOT YET CONNECTED · PENDING HARDWARE</div>
                </>
              ); })()}
            </div>
          ) : isAudioOnly ? (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 32, color: "#1a3a1a", marginBottom: 16 }}>♪</div>
              <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: 4, color: "#2a5a2a" }}>{ch(channelFilter).code}</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#1a3a1a", marginTop: 8 }}>AUDIO MONITORING · NO TRANSCRIPTION</div>
            </div>

          ) : filteredTx.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: 3, color: "#1a3a1a", marginBottom: 16, animation: "pulse 3s ease-in-out infinite" }}>● ● ●</div>
              <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: 4, color: "#2a5a2a" }}>MONITORING</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#1a3a1a", marginTop: 8 }}>AWAITING RADIO TRAFFIC</div>
            </div>

          ) : filteredTx.map((tx, i) => {
            const s      = ch(tx.channel);
            const isMesh = tx.channel.startsWith("mesh-");
            const isWx   = tx.channel === "mesh-weather";
            const displaySpeaker = resolveName(tx.speaker);
            const isDisp = displaySpeaker?.toLowerCase() === "dispatch";

            return (
              <div key={`${tx.timestamp}-${i}`} className="fb-card" style={{
                position: "relative",
                background: isMesh ? "#090f09" : "#080d08",
                borderLeft: `3px solid ${s.color}`,
                borderBottom: `1px solid ${isMesh ? s.color + "20" : "#0e1a0e"}`,
                borderTop: "1px solid transparent",
                borderRight: "1px solid transparent",
                padding: "12px 16px",
                animationDelay: `${Math.min(i * 0.03, 0.3)}s`,
              }}>
                {/* Row 1: channel code, speaker, timestamp */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {/* Channel code */}
                    <span style={{
                      fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700,
                      color: s.color, letterSpacing: 1,
                      paddingRight: 8, borderRight: `1px solid ${s.color}30`,
                      display: "flex", alignItems: "center", gap: 6,
                    }}>
                      {isMesh && <span style={{ marginRight: 4 }}>{isWx ? "🌡" : "📡"}</span>}
                      {s.code}
                      <QualityBadge signal={tx.signal} readability={tx.readability} />
                    </span>
                    {/* Speaker */}
                    {displaySpeaker && displaySpeaker !== "Unknown" && (
                      <span style={{
                        fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: 1.5,
                        color: isMesh ? s.color + "cc"
                          : isDisp ? "#64b5f6"
                          : "#f59e0b",
                      }}>
                        [{displaySpeaker.toUpperCase()}]
                      </span>
                    )}
                  </div>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#1e3a1e" }}>
                    {formatTime(tx.timestamp)}
                  </span>
                </div>

                {/* Transcript text */}
                <p style={{
                  fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, fontWeight: 500,
                  lineHeight: 1.5, margin: 0, letterSpacing: 0.3,
                  color: isMesh ? s.color + "e0" : "#a8c890",
                }}>{tx.transcript}</p>

                {/* Reply button for mesh-text */}
                {isMesh && !isWx && (
                  <button
                    onClick={() => setCompose({ replyTo: displaySpeaker ?? undefined })}
                    className="fb-reply"
                    style={{
                      marginTop: 10, padding: "3px 12px",
                      border: "1px solid #0e2e0e", background: "transparent",
                      color: "#1e4a1e", fontSize: 10, cursor: "pointer",
                      fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1,
                      transition: "all 0.15s",
                    }}
                  >↩ REPLY</button>
                )}
              </div>
            );
          })}

          {hasMore && filteredTx.length > 0 && (
            <div style={{ textAlign: "center", padding: "16px 0 24px" }}>
              <button onClick={loadMore} disabled={loading} className="fb-btn" style={{
                padding: "7px 24px", border: "1px solid #1a2a1a", background: "transparent",
                color: "#2a4a2a", cursor: loading ? "default" : "pointer", opacity: loading ? 0.4 : 1,
                fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: 2,
                transition: "all 0.15s",
              }}>{loading ? "LOADING…" : "LOAD MORE"}</button>
            </div>
          )}

        </div>
      </main>

      {/* ── Footer ── */}
      <footer style={{ borderTop: "1px solid #0b160b", padding: "8px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#1a2e1a", letterSpacing: 1 }}>WHISTLERBREW FIREBOX · SEA TO SKY RADIO NETWORK</span>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#1a2e1a" }}>50°07′N 122°57′W</span>
      </footer>

      {compose && <MeshCompose replyTo={compose.replyTo} onClose={() => setCompose(null)} />}

      {/* ── Incident Modal ── */}
      {showIncident && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => setShowIncident(false)}>
          <div style={{ background: "#0a110a", border: "1px solid #1e3a1e", borderRadius: 16, padding: 28, width: "100%", maxWidth: 480 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 800, fontSize: 16, letterSpacing: 3, color: "#f0a500", marginBottom: 20 }}>⚡ INCIDENT MANAGEMENT</div>

            {/* Active incident */}
            {activeIncident && (
              <div style={{ background: "#1a0e00", border: "1px solid #f0a50030", borderRadius: 10, padding: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#f0a500", letterSpacing: 1, marginBottom: 6 }}>{activeIncident.name}</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#6a4a00", marginBottom: 12 }}>
                  {fmtDate(activeIncident.start_at)} · {fmtIncidentDuration(activeIncident.start_at)} elapsed
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => exportIncident(activeIncident)} style={{
                    flex: 1, padding: "9px 0", borderRadius: 8, border: "1px solid #39d35340",
                    background: "#060e06", color: "#39d353", fontFamily: "'Rajdhani',sans-serif",
                    fontWeight: 700, fontSize: 12, letterSpacing: 1, cursor: "pointer",
                  }}>📋 EXPORT DEBRIEF</button>
                  <button onClick={() => { endIncident(activeIncident.id); setShowIncident(false); }} style={{
                    flex: 1, padding: "9px 0", borderRadius: 8, border: "1px solid #ff444430",
                    background: "#1a0000", color: "#ff6666", fontFamily: "'Rajdhani',sans-serif",
                    fontWeight: 700, fontSize: 12, letterSpacing: 1, cursor: "pointer",
                  }}>■ END INCIDENT</button>
                </div>
              </div>
            )}

            {/* Past incidents */}
            {incidents.filter(i => i.status === "closed").length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#2a4a2a", letterSpacing: 2, marginBottom: 8 }}>PAST INCIDENTS</div>
                {incidents.filter(i => i.status === "closed").map(inc => (
                  <div key={inc.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #0e1a0e" }}>
                    <div>
                      <div style={{ fontSize: 12, color: "#6a8a6a", fontWeight: 600 }}>{inc.name}</div>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#2a4a2a" }}>{fmtDate(inc.start_at)} · {fmtIncidentDuration(inc.start_at, inc.end_at)}</div>
                    </div>
                    <button onClick={() => exportIncident(inc)} style={{
                      padding: "4px 10px", borderRadius: 6, border: "1px solid #1a3a1a",
                      background: "transparent", color: "#39d353", fontSize: 10, cursor: "pointer",
                      fontFamily: "'JetBrains Mono',monospace",
                    }}>EXPORT</button>
                  </div>
                ))}
              </div>
            )}

            {/* Start new */}
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#2a4a2a", letterSpacing: 2, marginBottom: 10 }}>START NEW INCIDENT</div>
            <input value={incidentForm.name} onChange={e => setIncidentForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Incident name (e.g. Spring Startup Training)"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, marginBottom: 10, boxSizing: "border-box",
                background: "#060e06", border: "1px solid #1e3a1e", color: "#b8d8a0",
                fontFamily: "'Rajdhani',sans-serif", fontSize: 13, outline: "none" }} />
            <input type="datetime-local" value={incidentForm.start_at} onChange={e => setIncidentForm(f => ({ ...f, start_at: e.target.value }))}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, marginBottom: 16, boxSizing: "border-box",
                background: "#060e06", border: "1px solid #1e3a1e", color: "#6a8a6a",
                fontFamily: "'JetBrains Mono',monospace", fontSize: 11, outline: "none" }} />
            <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: "#1e3a1e", marginBottom: 16 }}>
              Leave date blank to start now. Starting a new incident auto-closes any active one.
            </div>
            <button onClick={startIncident} disabled={!incidentForm.name.trim()} style={{
              width: "100%", padding: "12px 0", borderRadius: 8,
              background: incidentForm.name.trim() ? "#0d2a0d" : "#0a110a",
              border: `1px solid ${incidentForm.name.trim() ? "#39d353" : "#1a2a1a"}`,
              color: incidentForm.name.trim() ? "#39d353" : "#1a2a1a",
              fontFamily: "'Rajdhani',sans-serif", fontWeight: 800, fontSize: 14, letterSpacing: 2,
              cursor: incidentForm.name.trim() ? "pointer" : "default",
            }}>START INCIDENT →</button>
          </div>
        </div>
      )}

      {/* ── Export Modal ── */}
      {showExport && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => setShowExport(null)}>
          <div style={{ background: "#080d08", border: "1px solid #1e3a1e", borderRadius: 16, padding: 24, width: "100%", maxWidth: 700, maxHeight: "85vh", display: "flex", flexDirection: "column" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 800, fontSize: 14, letterSpacing: 3, color: "#39d353" }}>
                📋 DEBRIEF EXPORT · {showExport.name.toUpperCase()}
              </div>
              <button onClick={() => setShowExport(null)} style={{ background: "none", border: "none", color: "#2a5a2a", fontSize: 22, cursor: "pointer" }}>×</button>
            </div>
            {exportLoading ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#2a5a2a", letterSpacing: 2 }}>
                LOADING TRANSCRIPTS…
              </div>
            ) : (
              <>
                <textarea readOnly value={exportData} style={{
                  flex: 1, background: "#040804", border: "1px solid #0e1a0e", borderRadius: 8,
                  color: "#6a9a6a", fontFamily: "'JetBrains Mono',monospace", fontSize: 10,
                  lineHeight: 1.6, padding: 14, resize: "none", outline: "none", minHeight: 300,
                }} />
                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  <button onClick={() => navigator.clipboard.writeText(exportData)} style={{
                    flex: 1, padding: "11px 0", borderRadius: 8, border: "1px solid #39d35340",
                    background: "#060e06", color: "#39d353", fontFamily: "'Rajdhani',sans-serif",
                    fontWeight: 700, fontSize: 13, letterSpacing: 2, cursor: "pointer",
                  }}>📋 COPY TO CLIPBOARD</button>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#1e3a1e", display: "flex", alignItems: "center", maxWidth: 200, lineHeight: 1.5 }}>
                    Paste into Claude to generate your debrief report.
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────────
export default function FireBoxPage() {
  const [authed,  setAuthed]  = useState(false);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    if (sessionStorage.getItem("firebox_auth") === "true") setAuthed(true);
    setChecked(true);
  }, []);
  if (!checked) return null;
  if (!authed)  return <LoginScreen onAuth={() => setAuthed(true)} />;
  return <FireBoxFeed />;
}
