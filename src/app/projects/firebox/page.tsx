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

// CTCSS tones — NRM duplex repeater channels only
const CTCSS_TONES: Record<string, number> = {
  T1: 114.8, T2: 123.0, T3: 131.8, T4: 141.3, T5: 151.4,
  T6: 162.2, T7: 173.8, T8: 186.2, T9: 192.8,
};
const TONE_KEYS = ["T1","T2","T3","T4","T5","T6","T7","T8","T9"];

// Color NRS channels are duplex repeater — require CTCSS tone for access
const COLOR_NRS_CHANNELS = new Set([
  "nrs-red","nrs-purple","nrs-green","nrs-pink","nrs-blue",
  "nrs-maroon","nrs-orange","nrs-brown","nrs-yellow","nrs-grey",
  "nrs-black","nrs-white",
]);

// D2 = requires Dongle 2 · D3 = Dongle 3
const CHANNEL_STYLE: Record<string, {
  label: string; code: string; color: string; icon?: string; dongle?: string;
  tx?: number; rx?: number; repeater?: boolean;
}> = {
  // ── Dongle 1 ──────────────────────────────────────────────────────────────────
  "wfd-ch2-scene":       { label: "WFD On Scene",      code: "WFD·CH2",   color: "#f0a500", tx: 151.355, rx: 151.355 },
  "wfd-ch6-ce":          { label: "WFD Combined Events",code: "WFD·CH6",   color: "#fb923c", tx: 153.710 },
  "wb-lift-ops":         { label: "WB Lift Operations", code: "WB·LIFT",   color: "#67e8f9", tx: 152.060 },
  "wb-ops":              { label: "WB Operations",      code: "WB·OPS",    color: "#a5f3fc", tx: 153.305 },
  "wb-heliski":          { label: "WB Heliskiing",      code: "WB·HELI",   color: "#7dd3fc", tx: 153.530 },
  // ── Dongle 2 ──────────────────────────────────────────────────────────────────
  "wfd-ch5-garibaldi":   { label: "WFD Garibaldi M/A",  code: "WFD·CH5",   color: "#fdba74", dongle: "D2", tx: 150.755 },
  "bcas-whistler":       { label: "BCAS Whistler",       code: "BCAS",      color: "#f87171", dongle: "D2", tx: 149.110 },
  "pep-sar1":            { label: "PEP SAR 1",           code: "SAR·1",     color: "#c084fc", dongle: "D2", tx: 149.495 },
  "pep-sar2":            { label: "PEP SAR 2",           code: "SAR·2",     color: "#a78bfa", dongle: "D2", tx: 149.525 },
  "canada-sar":          { label: "Canada-Wide SAR",     code: "SAR·CAN",   color: "#818cf8", dongle: "D2", tx: 149.080 },
  // ── Deployment simplex (NRM metal — no tone) ──────────────────────────────────
  "wfd-ch3-lost-lake":   { label: "WFD Lost Lake",       code: "WFD·CH3",   color: "#fbbf24", tx: 162.465 },
  "wfd-ch4-cheakamus":   { label: "WFD Cheakamus",       code: "WFD·CH4",   color: "#fcd34d", tx: 163.650 },
  "nrs-gold":            { label: "NRS Gold",             code: "NRS·GOLD",  color: "#f59e0b", tx: 163.830 },
  "nrs-silver":          { label: "NRS Silver",           code: "NRS·SLVR",  color: "#94a3b8", tx: 163.890 },
  "nrs-bronze":          { label: "NRS Bronze",           code: "NRS·BRNZ",  color: "#b45309", tx: 163.980 },
  "nrs-copper":          { label: "NRS Copper",           code: "NRS·COPR",  color: "#b45309", tx: 164.910 },
  // ── Deployment duplex (NRM color — CTCSS tone required) ───────────────────────
  "nrs-red":    { label: "NRS Red",    code: "NRS·RED",  color: "#ef4444", tx: 163.065, rx: 163.935, repeater: true },
  "nrs-purple": { label: "NRS Purple", code: "NRS·PURP", color: "#a855f7", tx: 163.095, rx: 163.965, repeater: true },
  "nrs-green":  { label: "NRS Green",  code: "NRS·GRN",  color: "#22c55e", tx: 163.125, rx: 163.995, repeater: true },
  "nrs-pink":   { label: "NRS Pink",   code: "NRS·PNK",  color: "#ec4899", tx: 163.185, rx: 164.055, repeater: true },
  "nrs-blue":   { label: "NRS Blue",   code: "NRS·BLUE", color: "#3b82f6", tx: 163.215, rx: 164.085, repeater: true },
  "nrs-maroon": { label: "NRS Maroon", code: "NRS·MARN", color: "#9f1239", tx: 163.245, rx: 164.115, repeater: true },
  "nrs-orange": { label: "NRS Orange", code: "NRS·ORG",  color: "#f97316", tx: 163.275, rx: 164.145, repeater: true },
  "nrs-brown":  { label: "NRS Brown",  code: "NRS·BRWN", color: "#92400e", tx: 163.305, rx: 164.175, repeater: true },
  "nrs-yellow": { label: "NRS Yellow", code: "NRS·YLW",  color: "#eab308", tx: 163.335, rx: 164.205, repeater: true },
  "nrs-grey":   { label: "NRS Grey",   code: "NRS·GREY", color: "#6b7280", tx: 163.365, rx: 164.235, repeater: true },
  "nrs-black":  { label: "NRS Black",  code: "NRS·BLK",  color: "#374151", tx: 163.395, rx: 164.265, repeater: true },
  "nrs-white":  { label: "NRS White",  code: "NRS·WHT",  color: "#e2e8f0", tx: 163.530, rx: 162.585, repeater: true },
  // ── Dongle 3 ──────────────────────────────────────────────────────────────────
  "ehs-mount-london": { label: "EHS Mt. London", code: "EHS·MTN", color: "#fb7185", dongle: "D3", tx: 142.365 },
  // ── Mesh ──────────────────────────────────────────────────────────────────────
  "mesh-text":    { label: "Mesh · Text",    code: "MESH·TXT", color: "#39d353", icon: "📡" },
  "mesh-weather": { label: "Mesh · Weather", code: "MESH·WX",  color: "#38bdf8", icon: "🌡" },
};

const HOME_CHANNELS       = ["wfd-ch2-scene", "wfd-ch6-ce", "wb-lift-ops", "wb-ops", "wb-heliski"];
const DEPLOYMENT_CHANNELS = [
  "nrs-gold", "nrs-silver", "nrs-bronze", "nrs-copper",
  "nrs-red", "nrs-purple", "nrs-green", "nrs-pink",
  "nrs-blue", "nrs-maroon", "nrs-orange", "nrs-brown", "nrs-yellow",
  "nrs-grey", "nrs-black", "nrs-white",
];

const PLANNED_CHANNELS = [
  "wfd-ch5-garibaldi", "bcas-whistler",
  "pep-sar1", "pep-sar2", "canada-sar",
  "ehs-mount-london",
];

// ── Keyword alert system ──────────────────────────────────────────────────────
const ALERT_LEVELS = {
  critical: { color: "#ff4444", bg: "#3a0000", border: "#ff000060", label: "CRITICAL", anim: "alertPulseCrit 0.7s ease-in-out infinite" },
  urgent:   { color: "#fb923c", bg: "#2a1000", border: "#fb923c60", label: "URGENT",   anim: "alertPulse 1.5s ease-in-out infinite" },
  info:     { color: "#f0a500", bg: "#1c1200", border: "#f0a50060", label: "INFO",     anim: "none" },
} as const;
type AlertLevel = keyof typeof ALERT_LEVELS;
type KeywordRule = { word: string; level: AlertLevel };

const DEFAULT_KEYWORDS: KeywordRule[] = [
  { word: "mayday",         level: "critical" },
  { word: "may day",        level: "critical" },
  { word: "evacuate",       level: "critical" },
  { word: "evacuation",     level: "critical" },
  { word: "safe zone",      level: "critical" },
  { word: "overrun",        level: "critical" },
  { word: "entrapment",     level: "critical" },
  { word: "emergency",      level: "urgent" },
  { word: "mer",            level: "urgent" },
  { word: "structure fire", level: "urgent" },
  { word: "working fire",   level: "urgent" },
  { word: "missing person", level: "urgent" },
  { word: "cardiac",        level: "urgent" },
  { word: "unconscious",    level: "urgent" },
  { word: "spot fire",      level: "info" },
];

function ch(channel: string) {
  return CHANNEL_STYLE[channel] ?? { label: channel, code: channel.toUpperCase(), color: "#666" };
}

function formatTime(iso: string, showSecs = false) {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const now = new Date();
    const isToday = d.getFullYear() === now.getFullYear()
                 && d.getMonth()    === now.getMonth()
                 && d.getDate()     === now.getDate();
    const hh = String(d.getHours()).padStart(2,"0");
    const mm = String(d.getMinutes()).padStart(2,"0");
    const ss = String(d.getSeconds()).padStart(2,"0");
    if (isToday) return showSecs ? `${hh}:${mm}:${ss}` : `${hh}:${mm}`;
    const mon = String(d.getMonth() + 1).padStart(2,"0");
    const day = String(d.getDate()).padStart(2,"0");
    return `${mon}-${day} ${hh}:${mm}`;
  } catch { return iso; }
}

function detectKeyword(text: string, rules: KeywordRule[]): KeywordRule | null {
  const lower = text.toLowerCase();
  for (const rule of rules) {
    if (lower.includes(rule.word.toLowerCase())) return rule;
  }
  return null;
}

type WeatherReading = { ts: string; node: string; temp?: number; humidity?: number; pressure?: number; };
type Incident = {
  id: string; name: string; start_at: string;
  end_at?: string; status: "active" | "closed"; notes?: string;
};

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
    const tick = () => setT(new Date().toLocaleTimeString("en-CA", { hour12: false, hour:"2-digit", minute:"2-digit" }));
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, []);
  return t;
}

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

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700&family=JetBrains+Mono:wght@400;500;700&family=Barlow+Condensed:wght@400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes pulse     { 0%,100%{opacity:1} 50%{opacity:0.35} }
  @keyframes blink     { 0%,49%{opacity:1} 50%,100%{opacity:0} }
  @keyframes fbTicker  { 0%{transform:translateX(100vw)} 100%{transform:translateX(-100%)} }
  @keyframes slideIn   { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }
  @keyframes ripple    { 0%{box-shadow:0 0 0 0 rgba(255,68,68,0.4)} 70%{box-shadow:0 0 0 8px rgba(255,68,68,0)} 100%{box-shadow:0 0 0 0 rgba(255,68,68,0)} }
  @keyframes alertPulse     { 0%,100%{opacity:1} 50%{opacity:0.7} }
  @keyframes alertPulseCrit { 0%,100%{opacity:1} 50%{opacity:0.3} }
  .fb-card   { animation: slideIn 0.2s ease both; }
  .fb-reply:hover  { border-color: #1a4a1a !important; color: #39d353 !important; background: #081408 !important; }
  .fb-tab:hover    { background: #0f160f !important; }
  .fb-btn:hover    { opacity: 0.85; }
  .crossover-card  { animation: ripple 2s ease-in-out infinite; }
`;

function FireBoxStyles() { return <style dangerouslySetInnerHTML={{ __html: CSS }} />; }

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

// ── Tone selector (inline, for repeater channels) ─────────────────────────────
function ToneBadge({
  channel, tone, onCycle,
}: { channel: string; tone: string | null; onCycle: (ch: string) => void }) {
  if (!COLOR_NRS_CHANNELS.has(channel)) return null;
  const hz = tone ? CTCSS_TONES[tone] : null;
  return (
    <button
      onClick={e => { e.stopPropagation(); onCycle(channel); }}
      title={`CTCSS tone${hz ? `: ${hz} Hz` : " — click to set"}`}
      style={{
        marginLeft: "auto",
        padding: "2px 6px",
        border: `1px solid ${tone ? "#39d35360" : "#2a3a2a"}`,
        background: tone ? "#0a1a0a" : "transparent",
        color: tone ? "#39d353" : "#3a5a3a",
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
        cursor: "pointer", flexShrink: 0,
        borderRadius: 3,
      }}
    >
      {tone ?? "T?"}
    </button>
  );
}

// ── Mesh compose ──────────────────────────────────────────────────────────────
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
      <div style={{ width: "100%", maxWidth: 500, position: "relative", background: "#080e08", border: "1px solid #1c2e1c" }}>
        <Brackets color="#2a4a2a" size={9} />
        <div style={{ borderBottom: "1px solid #1c2e1c", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0b120b" }}>
          <span style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: 2, color: "#39d353" }}>
            📡 Send Mesh Message
          </span>
          <button onClick={onClose} className="fb-btn" style={{ background: "none", border: "none", color: "#5a8a5a", fontSize: 22, cursor: "pointer", lineHeight: 1, padding: "0 2px" }}>×</button>
        </div>
        <div style={{ padding: "16px 20px 20px" }}>
          {sent ? (
            <div style={{ textAlign: "center", padding: "28px 0" }}>
              <div style={{ fontSize: 32, color: "#39d353", marginBottom: 10 }}>✓</div>
              <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 600, fontSize: 16, letterSpacing: 1, color: "#39d353" }}>Message Sent</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#4a7a4a", marginTop: 6 }}>Will transmit via Brew1 within 5 seconds</div>
            </div>
          ) : (
            <>
              <textarea
                ref={taRef} value={text} rows={4}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}
                placeholder="Type your message…"
                style={{
                  width: "100%", background: "#040a04",
                  border: "1px solid #1a2e1a", padding: "10px 12px",
                  color: "#b8d8a0", fontSize: 14, lineHeight: 1.6,
                  resize: "none", fontFamily: "'Rajdhani',sans-serif",
                  outline: "none",
                }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
                <button onClick={onClose} className="fb-btn" style={{
                  padding: "10px 20px", border: "1px solid #2a4a2a", background: "transparent",
                  color: "#5a8a5a", fontSize: 13, cursor: "pointer",
                  fontFamily: "'Rajdhani',sans-serif", fontWeight: 600,
                }}>Cancel</button>
                <button onClick={submit} disabled={busy || !text.trim()} className="fb-btn" style={{
                  padding: "10px 28px", border: "none",
                  background: busy ? "#0d200d" : "#0f2a0f",
                  color: busy ? "#2a5a2a" : "#39d353",
                  fontSize: 14, fontWeight: 700, cursor: busy ? "default" : "pointer",
                  fontFamily: "'Rajdhani',sans-serif",
                  borderLeft: `3px solid ${busy ? "#1a3a1a" : "#39d353"}`,
                }}>{busy ? "Sending…" : "Send"}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Weather node card ─────────────────────────────────────────────────────────
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
      minWidth: 260,
    }}>
      <Brackets color={crossover ? (extreme ? "#5a1a1a" : "#4a2a00") : "#1a2e1a"} size={6} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: 2, color: "#3a6a3a", marginBottom: 2 }}>WX NODE</div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: crossover ? "#fb923c" : "#38bdf8" }}>{latest.node}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "flex-end", marginBottom: 2 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: age.color, animation: "pulse 2s ease-in-out infinite", display: "inline-block" }} />
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: age.color }}>{age.text}</span>
          </div>
          {tSpan > 0 && <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#3a5a3a" }}>{tSpan}m trend</div>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-end" }}>
        {[
          { key: "TEMP",  val: latest.temp     != null ? `${latest.temp.toFixed(1)}°` : "—",      unit: "C", trend: tTemp },
          { key: "RH",    val: latest.humidity != null ? `${Math.round(latest.humidity)}`  : "—", unit: "%", trend: tHum  },
          { key: "hPa",   val: latest.pressure != null ? `${latest.pressure.toFixed(1)}`   : "—", unit: "",  trend: tPres },
        ].map(({ key, val, unit, trend }) => (
          <div key={key}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: 1.5, color: "#3a5a3a", marginBottom: 1 }}>{key}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 700, color: crossover && key !== "hPa" ? (extreme ? "#ff6b6b" : "#fbbf24") : "#c8e8b0", letterSpacing: -1 }}>{val}</span>
              {unit && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#4a6a4a" }}>{unit}</span>}
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, fontWeight: 700, color: trend.color, marginLeft: 2 }}>{trend.sym}</span>
            </div>
          </div>
        ))}
        {crossover && (
          <div style={{ marginLeft: "auto", padding: "4px 10px", background: extreme ? "#2a0000" : "#1e1000", border: `1px solid ${extreme ? "#ff4444" : "#f0a500"}`, animation: extreme ? "blink 1.2s step-end infinite" : undefined }}>
            <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 11, fontWeight: 700, color: extreme ? "#ff6b6b" : "#fbbf24" }}>
              {extreme ? "⚠ EXTREME FIRE WX" : "⚠ CROSSOVER"}
            </div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: extreme ? "#ff4444" : "#f0a500", marginTop: 1 }}>
              Temp {latest.temp?.toFixed(0)}° ≥ RH {latest.humidity?.toFixed(0)}%
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
    <div style={{ borderBottom: "1px solid #0e1a0e", padding: "8px 20px", background: "#060b06" }}>
      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 2 }}>
        {Array.from(nodes.entries()).map(([node, nh]) => <WeatherNodeCard key={node} nodeHistory={nh} />)}
      </div>
    </div>
  );
}

// ── Mesh ticker ────────────────────────────────────────────────────────────────
function MeshTicker({ messages }: { messages: Transcript[] }) {
  const latest = messages.filter(m => m.channel !== "mesh-weather")[0];
  if (!latest) return null;
  const label = `${latest.speaker ?? "MESH"} › ${latest.transcript}`;
  const secs  = Math.max(16, label.length * 0.21);
  return (
    <div style={{ height: 32, background: "#040904", borderBottom: "1px solid #0b160b", display: "flex", alignItems: "center", overflow: "hidden" }}>
      <div style={{ flexShrink: 0, padding: "0 14px", height: "100%", display: "flex", alignItems: "center", gap: 8, borderRight: "1px solid #0b160b", background: "#060e06" }}>
        <span style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: 2, color: "#3a6a3a" }}>MESH</span>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, padding: "1px 6px", background: "#0b1e0b", color: "#39d353" }}>{messages.length}</span>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <div key={latest.timestamp} style={{
          animation: `fbTicker ${secs}s linear 1 forwards`,
          whiteSpace: "nowrap", fontFamily: "'JetBrains Mono',monospace",
          fontSize: 12, color: "#39d353", lineHeight: "32px", paddingLeft: 14,
        }}>
          {label}
          {messages.length > 1 && <span style={{ color: "#2a4a2a", marginLeft: 40 }}>+{messages.length - 1} more</span>}
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
      minHeight: "100vh", background: "#060b06",
      backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(57,211,83,0.015) 3px, rgba(57,211,83,0.015) 4px)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 32, fontFamily: "'Rajdhani',sans-serif",
    }}>
      <FireBoxStyles />
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 36, borderBottom: "1px solid #0e1a0e", background: "#040904", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px" }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#3a6a3a", letterSpacing: 1 }}>FIREBOX · Sea to Sky Radio</span>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: "#4a7a4a" }}>{clock}</span>
      </div>

      <div style={{ width: "100%", maxWidth: 380, position: "relative" }}>
        <Brackets color="#1a3a1a" size={10} />
        <div style={{
          border: "1px solid #1a2e1a", background: "#080e08", padding: "40px 36px 36px",
          transform: shake ? "translateX(-4px)" : "none", transition: "transform 0.08s",
        }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: 6, color: "#b8d8a0" }}>FIREBOX</div>
            <div style={{ fontSize: 13, letterSpacing: 2, color: "#4a7a4a", marginTop: 8 }}>Live Radio Feed · Whistler, BC</div>
            <div style={{ width: 40, height: 1, background: "#1a3a1a", margin: "16px auto 0" }} />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: 13, letterSpacing: 1, color: "#5a8a5a", marginBottom: 8 }}>
              Password
            </label>
            <input
              type="password" value={value} autoFocus
              onChange={e => { setValue(e.target.value); setError(false); }}
              onKeyDown={e => e.key === "Enter" && submit()}
              style={{
                width: "100%", background: "#040904",
                border: `1px solid ${error ? "#ff4444" : "#1a2e1a"}`,
                padding: "13px 14px", color: "#b8d8a0", fontSize: 16,
                fontFamily: "'Rajdhani',sans-serif", outline: "none",
                transition: "border-color 0.2s",
              }}
            />
            {error && (
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#ff6b6b", marginTop: 8 }}>
                Wrong password — try again
              </div>
            )}
          </div>

          <button onClick={submit} className="fb-btn" style={{
            width: "100%", padding: "14px 0", border: "none", marginTop: 18,
            background: "#f0a500", color: "#000",
            fontFamily: "'Rajdhani',sans-serif", fontWeight: 700,
            fontSize: 16, letterSpacing: 2, cursor: "pointer",
          }}>Enter</button>

          <div style={{ textAlign: "center", marginTop: 24 }}>
            <Image src="/logo.png" alt="WhistlerBrew" width={100} height={25} style={{ height: "auto", opacity: 0.2 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Save Audio Modal ──────────────────────────────────────────────────────────
const SAVE_PRESETS = [
  { label: "Last 30 min",   minutes: 30 },
  { label: "Last 2 hours",  minutes: 120 },
  { label: "Last 8 hours",  minutes: 480 },
];

function SaveAudioModal({ onClose }: { onClose: () => void }) {
  const [label,       setLabel]       = useState("");
  const [customRange, setCustomRange] = useState(false);
  const [selectedPreset, setPreset]   = useState<number | null>(null);
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2,"0");
  const toLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const [start, setStart] = useState(toLocal(new Date(now.getTime() - 2 * 3600000)));
  const [end,   setEnd]   = useState(toLocal(now));
  const [status, setStatus] = useState<"idle"|"saving"|"done"|"error">("idle");
  const [msg, setMsg] = useState("");

  const submit = async () => {
    let startTime: Date, endTime: Date;
    if (!customRange && selectedPreset !== null) {
      endTime   = new Date();
      startTime = new Date(endTime.getTime() - selectedPreset * 60000);
    } else {
      startTime = new Date(start);
      endTime   = new Date(end);
    }
    if (status === "saving") return;
    setStatus("saving");
    try {
      const r = await fetch("/api/firebox-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim() || null, start_time: startTime.toISOString(), end_time: endTime.toISOString() }),
      });
      if (!r.ok) throw new Error("API error");
      setStatus("done");
      setMsg("Queued — FireBox will copy the audio files within 2 minutes.");
      setTimeout(onClose, 2800);
    } catch {
      setStatus("error");
      setMsg("Request failed. Check your connection and try again.");
    }
  };

  const canSubmit = status !== "saving" && (selectedPreset !== null || customRange);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(2,4,8,0.92)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: "100%", maxWidth: 460, position: "relative", background: "#080c12", border: "1px solid #1a2a3a" }}>
        <Brackets color="#1a2e4a" size={9} />
        <div style={{ borderBottom: "1px solid #1a2a3a", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0b1018" }}>
          <span style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: 1, color: "#7dd3fc" }}>
            💾 Save Audio Recording
          </span>
          <button onClick={onClose} className="fb-btn" style={{ background: "none", border: "none", color: "#4a7a9a", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: "18px 20px 22px" }}>
          {status === "done" ? (
            <div style={{ textAlign: "center", padding: "28px 0" }}>
              <div style={{ fontSize: 36, color: "#7dd3fc", marginBottom: 12 }}>✓</div>
              <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 600, fontSize: 16, color: "#7dd3fc" }}>Saved!</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#4a7a9a", marginTop: 8, lineHeight: 1.6 }}>{msg}</div>
            </div>
          ) : (
            <>
              {/* Label */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 13, color: "#5a8aaa", marginBottom: 8 }}>
                  Label <span style={{ color: "#3a5a7a", fontSize: 12 }}>(optional)</span>
                </label>
                <input
                  value={label} onChange={e => setLabel(e.target.value)}
                  placeholder="e.g. Structure fire Cheakamus 14:30"
                  style={{ width: "100%", background: "#040810", border: "1px solid #1a2a3a", padding: "10px 12px", color: "#b8d8f0", fontSize: 14, fontFamily: "'Rajdhani',sans-serif", outline: "none" }}
                />
              </div>

              {/* Preset buttons */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: "#5a8aaa", marginBottom: 10 }}>How far back?</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {SAVE_PRESETS.map(p => (
                    <button key={p.minutes} onClick={() => { setPreset(p.minutes); setCustomRange(false); }} className="fb-btn" style={{
                      padding: "10px 16px", border: `1px solid ${selectedPreset === p.minutes && !customRange ? "#7dd3fc" : "#1a2a3a"}`,
                      background: selectedPreset === p.minutes && !customRange ? "#0a1a2a" : "transparent",
                      color: selectedPreset === p.minutes && !customRange ? "#7dd3fc" : "#4a7a9a",
                      fontSize: 13, cursor: "pointer", fontFamily: "'Rajdhani',sans-serif", fontWeight: 600,
                    }}>{p.label}</button>
                  ))}
                  <button onClick={() => { setCustomRange(true); setPreset(null); }} className="fb-btn" style={{
                    padding: "10px 16px", border: `1px solid ${customRange ? "#7dd3fc" : "#1a2a3a"}`,
                    background: customRange ? "#0a1a2a" : "transparent",
                    color: customRange ? "#7dd3fc" : "#4a7a9a",
                    fontSize: 13, cursor: "pointer", fontFamily: "'Rajdhani',sans-serif", fontWeight: 600,
                  }}>Custom…</button>
                </div>
              </div>

              {/* Custom range */}
              {customRange && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                  {([["Start", start, setStart], ["End", end, setEnd]] as const).map(([lbl, val, setter]) => (
                    <div key={lbl}>
                      <label style={{ display: "block", fontSize: 12, color: "#4a6a8a", marginBottom: 6 }}>{lbl}</label>
                      <input
                        type="datetime-local" value={val}
                        onChange={e => setter(e.target.value)}
                        style={{ width: "100%", background: "#040810", border: "1px solid #1a2a3a", padding: "9px 8px", color: "#7dd3fc", fontSize: 12, fontFamily: "'JetBrains Mono',monospace", outline: "none", colorScheme: "dark" }}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#2a4a6a", marginBottom: 16, lineHeight: 1.6 }}>
                Audio is kept for 7 days. Save it before then to preserve it permanently.
              </div>

              {status === "error" && (
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#ff6b6b", marginBottom: 12 }}>✕ {msg}</div>
              )}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={onClose} className="fb-btn" style={{ padding: "10px 18px", border: "1px solid #1a2a3a", background: "transparent", color: "#4a6a8a", fontSize: 13, cursor: "pointer", fontFamily: "'Rajdhani',sans-serif", fontWeight: 600 }}>Cancel</button>
                <button onClick={submit} disabled={!canSubmit} className="fb-btn" style={{
                  padding: "10px 24px", border: "none", background: canSubmit ? "#0a1a2a" : "#050a10",
                  color: canSubmit ? "#7dd3fc" : "#2a4a6a", fontSize: 14, fontWeight: 700, cursor: canSubmit ? "pointer" : "default",
                  fontFamily: "'Rajdhani',sans-serif", borderLeft: `3px solid ${canSubmit ? "#7dd3fc" : "#1a2a3a"}`,
                  opacity: status === "saving" ? 0.5 : 1,
                }}>
                  {status === "saving" ? "Saving…" : "Save Recording"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Mode confirmation modal ───────────────────────────────────────────────────
function ModeConfirmModal({
  target, currentMode, onConfirm, onCancel,
}: { target: "home" | "deployment"; currentMode: "home" | "deployment"; onConfirm: () => void; onCancel: () => void }) {
  const stopping = target === "home" ? DEPLOYMENT_CHANNELS : HOME_CHANNELS;
  const starting = target === "home" ? HOME_CHANNELS : DEPLOYMENT_CHANNELS;
  const color    = target === "deployment" ? "#fb923c" : "#39d353";
  const modeName = target === "deployment" ? "Deployment (NRS)" : "Whistler (Home)";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420, background: "#080d08", border: `1px solid ${color}40`, position: "relative" }}>
        <Brackets color={`${color}60`} size={9} />
        <div style={{ borderBottom: `1px solid ${color}25`, padding: "14px 20px", background: "#0a120a" }}>
          <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 16, color }}>Switch to {modeName}?</div>
        </div>
        <div style={{ padding: "18px 20px 22px" }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "#5a7a5a", fontFamily: "'JetBrains Mono',monospace", marginBottom: 8, letterSpacing: 1 }}>WILL STOP MONITORING:</div>
            {stopping.slice(0, 6).map(c => (
              <div key={c} style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 13, color: "#4a6a4a", paddingLeft: 12, marginBottom: 2 }}>
                — {ch(c).label}
              </div>
            ))}
            {stopping.length > 6 && <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 12, color: "#3a5a3a", paddingLeft: 12 }}>— +{stopping.length - 6} more</div>}
          </div>
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 12, color: "#5a8a5a", fontFamily: "'JetBrains Mono',monospace", marginBottom: 8, letterSpacing: 1 }}>WILL START MONITORING:</div>
            {starting.slice(0, 6).map(c => (
              <div key={c} style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 13, color, paddingLeft: 12, marginBottom: 2 }}>
                + {ch(c).label}
              </div>
            ))}
            {starting.length > 6 && <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 12, color: `${color}80`, paddingLeft: 12 }}>+ {starting.length - 6} more</div>}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#3a5a3a", marginBottom: 20, lineHeight: 1.6 }}>
            This sends a command to the Pi and changes which radio frequencies are being monitored.
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onCancel} className="fb-btn" style={{ flex: 1, padding: "12px 0", border: "1px solid #2a4a2a", background: "transparent", color: "#5a8a5a", fontSize: 14, cursor: "pointer", fontFamily: "'Rajdhani',sans-serif", fontWeight: 600 }}>
              Cancel
            </button>
            <button onClick={onConfirm} className="fb-btn" style={{ flex: 1, padding: "12px 0", border: `1px solid ${color}`, background: "#0a140a", color, fontSize: 14, cursor: "pointer", fontFamily: "'Rajdhani',sans-serif", fontWeight: 700 }}>
              Yes, Switch Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Keyword Manager Modal ─────────────────────────────────────────────────────
const LEVEL_ORDER: AlertLevel[] = ["critical", "urgent", "info"];

function KeywordManager({
  rules, onChange, onClose,
}: { rules: KeywordRule[]; onChange: (r: KeywordRule[]) => void; onClose: () => void }) {
  const [newWord, setNewWord] = useState("");
  const [newLevel, setNewLevel] = useState<AlertLevel>("urgent");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const cycleLevel = (idx: number) => {
    const next = [...rules];
    const cur  = LEVEL_ORDER.indexOf(next[idx].level);
    next[idx]  = { ...next[idx], level: LEVEL_ORDER[(cur + 1) % LEVEL_ORDER.length] };
    onChange(next);
  };

  const remove = (idx: number) => onChange(rules.filter((_, i) => i !== idx));

  const add = () => {
    const w = newWord.trim().toLowerCase();
    if (!w || rules.some(r => r.word === w)) return;
    onChange([...rules, { word: w, level: newLevel }]);
    setNewWord("");
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: "100%", maxWidth: 460, background: "#080d08", border: "1px solid #2a3a1a", position: "relative", display: "flex", flexDirection: "column", maxHeight: "85vh" }}>
        <Brackets color="#2a4a1a" size={8} />

        {/* Header */}
        <div style={{ borderBottom: "1px solid #1a2a1a", padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0a120a", flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: 2, color: "#c8e8b0" }}>🔔 KEYWORD ALERTS</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#3a6a3a", marginTop: 2 }}>Tap level badge to cycle CRITICAL → URGENT → INFO</div>
          </div>
          <button onClick={onClose} className="fb-btn" style={{ background: "none", border: "none", color: "#5a8a5a", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 8, padding: "10px 18px", borderBottom: "1px solid #0e1a0e", flexShrink: 0 }}>
          {LEVEL_ORDER.map(l => {
            const lv = ALERT_LEVELS[l];
            return (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, color: lv.color, padding: "2px 7px", background: lv.bg, border: `1px solid ${lv.border}` }}>{lv.label}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#3a5a3a" }}>
                  {l === "critical" ? "Flash + red" : l === "urgent" ? "Pulse + orange" : "Steady + amber"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Keyword list */}
        <div style={{ overflowY: "auto", flex: 1, padding: "8px 0" }}>
          {rules.map((r, i) => {
            const lv = ALERT_LEVELS[r.level];
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 18px", borderBottom: "1px solid #0a140a" }}>
                <button onClick={() => cycleLevel(i)} className="fb-btn" style={{
                  fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700,
                  color: lv.color, padding: "3px 9px", background: lv.bg,
                  border: `1px solid ${lv.border}`, cursor: "pointer", flexShrink: 0,
                  letterSpacing: 0.5,
                }}>{lv.label}</button>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: "#9aca80", flex: 1, textTransform: "uppercase", letterSpacing: 0.5 }}>{r.word}</span>
                <button onClick={() => remove(i)} className="fb-btn" style={{
                  background: "none", border: "1px solid #2a1a1a", color: "#5a3a3a",
                  fontSize: 14, cursor: "pointer", padding: "2px 8px", flexShrink: 0,
                  fontFamily: "'JetBrains Mono',monospace",
                }}>×</button>
              </div>
            );
          })}
        </div>

        {/* Add new */}
        <div style={{ borderTop: "1px solid #1a2a1a", padding: "14px 18px", flexShrink: 0, background: "#060e06" }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#3a6a3a", letterSpacing: 1, marginBottom: 10 }}>ADD KEYWORD</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              ref={inputRef} value={newWord}
              onChange={e => setNewWord(e.target.value)}
              onKeyDown={e => e.key === "Enter" && add()}
              placeholder="e.g. shelter in place"
              style={{ flex: 1, background: "#040a04", border: "1px solid #1a2a1a", padding: "9px 12px", color: "#b8d8a0", fontSize: 13, fontFamily: "'Rajdhani',sans-serif", outline: "none" }}
            />
            {/* Level picker */}
            <div style={{ display: "flex", border: "1px solid #1a2a1a" }}>
              {LEVEL_ORDER.map(l => {
                const lv = ALERT_LEVELS[l];
                return (
                  <button key={l} onClick={() => setNewLevel(l)} className="fb-btn" style={{
                    padding: "9px 8px", border: "none", borderRight: l !== "info" ? "1px solid #1a2a1a" : "none",
                    background: newLevel === l ? lv.bg : "transparent",
                    color: newLevel === l ? lv.color : "#3a5a3a",
                    fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 700,
                    cursor: "pointer", letterSpacing: 0.5,
                  }}>{lv.label}</button>
                );
              })}
            </div>
            <button onClick={add} disabled={!newWord.trim()} className="fb-btn" style={{
              padding: "9px 16px", border: "none", background: newWord.trim() ? "#0f2a0f" : "#0a110a",
              color: newWord.trim() ? "#39d353" : "#2a4a2a", fontSize: 14, fontWeight: 700,
              cursor: newWord.trim() ? "pointer" : "default", fontFamily: "'Rajdhani',sans-serif",
            }}>+</button>
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
  const [keywordHit,     setKeywordHit]     = useState<KeywordRule | null>(null);
  const [showKeywordMgr, setShowKeywordMgr] = useState(false);
  const [keywordList,    setKeywordList]    = useState<KeywordRule[]>(() => {
    try { return JSON.parse(localStorage.getItem("firebox_keywords") ?? "null") ?? DEFAULT_KEYWORDS; } catch { return DEFAULT_KEYWORDS; }
  });
  const saveKeywords = (rules: KeywordRule[]) => {
    setKeywordList(rules);
    localStorage.setItem("firebox_keywords", JSON.stringify(rules));
  };
  const [incidentForm,   setIncidentForm]   = useState({ name: "", start_at: "" });
  const [activeMode,     setActiveMode]     = useState<"home" | "deployment">("home");
  const [modeSending,    setModeSending]    = useState(false);
  const [modeConfirm,    setModeConfirm]    = useState<"home" | "deployment" | null>(null);
  const [showSaveAudio,  setShowSaveAudio]  = useState(false);
  // showMore removed — controls now visible in header
  // Per-channel CTCSS tones, persisted in localStorage
  const [channelTones, setChannelTones] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem("firebox_tones") ?? "{}"); } catch { return {}; }
  });

  const cycleTone = (channel: string) => {
    const current = channelTones[channel] ?? null;
    const idx     = current ? TONE_KEYS.indexOf(current) : -1;
    const next    = TONE_KEYS[(idx + 1) % TONE_KEYS.length];
    const updated = { ...channelTones, [channel]: next };
    setChannelTones(updated);
    localStorage.setItem("firebox_tones", JSON.stringify(updated));
  };

  const MONITORED_CHANNELS = activeMode === "deployment" ? DEPLOYMENT_CHANNELS : HOME_CHANNELS;
  const transcribeChannels = activeMode === "deployment"
    ? new Set(DEPLOYMENT_CHANNELS)
    : new Set(["wfd-ch2-scene", "wfd-ch6-ce"]);

  const activeIncident = incidents.find(i => i.status === "active") ?? null;

  const resolveName = useCallback((speaker?: string) => {
    if (!speaker) return speaker;
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

  useEffect(() => {
    const load = () => fetch("/api/firebox-provision")
      .then(r => r.ok ? r.json() : {}).then(d => setNodeAliases(d)).catch(() => {});
    load(); const t = setInterval(load, 300000); return () => clearInterval(t);
  }, []);

  const fetchIncidents = useCallback(async () => {
    const r = await fetch("/api/firebox-incidents").catch(() => null);
    if (r?.ok) { const d = await r.json(); setIncidents(d.incidents ?? []); }
  }, []);
  useEffect(() => { fetchIncidents(); }, [fetchIncidents]);

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
    setModeConfirm(null);
  };

  // Keyword scan — keep highest-severity hit, update if new critical comes in
  useEffect(() => {
    for (const tx of transcripts.slice(0, 3)) {
      const hit = detectKeyword(tx.transcript, keywordList);
      if (hit) {
        setKeywordHit(prev => {
          if (!prev) return hit;
          // Upgrade severity if new hit is higher
          const prevIdx = LEVEL_ORDER.indexOf(prev.level);
          const hitIdx  = LEVEL_ORDER.indexOf(hit.level);
          return hitIdx < prevIdx ? hit : prev;
        });
        return;
      }
    }
  }, [transcripts, keywordList]);

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
      ...Object.entries(byCh).map(([c, n]) => `  ${(CHANNEL_LABELS[c] ?? c).padEnd(22)} ${n} transmissions`),
      "",
      `── TRANSCRIPTS (${txs.length} total) ──────────────────────────`,
      "",
      ...txs.filter(t => !t.channel.startsWith("mesh-weather")).map(t =>
        `[${new Date(t.recorded_at).toLocaleTimeString("en-CA",{hour12:false,hour:"2-digit",minute:"2-digit"})}] ${(CHANNEL_LABELS[t.channel]??t.channel).padEnd(18)} ${t.speaker ? `[${t.speaker}] ` : ""}${t.transcript}`
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

  const isMeshFilter = channelFilter.startsWith("mesh-");
  const isPlanned    = PLANNED_CHANNELS.includes(channelFilter);
  const isAudioOnly  = channelFilter !== "all" && !transcribeChannels.has(channelFilter) && !isMeshFilter && !isPlanned;
  const filteredTx   = channelFilter === "all"
    ? transcripts
    : transcripts.filter(t => t.channel === channelFilter);

  const selectedCh = channelFilter !== "all" ? ch(channelFilter) : null;
  const selectedTone = selectedCh && COLOR_NRS_CHANNELS.has(channelFilter) ? channelTones[channelFilter] : null;

  return (
    <div style={{
      height: "100vh", overflow: "hidden", background: "#060b06", color: "#b8d8a0",
      fontFamily: "'Rajdhani',sans-serif",
      backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(57,211,83,0.012) 3px,rgba(57,211,83,0.012) 4px)",
      display: "flex", flexDirection: "column",
    }}>
      <FireBoxStyles />

      {/* ── Header ── */}
      <header style={{ flexShrink: 0, background: "#050a05", borderBottom: "1px solid #0e1a0e", padding: "0 16px" }}>
        <div style={{ height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>

          {/* Left */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <Link href="/projects" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#4a7a4a", textDecoration: "none", letterSpacing: 0.5, whiteSpace: "nowrap" }}>← Back</Link>
            <div style={{ width: 1, height: 22, background: "#1a2a1a", flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 4, color: "#c8e8b0", lineHeight: 1 }}>FIREBOX</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#3a6a3a", letterSpacing: 1, marginTop: 1 }}>Sea to Sky Radio</div>
            </div>
            {/* Live indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", border: `1px solid ${live ? "#1a3a1a" : "#2a2a2a"}`, background: live ? "#060e06" : "transparent", flexShrink: 0 }}>
              <span style={{ width: 8, height: 8, background: live ? "#39d353" : "#444", borderRadius: "50%", animation: live ? "pulse 2s ease-in-out infinite" : "none", flexShrink: 0 }} />
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: live ? "#39d353" : "#555", letterSpacing: 1 }}>{live ? "LIVE" : "PAUSED"}</span>
            </div>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, color: "#4a7a4a", letterSpacing: 1, flexShrink: 0 }}>{clock}</span>
          </div>

          {/* Right */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
            <button onClick={() => setShowIncident(true)} className="fb-btn" style={{
              padding: "5px 10px", border: `1px solid ${activeIncident ? "#f0a50060" : "#1a2a1a"}`,
              background: activeIncident ? "#1a0e00" : "transparent",
              color: activeIncident ? "#f0a500" : "#3a5a3a",
              cursor: "pointer", fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: 0.5, whiteSpace: "nowrap",
            }}>
              {activeIncident ? `⚡ ${activeIncident.name.slice(0, 12).toUpperCase()}` : "⚡ Incident"}
            </button>
            <button onClick={() => setShowSaveAudio(true)} className="fb-btn" style={{ padding: "5px 10px", border: "1px solid #1a2a3a", background: "transparent", color: "#4a8aaa", cursor: "pointer", fontFamily: "'Rajdhani',sans-serif", fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" }}>
              💾 Save
            </button>
            <button onClick={() => setShowKeywordMgr(true)} className="fb-btn" style={{ padding: "5px 10px", border: `1px solid ${keywordHit ? ALERT_LEVELS[keywordHit.level].border : "#1a2a1a"}`, background: keywordHit ? ALERT_LEVELS[keywordHit.level].bg : "transparent", color: keywordHit ? ALERT_LEVELS[keywordHit.level].color : "#5a7a5a", cursor: "pointer", fontFamily: "'Rajdhani',sans-serif", fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" }}>
              🔔 Alerts
            </button>
            <button onClick={() => setCompose({})} className="fb-btn" style={{ padding: "5px 10px", border: "1px solid #1a3a1a", background: "transparent", color: "#4a8a4a", cursor: "pointer", fontFamily: "'Rajdhani',sans-serif", fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" }}>
              📡 Mesh
            </button>
            <Link href="/projects/firebox/map" style={{ padding: "5px 10px", border: "1px solid #1a3a3a", background: "#060e10", color: "#38bdf8", textDecoration: "none", fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 12, display: "inline-block", whiteSpace: "nowrap" }}>
              🗺 Map
            </Link>
            <button onClick={() => setLive(v => !v)} className="fb-btn" style={{ padding: "5px 10px", border: "1px solid #1a2a1a", background: "transparent", color: live ? "#4a7a4a" : "#39d353", cursor: "pointer", fontFamily: "'Rajdhani',sans-serif", fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" }}>
              {live ? "⏸" : "▶"}
            </button>
            <button onClick={() => document.documentElement.requestFullscreen?.()} className="fb-btn" style={{ padding: "5px 8px", border: "1px solid #1a2a1a", background: "transparent", color: "#3a5a3a", cursor: "pointer", fontSize: 13 }} title="Fullscreen">⛶</button>
          </div>
        </div>
      </header>

      {/* ── Keyword alert — persistent until dismissed ── */}
      {keywordHit && (() => {
        const lv = ALERT_LEVELS[keywordHit.level];
        return (
          <div style={{
            background: lv.bg, borderBottom: `2px solid ${lv.border}`,
            padding: "9px 14px", display: "flex", alignItems: "center", justifyContent: "space-between",
            animation: lv.anim, flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>🚨</span>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, color: lv.color, padding: "2px 7px", border: `1px solid ${lv.border}`, background: "rgba(0,0,0,0.3)" }}>{lv.label}</span>
                  <span style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: 1, color: lv.color }}>
                    {keywordHit.word.toUpperCase()} DETECTED
                  </span>
                </div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: `${lv.color}88`, marginTop: 3 }}>
                  Scroll to top to find the matching transmission
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={() => setShowKeywordMgr(true)} style={{
                background: "transparent", border: `1px solid ${lv.color}40`, color: `${lv.color}99`,
                cursor: "pointer", fontSize: 11, padding: "6px 12px",
                fontFamily: "'JetBrains Mono',monospace",
              }}>Edit</button>
              <button onClick={() => setKeywordHit(null)} style={{
                background: lv.bg, border: `1px solid ${lv.border}`, color: lv.color,
                cursor: "pointer", fontSize: 12, padding: "6px 14px",
                fontFamily: "'Rajdhani',sans-serif", fontWeight: 700,
              }}>Dismiss ×</button>
            </div>
          </div>
        );
      })()}

      {/* ── Mesh ticker ── */}
      <MeshTicker messages={meshMessages} />

      {/* ── Weather ── */}
      <WeatherPanel history={weatherHistory} />

      {/* ── Body ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── Sidebar ── */}
        <aside style={{ width: 210, flexShrink: 0, background: "#050a05", borderRight: "1px solid #0e1a0e", display: "flex", flexDirection: "column", overflowY: "auto" }}>

          {/* Mode toggle */}
          <div style={{ padding: "8px 10px 6px", borderBottom: "1px solid #0e1a0e" }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#2a5a2a", letterSpacing: 2, marginBottom: 6 }}>RADIO MODE</div>
            <div style={{ display: "flex", gap: 5 }}>
              <button
                onClick={() => activeMode !== "home" && !modeSending && setModeConfirm("home")}
                disabled={modeSending}
                className="fb-btn"
                style={{
                  flex: 1, padding: "7px 4px", minHeight: 36,
                  border: `2px solid ${activeMode === "home" ? "#39d353" : "#1a2a1a"}`,
                  background: activeMode === "home" ? "#081408" : "transparent",
                  color: activeMode === "home" ? "#39d353" : "#3a5a3a",
                  fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 10, letterSpacing: 0.5,
                  cursor: activeMode === "home" ? "default" : "pointer",
                  opacity: modeSending ? 0.5 : 1,
                }}
              >🏔 WSLR</button>
              <button
                onClick={() => activeMode !== "deployment" && !modeSending && setModeConfirm("deployment")}
                disabled={modeSending}
                className="fb-btn"
                style={{
                  flex: 1, padding: "7px 4px", minHeight: 36,
                  border: `2px solid ${activeMode === "deployment" ? "#fb923c" : "#1a2a1a"}`,
                  background: activeMode === "deployment" ? "#1a0800" : "transparent",
                  color: activeMode === "deployment" ? "#fb923c" : "#3a5a3a",
                  fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 10, letterSpacing: 0.5,
                  cursor: activeMode === "deployment" ? "default" : "pointer",
                  opacity: modeSending ? 0.5 : 1,
                }}
              >🔥 DEPL</button>
            </div>
          </div>

          {/* ALL */}
          {(() => { const active = channelFilter === "all"; return (
            <button onClick={() => setFilter("all")} className="fb-tab" style={{
              width: "100%", minHeight: 38, padding: "0 10px", border: "none", cursor: "pointer",
              borderLeft: `3px solid ${active ? "#4a8a4a" : "transparent"}`,
              background: active ? "#0a120a" : "transparent",
              display: "flex", alignItems: "center", gap: 8, textAlign: "left",
            }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: transcripts.length > 0 ? "#39d353" : "#1a2a1a", flexShrink: 0 }} />
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: active ? 700 : 400, fontSize: 11, color: active ? "#7aba7a" : "#3a6a3a", letterSpacing: 0.5 }}>ALL CHANNELS</span>
              {transcripts.length > 0 && <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#2a5a2a" }}>{transcripts.length}</span>}
            </button>
          ); })()}

          {/* Active channels section */}
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#2a5a2a", letterSpacing: 2, padding: "8px 10px 3px", borderTop: "1px solid #0b160b" }}>
            {activeMode === "deployment" ? "DEPLOYMENT" : "WHISTLER"}
          </div>
          {MONITORED_CHANNELS.map(c => {
            const s = ch(c); const active = channelFilter === c;
            const hasActivity = transcripts.some(t => t.channel === c);
            const chCount = transcripts.filter(t => t.channel === c).length;
            const tone = channelTones[c] ?? null;
            const isRepeater = COLOR_NRS_CHANNELS.has(c);
            return (
              <button key={c} onClick={() => setFilter(c)} className="fb-tab" style={{
                width: "100%", minHeight: 40, padding: "4px 10px", border: "none", cursor: "pointer",
                borderLeft: `3px solid ${active ? s.color : "transparent"}`,
                background: active ? `${s.color}14` : "transparent",
                display: "flex", alignItems: "center", gap: 7, textAlign: "left",
                transition: "all 0.15s",
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                  background: hasActivity ? s.color : "#1a2a1a",
                  animation: hasActivity ? "pulse 2s ease-in-out infinite" : "none",
                }} />
                <div style={{ flex: 1, overflow: "hidden", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, color: active ? s.color : "#4a7a4a", letterSpacing: 0.5, flexShrink: 0 }}>{s.code}</span>
                    {chCount > 0 && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#2a5a2a" }}>{chCount}</span>}
                  </div>
                  <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 11, color: active ? `${s.color}cc` : "#3a5a3a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.2 }}>{s.label}</div>
                </div>
                {isRepeater && (
                  <ToneBadge channel={c} tone={tone} onCycle={cycleTone} />
                )}
              </button>
            );
          })}

          {/* Future channels */}
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#1e2e1e", letterSpacing: 2, padding: "8px 10px 3px", marginTop: 2, borderTop: "1px solid #0b160b" }}>
            FUTURE — NOT INSTALLED
          </div>
          {PLANNED_CHANNELS.map(c => {
            const s = ch(c); const active = channelFilter === c;
            const dongle = (s as { dongle?: string }).dongle ?? "D2";
            const dc = dongle === "D3" ? "#fb7185" : "#a78bfa";
            return (
              <button key={c} onClick={() => setFilter(c)} className="fb-tab" style={{
                width: "100%", minHeight: 40, padding: "0 12px", border: "none", cursor: "pointer",
                borderLeft: `3px solid ${active ? dc : "transparent"}`,
                background: active ? `${dc}10` : "transparent",
                display: "flex", alignItems: "center", gap: 8, textAlign: "left",
                opacity: active ? 1 : 0.5, transition: "all 0.15s",
              }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#1a1a2a", flexShrink: 0 }} />
                <div style={{ flex: 1, overflow: "hidden", minWidth: 0 }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: active ? dc : "#2a2a5a", whiteSpace: "nowrap" }}>{s.code}</div>
                  <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 12, color: "#2a2a4a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.label}</div>
                </div>
                <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace", color: `${dc}80`, fontWeight: 700, padding: "1px 4px", border: `1px solid ${dc}40`, flexShrink: 0, borderRadius: 2 }}>{dongle}</span>
              </button>
            );
          })}

          {/* Mesh */}
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#2a5a2a", letterSpacing: 2, padding: "8px 10px 3px", marginTop: 2, borderTop: "1px solid #0b160b" }}>MESH</div>
          {(["mesh-text", "mesh-weather"] as string[]).map(c => {
            const s = ch(c); const active = channelFilter === c;
            const hasMesh = meshMessages.some(m => m.channel === c);
            return (
              <button key={c} onClick={() => setFilter(c)} className="fb-tab" style={{
                width: "100%", minHeight: 42, padding: "0 12px", border: "none", cursor: "pointer",
                borderLeft: `3px solid ${active ? s.color : "transparent"}`,
                background: active ? `${s.color}12` : "transparent",
                display: "flex", alignItems: "center", gap: 8, textAlign: "left",
                transition: "all 0.15s",
              }}>
                <span style={{ fontSize: 14 }}>{(s as { icon?: string }).icon}</span>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: active ? s.color : "#4a8a4a" }}>{s.code}</div>
                {hasMesh && <span style={{ marginLeft: "auto", width: 8, height: 8, borderRadius: "50%", background: s.color, animation: "pulse 2s ease-in-out infinite" }} />}
              </button>
            );
          })}

          {/* Compose */}
          <div style={{ marginTop: "auto", padding: 10, borderTop: "1px solid #0b160b" }}>
            <button onClick={() => setCompose({})} className="fb-btn" style={{
              width: "100%", padding: "10px 0", minHeight: 42,
              border: "1px solid #1a3a1a", background: "#060e06",
              color: "#39d353", cursor: "pointer",
              fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: 1,
            }}>📡 Send Mesh</button>
          </div>
        </aside>

        {/* ── Main content ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Channel header bar — shown when a specific channel is selected */}
          {channelFilter !== "all" && selectedCh && (
            <div style={{ flexShrink: 0, borderBottom: "1px solid #0e1a0e", padding: "8px 16px", background: "#050905", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: selectedCh.color, flexShrink: 0 }} />
              <div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700, color: selectedCh.color }}>{selectedCh.code}</div>
                <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 12, color: "#4a7a4a" }}>{selectedCh.label}</div>
              </div>
              {(selectedCh as { tx?: number }).tx && (
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#3a6a3a" }}>
                  {(selectedCh as { rx?: number; tx?: number }).rx
                    ? `TX ${(selectedCh as { tx?: number }).tx} · RX ${(selectedCh as { rx?: number }).rx} MHz`
                    : `${(selectedCh as { tx?: number }).tx} MHz`}
                </div>
              )}
              {selectedTone && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8, padding: "4px 10px", background: "#0a1a0a", border: "1px solid #39d35340" }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#39d353", fontWeight: 700 }}>{selectedTone}</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#4a7a4a" }}>{CTCSS_TONES[selectedTone]} Hz</span>
                </div>
              )}
              {COLOR_NRS_CHANNELS.has(channelFilter) && !selectedTone && (
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#5a5a3a" }}>
                  ⚠ Tone not set — tap T? in sidebar
                </div>
              )}
              {/* Live audio player */}
              {!isMeshFilter && !isPlanned && (
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#2a5a2a", whiteSpace: "nowrap" }}>LIVE AUDIO</span>
                  <audio controls src={`https://firebox.tail4bb545.ts.net/${channelFilter}.mp3`}
                    style={{ flex: 1, height: 28, colorScheme: "dark" } as React.CSSProperties} />
                </div>
              )}
            </div>
          )}

          {/* Feed */}
          <main style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }} ref={feedRef}>
            <div style={{ maxWidth: 820, margin: "0 auto", display: "flex", flexDirection: "column", gap: 8 }}>

              {isPlanned ? (
                <div style={{ textAlign: "center", padding: "80px 24px" }}>
                  {(() => { const s = ch(channelFilter); const d = (s as {dongle?:string}).dongle ?? "D2"; const dc = d === "D3" ? "#fb7185" : "#a78bfa"; return (
                    <>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: dc, marginBottom: 14, padding: "6px 18px", border: `1px solid ${dc}40`, display: "inline-block" }}>
                        {d} REQUIRED
                      </div>
                      <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 18, color: s.color, marginBottom: 8 }}>{s.label}</div>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#3a5a3a", lineHeight: 1.6 }}>
                        This channel requires a second SDR dongle that has not been installed yet.
                      </div>
                    </>
                  ); })()}
                </div>

              ) : isAudioOnly ? (
                <div style={{ textAlign: "center", padding: "80px 24px" }}>
                  <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 20, color: "#4a8a4a", marginBottom: 12 }}>
                    {ch(channelFilter).label}
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: "#3a6a3a", marginBottom: 8 }}>
                    Listening — no text transcription on this channel
                  </div>
                  <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 13, color: "#2a5a2a" }}>
                    Use the audio player above to listen live.
                  </div>
                </div>

              ) : filteredTx.length === 0 ? (
                <div style={{ textAlign: "center", padding: "80px 24px" }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: 3, color: "#2a5a2a", marginBottom: 18, animation: "pulse 3s ease-in-out infinite" }}>● ● ●</div>
                  <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 20, color: "#3a7a3a", marginBottom: 8 }}>Monitoring</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: "#2a5a2a" }}>Waiting for radio traffic</div>
                  {lastUpdated && (
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#1e3a1e", marginTop: 12 }}>
                      Last checked {formatTime(lastUpdated.toISOString())}
                    </div>
                  )}
                </div>

              ) : filteredTx.map((tx, i) => {
                const s      = ch(tx.channel);
                const isMesh = tx.channel.startsWith("mesh-");
                const isWx   = tx.channel === "mesh-weather";
                const displaySpeaker = resolveName(tx.speaker);
                const isDisp = displaySpeaker?.toLowerCase() === "dispatch";
                const speakerLabel = isDisp ? "DISP" : (displaySpeaker && displaySpeaker !== "Unknown" ? displaySpeaker.toUpperCase() : null);
                const hasQuality = tx.signal != null || tx.readability != null;

                return (
                  <div key={`${tx.timestamp}-${i}`} className="fb-card" style={{
                    position: "relative",
                    background: isMesh ? "#090f09" : "#080d08",
                    borderLeft: `3px solid ${s.color}`,
                    borderBottom: `1px solid ${isMesh ? `${s.color}20` : "#0d180d"}`,
                    borderTop: "1px solid transparent",
                    borderRight: "1px solid transparent",
                    padding: "7px 12px",
                    animationDelay: `${Math.min(i * 0.03, 0.3)}s`,
                  }}>
                    {/* Row 1: time · code · channel · speaker · quality */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "nowrap" }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#4a8a4a", letterSpacing: 0.5, flexShrink: 0 }}>
                        {formatTime(tx.timestamp, true)}
                      </span>
                      <span style={{ width: 1, height: 10, background: "#1a2a1a", flexShrink: 0 }} />
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, color: s.color, letterSpacing: 0.5, flexShrink: 0 }}>
                        {isMesh ? (isWx ? "🌡" : "📡") : null}{s.code}
                      </span>
                      {channelFilter === "all" && (
                        <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 11, color: `${s.color}99`, flexShrink: 0, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.label}
                        </span>
                      )}
                      {speakerLabel && (
                        <span style={{
                          fontFamily: "'JetBrains Mono',monospace", fontSize: 10,
                          color: isDisp ? "#64b5f6" : "#f59e0b",
                          padding: "0px 5px",
                          background: isDisp ? "#08131e" : "#130d00",
                          border: `1px solid ${isDisp ? "#64b5f628" : "#f59e0b28"}`,
                          flexShrink: 0,
                        }}>
                          {speakerLabel}
                        </span>
                      )}
                      {hasQuality && (
                        <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#2a5a2a", flexShrink: 0 }} title="Signal × Readability (ITU scale 1–5)">
                          S{tx.signal ?? "—"}·R{tx.readability ?? "—"}
                        </span>
                      )}
                    </div>

                    {/* Transcript */}
                    <p style={{
                      fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, fontWeight: 500,
                      lineHeight: 1.45, margin: 0,
                      color: isMesh ? `${s.color}e0` : "#aacf90",
                    }}>{tx.transcript}</p>

                    {/* Reply (mesh only) */}
                    {isMesh && !isWx && (
                      <button
                        onClick={() => setCompose({ replyTo: displaySpeaker ?? undefined })}
                        className="fb-reply"
                        style={{
                          marginTop: 8, padding: "3px 12px",
                          border: "1px solid #0e2e0e", background: "transparent",
                          color: "#2a5a2a", fontSize: 11, cursor: "pointer",
                          fontFamily: "'Rajdhani',sans-serif", letterSpacing: 0.5,
                        }}
                      >↩ Reply</button>
                    )}
                  </div>
                );
              })}

              {hasMore && filteredTx.length > 0 && (
                <div style={{ textAlign: "center", padding: "16px 0 24px" }}>
                  <button onClick={loadMore} disabled={loading} className="fb-btn" style={{
                    padding: "10px 28px", border: "1px solid #1a2a1a", background: "transparent",
                    color: "#4a7a4a", cursor: loading ? "default" : "pointer", opacity: loading ? 0.4 : 1,
                    fontFamily: "'JetBrains Mono',monospace", fontSize: 12,
                  }}>{loading ? "Loading…" : "Load Older"}</button>
                </div>
              )}

            </div>
          </main>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer style={{ flexShrink: 0, borderTop: "1px solid #0b160b", padding: "5px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#2a4a2a", letterSpacing: 0.5 }}>
          FIREBOX · Sea to Sky Radio Network
          {lastUpdated && ` · updated ${formatTime(lastUpdated.toISOString())}`}
        </span>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#2a4a2a" }}>50°07′N 122°57′W</span>
      </footer>

      {/* ── Modals ── */}
      {compose && <MeshCompose replyTo={compose.replyTo} onClose={() => setCompose(null)} />}
      {showSaveAudio && <SaveAudioModal onClose={() => setShowSaveAudio(false)} />}
      {showKeywordMgr && <KeywordManager rules={keywordList} onChange={saveKeywords} onClose={() => setShowKeywordMgr(false)} />}

      {modeConfirm && (
        <ModeConfirmModal
          target={modeConfirm}
          currentMode={activeMode}
          onConfirm={() => sendMode(modeConfirm)}
          onCancel={() => setModeConfirm(null)}
        />
      )}

      {/* ── Incident Modal ── */}
      {showIncident && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => setShowIncident(false)}>
          <div style={{ background: "#0a110a", border: "1px solid #1e3a1e", borderRadius: 12, padding: 28, width: "100%", maxWidth: 480 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: 1, color: "#f0a500", marginBottom: 20 }}>⚡ Incident Management</div>

            {activeIncident && (
              <div style={{ background: "#1a0e00", border: "1px solid #f0a50030", borderRadius: 10, padding: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#f0a500", marginBottom: 6 }}>{activeIncident.name}</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#7a5a00", marginBottom: 14 }}>
                  Started {fmtDate(activeIncident.start_at)} · {fmtIncidentDuration(activeIncident.start_at)} elapsed
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => exportIncident(activeIncident)} style={{
                    flex: 1, padding: "11px 0", borderRadius: 8, border: "1px solid #39d35340",
                    background: "#060e06", color: "#39d353", fontFamily: "'Rajdhani',sans-serif",
                    fontWeight: 700, fontSize: 14, cursor: "pointer",
                  }}>📋 Download Report</button>
                  <button onClick={() => { endIncident(activeIncident.id); setShowIncident(false); }} style={{
                    flex: 1, padding: "11px 0", borderRadius: 8, border: "1px solid #ff444430",
                    background: "#1a0000", color: "#ff7777", fontFamily: "'Rajdhani',sans-serif",
                    fontWeight: 700, fontSize: 14, cursor: "pointer",
                  }}>■ End Incident</button>
                </div>
              </div>
            )}

            {incidents.filter(i => i.status === "closed").length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#3a6a3a", letterSpacing: 1, marginBottom: 10 }}>PAST INCIDENTS</div>
                {incidents.filter(i => i.status === "closed").map(inc => (
                  <div key={inc.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #0e1a0e" }}>
                    <div>
                      <div style={{ fontSize: 14, color: "#6a8a6a", fontWeight: 600 }}>{inc.name}</div>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#3a5a3a" }}>{fmtDate(inc.start_at)} · {fmtIncidentDuration(inc.start_at, inc.end_at)}</div>
                    </div>
                    <button onClick={() => exportIncident(inc)} style={{
                      padding: "6px 14px", borderRadius: 6, border: "1px solid #1a3a1a",
                      background: "transparent", color: "#39d353", fontSize: 13, cursor: "pointer",
                      fontFamily: "'Rajdhani',sans-serif", fontWeight: 600,
                    }}>Export</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#3a6a3a", letterSpacing: 1, marginBottom: 10 }}>START NEW INCIDENT</div>
            <input value={incidentForm.name} onChange={e => setIncidentForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Incident name (e.g. Spring Startup Training)"
              style={{ width: "100%", padding: "12px 14px", borderRadius: 8, marginBottom: 10, boxSizing: "border-box",
                background: "#060e06", border: "1px solid #1e3a1e", color: "#b8d8a0",
                fontFamily: "'Rajdhani',sans-serif", fontSize: 14, outline: "none" }} />
            <input type="datetime-local" value={incidentForm.start_at} onChange={e => setIncidentForm(f => ({ ...f, start_at: e.target.value }))}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 8, marginBottom: 12, boxSizing: "border-box",
                background: "#060e06", border: "1px solid #1e3a1e", color: "#6a8a6a",
                fontFamily: "'JetBrains Mono',monospace", fontSize: 12, outline: "none" }} />
            <div style={{ fontSize: 12, fontFamily: "'JetBrains Mono',monospace", color: "#2a5a2a", marginBottom: 18, lineHeight: 1.6 }}>
              Leave date blank to start now. Starting a new incident automatically closes any active one.
            </div>
            <button onClick={startIncident} disabled={!incidentForm.name.trim()} style={{
              width: "100%", padding: "14px 0", borderRadius: 8,
              background: incidentForm.name.trim() ? "#0d2a0d" : "#0a110a",
              border: `1px solid ${incidentForm.name.trim() ? "#39d353" : "#1a2a1a"}`,
              color: incidentForm.name.trim() ? "#39d353" : "#1a2a1a",
              fontFamily: "'Rajdhani',sans-serif", fontWeight: 800, fontSize: 15,
              cursor: incidentForm.name.trim() ? "pointer" : "default",
            }}>Start Incident →</button>
          </div>
        </div>
      )}

      {/* ── Export Modal ── */}
      {showExport && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => setShowExport(null)}>
          <div style={{ background: "#080d08", border: "1px solid #1e3a1e", borderRadius: 12, padding: 24, width: "100%", maxWidth: 700, maxHeight: "85vh", display: "flex", flexDirection: "column" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 800, fontSize: 16, letterSpacing: 1, color: "#39d353" }}>
                📋 Incident Report · {showExport.name}
              </div>
              <button onClick={() => setShowExport(null)} style={{ background: "none", border: "none", color: "#4a7a4a", fontSize: 24, cursor: "pointer" }}>×</button>
            </div>
            {exportLoading ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: "#3a6a3a" }}>
                Loading transcripts…
              </div>
            ) : (
              <>
                <textarea readOnly value={exportData} style={{
                  flex: 1, background: "#040804", border: "1px solid #0e1a0e", borderRadius: 8,
                  color: "#6a9a6a", fontFamily: "'JetBrains Mono',monospace", fontSize: 11,
                  lineHeight: 1.6, padding: 14, resize: "none", outline: "none", minHeight: 300,
                }} />
                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  <button onClick={() => navigator.clipboard.writeText(exportData)} style={{
                    flex: 1, padding: "12px 0", borderRadius: 8, border: "1px solid #39d35340",
                    background: "#060e06", color: "#39d353", fontFamily: "'Rajdhani',sans-serif",
                    fontWeight: 700, fontSize: 14, cursor: "pointer",
                  }}>📋 Copy to Clipboard</button>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#2a4a2a", display: "flex", alignItems: "center", maxWidth: 200, lineHeight: 1.6 }}>
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

// ── Root ──────────────────────────────────────────────────────────────────────
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
