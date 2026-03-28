"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";

const FIREBOX_PASSWORD = "FireBox";

const SUPABASE_URL  = "https://bdgmpkbbohbucwoiucyw.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZ21wa2Jib2hidWN3b2l1Y3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1Nzk3ODEsImV4cCI6MjA5MDE1NTc4MX0.WAuh1vJsqxkdQKoBQ6i_qfHiJyKM-TSJ9BLtn8EyUws";

type Transcript = {
  channel: string;
  filename: string;
  timestamp: string;
  transcript: string;
  speaker?: string;
};

const TRANSCRIBE_CHANNELS = new Set(["wfd-ch2-scene", "wfd-ch6-ce"]);

const CHANNEL_STYLE: Record<string, { label: string; color: string; icon?: string }> = {
  "wfd-ch2-scene":       { label: "WFD On Scene",        color: "#f0a500" },
  "wfd-ch6-ce":          { label: "WFD Comb. Events",    color: "#fb923c" },
  "wb-patrol-whistler":  { label: "WB Whistler Patrol",  color: "#38bdf8" },
  "wb-patrol-blackcomb": { label: "WB Blackcomb Patrol", color: "#22d3ee" },
  "wb-lift-ops":         { label: "WB Lift Ops",         color: "#67e8f9" },
  "wb-ops":              { label: "WB Operations",       color: "#a5f3fc" },
  "wb-heliski":          { label: "WB Heliskiing",       color: "#7dd3fc" },
  "mesh-text":           { label: "Mesh · Text",         color: "#4ade80", icon: "📡" },
  "mesh-weather":        { label: "Mesh · Weather",      color: "#38bdf8", icon: "🌡" },
};

const MONITORED_CHANNELS = [
  "wfd-ch2-scene", "wfd-ch6-ce",
  "wb-patrol-whistler", "wb-patrol-blackcomb",
  "wb-lift-ops", "wb-ops", "wb-heliski",
];

function ch(channel: string) {
  return CHANNEL_STYLE[channel] ?? { label: channel, color: "#888" };
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
  } catch { return iso; }
}

type WeatherReading = {
  ts: string; node: string;
  temp?: number; humidity?: number; pressure?: number;
};

function parseWeather(transcript: string, speaker?: string, ts?: string): WeatherReading {
  const r: WeatherReading = { ts: ts ?? "", node: speaker ?? "?" };
  for (const part of transcript.split("|")) {
    const t = part.trim();
    if (t.startsWith("Temp:"))      r.temp     = parseFloat(t.replace("Temp:", "").replace("C","").trim());
    if (t.startsWith("Humidity:"))  r.humidity = parseFloat(t.replace("Humidity:", "").replace("%","").trim());
    if (t.startsWith("Pressure:"))  r.pressure = parseFloat(t.replace("Pressure:", "").replace("hPa","").trim());
  }
  return r;
}

function trendArrow(curr?: number, old?: number, thr = 0.5): { sym: string; color: string } {
  if (curr == null || old == null) return { sym: "—", color: "#444" };
  if (curr > old + thr) return { sym: "↑", color: "#4ade80" };
  if (curr < old - thr) return { sym: "↓", color: "#f87171" };
  return { sym: "→", color: "#888" };
}

function ageLabel(iso: string): { text: string; color: string } {
  const sec = (Date.now() - new Date(iso).getTime()) / 1000;
  if (sec < 300)  return { text: `${Math.round(sec / 60)} min ago`,  color: "#4ade80" };
  if (sec < 1800) return { text: `${Math.round(sec / 60)} min ago`,  color: "#f0a500" };
  if (sec < 7200) return { text: `${Math.round(sec / 3600)} hr ago`, color: "#f0a500" };
  return { text: "stale", color: "#555" };
}

// ── Weather panel ───────────────────────────────────────────────────────────────

function WeatherNodeCard({ nodeHistory }: { nodeHistory: WeatherReading[] }) {
  const latest = nodeHistory[0];
  const old    = nodeHistory.length >= 5 ? nodeHistory[nodeHistory.length - 1] : undefined;
  const age    = ageLabel(latest.ts);

  const tTemp = trendArrow(latest.temp,     old?.temp,     0.5);
  const tHum  = trendArrow(latest.humidity, old?.humidity, 2);
  const tPres = trendArrow(latest.pressure, old?.pressure, 0.5);

  const hourLabel = old
    ? `${Math.round((new Date(latest.ts).getTime() - new Date(old.ts).getTime()) / 60000)}m`
    : "";

  const crossover = latest.temp != null && latest.humidity != null && latest.temp >= latest.humidity;
  const extreme   = latest.temp != null && latest.humidity != null && latest.temp >= 30 && latest.humidity <= 15;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 0,
      padding: "8px 16px",
      background: crossover ? (extreme ? "#1a050080" : "#100a0080") : "#060d1080",
      borderRadius: 10,
      border: `1px solid ${crossover ? (extreme ? "#ef444440" : "#f0a50040") : "#0e1f25"}`,
      borderTop: crossover ? `2px solid ${extreme ? "#ef4444" : "#f0a500"}` : "2px solid transparent",
      flex: "0 0 auto",
      transition: "all 0.4s ease",
    }}>

      {/* Node label */}
      <div style={{ marginRight: 14, minWidth: 44 }}>
        <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: 1.2, color: "#1e6e8e", marginBottom: 2 }}>WX NODE</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#38bdf8" }}>{latest.node}</div>
      </div>

      <div style={{ width: 1, height: 32, background: "#0e1f25", marginRight: 14, flexShrink: 0 }} />

      {/* Metrics */}
      {[
        { label: "TEMP",  val: latest.temp     != null ? `${latest.temp.toFixed(1)}°C`      : "—", trend: tTemp },
        { label: "RH",    val: latest.humidity != null ? `${Math.round(latest.humidity)}%`  : "—", trend: tHum  },
        { label: "hPa",   val: latest.pressure != null ? `${latest.pressure.toFixed(1)}`    : "—", trend: tPres },
      ].map(({ label, val, trend }) => (
        <div key={label} style={{ marginRight: 14, flexShrink: 0 }}>
          <div style={{ fontSize: 8, letterSpacing: 1, color: "#2a5a70", fontWeight: 700, marginBottom: 1 }}>{label}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#e0f4ff", fontFamily: "monospace" }}>{val}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: trend.color }}>{trend.sym}</span>
          </div>
        </div>
      ))}

      {/* Crossover badge */}
      {crossover && (
        <div style={{
          marginLeft: 6, marginRight: 6,
          padding: "3px 8px", borderRadius: 5,
          background: extreme ? "#7f1d1d" : "#78350f",
          border: `1px solid ${extreme ? "#ef4444" : "#f0a500"}`,
          animation: extreme ? "pulse 1.2s ease-in-out infinite" : undefined,
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: 1.2, color: extreme ? "#fca5a5" : "#fcd34d" }}>
            {extreme ? "⚠ EXTREME" : "⚠ CROSSOVER"}
          </div>
          <div style={{ fontSize: 8, color: extreme ? "#f87171" : "#f0a500" }}>
            {extreme ? "high spread" : `T${latest.temp?.toFixed(0)}≥RH${latest.humidity?.toFixed(0)}`}
          </div>
        </div>
      )}

      {/* Age */}
      <div style={{ marginLeft: crossover ? 0 : 6, textAlign: "right", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9, color: age.color }}>
          <span style={{ width: 4, height: 4, borderRadius: "50%", background: age.color, display: "inline-block" }} />
          {age.text}
        </div>
        {hourLabel && <div style={{ fontSize: 9, color: "#2a5a70", marginTop: 2 }}>{hourLabel} trend</div>}
      </div>
    </div>
  );
}

function WeatherPanel({ history }: { history: WeatherReading[] }) {
  if (history.length === 0) return null;

  // Group by node — supports multiple weather sensors
  const nodes = new Map<string, WeatherReading[]>();
  for (const r of history) {
    if (!nodes.has(r.node)) nodes.set(r.node, []);
    nodes.get(r.node)!.push(r);
  }

  return (
    <div style={{ background: "#04090c", borderBottom: "1px solid #0a1820", padding: "8px 24px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 2 }}>
          {Array.from(nodes.entries()).map(([node, nodeHistory]) => (
            <WeatherNodeCard key={node} nodeHistory={nodeHistory} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Mesh ticker ────────────────────────────────────────────────────────────────

function MeshTicker({ messages }: { messages: Transcript[] }) {
  const latest = messages[0];
  if (!latest) return null;

  const isWx   = latest.channel === "mesh-weather";
  const icon   = isWx ? "🌡" : "📡";
  const label  = `${icon} ${latest.speaker ?? "Mesh"}: ${latest.transcript}`;
  const secs   = Math.max(14, label.length * 0.22);

  return (
    <div style={{
      height: 36, background: "#050e05", borderBottom: "1px solid #0d1a0d",
      display: "flex", alignItems: "center", overflow: "hidden",
    }}>
      <style>{`
        @keyframes fbTicker {
          0%   { transform: translateX(100vw); }
          100% { transform: translateX(-100%); }
        }
      `}</style>

      {/* Pill */}
      <div style={{
        flexShrink: 0, padding: "0 14px", height: "100%",
        display: "flex", alignItems: "center", gap: 8,
        borderRight: "1px solid #0d1a0d",
      }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, color: "#2d6a2d" }}>MESH</span>
        <span style={{
          fontSize: 9, fontWeight: 700, padding: "1px 6px",
          borderRadius: 10, background: "#0d2a0d", color: "#4ade80",
        }}>{messages.length}</span>
      </div>

      {/* Scrolling content */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <div key={latest.timestamp} style={{
          animation: `fbTicker ${secs}s linear 1 forwards`,
          whiteSpace: "nowrap", fontSize: 12,
          color: isWx ? "#7dd3fc" : "#86efac",
          lineHeight: "36px", paddingLeft: 12,
        }}>
          {label}
          {messages.length > 1 && (
            <span style={{ color: "#1e3a1e", marginLeft: 32 }}>
              + {messages.length - 1} more message{messages.length > 2 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Login ──────────────────────────────────────────────────────────────────────

function LoginScreen({ onAuth }: { onAuth: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError]  = useState(false);
  const submit = () => {
    if (value === FIREBOX_PASSWORD) { sessionStorage.setItem("firebox_auth","true"); onAuth(); }
    else { setError(true); setValue(""); }
  };
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <Image src="/logo.png" alt="WhistlerBrew" width={180} height={45} style={{ height: "auto", marginBottom: 40, opacity: 0.8 }} />
      <div style={{ width: "100%", maxWidth: 360, background: "#111", border: "1px solid #1e1e1e", borderRadius: 16, padding: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 22 }}>📻</span>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0 }}>FireBox</h1>
        </div>
        <p style={{ color: "#555", fontSize: 13, marginBottom: 24, lineHeight: 1.5 }}>
          Live WFD radio transcripts. Enter access code to continue.
        </p>
        <input
          type="password" value={value} autoFocus
          onChange={e => { setValue(e.target.value); setError(false); }}
          onKeyDown={e => e.key === "Enter" && submit()}
          placeholder="Access code"
          style={{
            width: "100%", background: "#0d0d0d", border: `1px solid ${error ? "#ef4444" : "#222"}`,
            borderRadius: 10, padding: "12px 16px", color: "#fff", fontSize: 14,
            outline: "none", boxSizing: "border-box", marginBottom: 8,
          }}
        />
        {error && <p style={{ color: "#ef4444", fontSize: 12, marginBottom: 8 }}>Incorrect code. Try again.</p>}
        <button onClick={submit} style={{
          width: "100%", padding: "13px 0", borderRadius: 10, border: "none",
          background: "#f0a500", color: "#000", fontWeight: 700, fontSize: 14, cursor: "pointer",
        }}>Enter</button>
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
  const [lastUpdated,  setLastUpdated]  = useState<Date | null>(null);
  const [live,   setLive]       = useState(true);
  const [offset, setOffset]     = useState(0);
  const [hasMore, setHasMore]   = useState(true);
  const [loading, setLoading]   = useState(false);
  const feedRef  = useRef<HTMLDivElement>(null);
  const prevRef  = useRef(0);
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
      // 60 entries = ~1 hour of data at 60s intervals
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

  useEffect(() => { setOffset(0); setHasMore(true); }, [channelFilter]);

  useEffect(() => {
    fetchFeed();
    fetchMesh();
    fetchWeather();
    if (!live) return;
    const t1 = setInterval(fetchFeed,   30000);
    const t2 = setInterval(fetchMesh,   15000);
    const t3 = setInterval(fetchWeather, 60000);
    return () => { clearInterval(t1); clearInterval(t2); clearInterval(t3); };
  }, [fetchFeed, fetchMesh, fetchWeather, live]);

  const activeChannels = Array.from(new Set([
    ...MONITORED_CHANNELS,
    ...transcripts.map(t => t.channel).filter(c => !c.startsWith("mesh-")),
  ]));

  const isMeshFilter  = channelFilter.startsWith("mesh-");
  const isAudioOnly   = channelFilter !== "all" && !TRANSCRIBE_CHANNELS.has(channelFilter) && !isMeshFilter;
  const filteredTx    = channelFilter === "all"
    ? transcripts
    : transcripts.filter(t => t.channel === channelFilter);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e0e0e0", fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <header style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "#0a0a0a", borderBottom: "1px solid #1a1a1a",
        padding: "0 24px",
      }}>
        <div style={{ maxWidth: 760, margin: "0 auto", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/projects" style={{ color: "#444", textDecoration: "none", fontSize: 13 }}>← Projects</Link>
            <span style={{ color: "#1e1e1e" }}>|</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>📻</span>
              <span style={{ fontWeight: 700, fontSize: 16 }}>FireBox</span>
            </div>
            <span style={{
              display: "flex", alignItems: "center", gap: 5, fontSize: 11,
              padding: "3px 8px", borderRadius: 20,
              background: live ? "#0d2a0d" : "#1a1a1a",
              color: live ? "#4ade80" : "#555",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: live ? "#4ade80" : "#444", animation: live ? "pulse 2s ease-in-out infinite" : "none" }} />
              {live ? "LIVE" : "PAUSED"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {lastUpdated && (
              <span style={{ fontSize: 11, color: "#444" }}>Updated {formatTime(lastUpdated.toISOString())}</span>
            )}
            <button onClick={() => setLive(v => !v)} style={{
              fontSize: 12, padding: "5px 12px", borderRadius: 8,
              border: "1px solid #222", background: "transparent",
              color: "#666", cursor: "pointer",
            }}>{live ? "Pause" : "Resume"}</button>
          </div>
        </div>
      </header>

      {/* Mesh ticker */}
      <MeshTicker messages={meshMessages} />

      {/* Weather panel */}
      <WeatherPanel history={weatherHistory} />

      {/* Channel tabs */}
      <div style={{ borderBottom: "1px solid #1a1a1a", padding: "0 24px", overflowX: "auto" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", gap: 2, paddingTop: 10 }}>
          {(["all", ...activeChannels, "mesh-text", "mesh-weather"] as string[]).map(c => {
            const s = c === "all" ? { label: "All", color: "#888" } : ch(c);
            const active = channelFilter === c;
            const audioOnly = c !== "all" && !TRANSCRIBE_CHANNELS.has(c) && !c.startsWith("mesh-");
            const isMesh = c.startsWith("mesh-");
            return (
              <button key={c} onClick={() => setFilter(c)} style={{
                padding: "7px 14px", fontSize: 11, fontWeight: active ? 600 : 400,
                borderRadius: "8px 8px 0 0", border: "none", cursor: "pointer",
                borderBottom: active ? `2px solid ${s.color}` : "2px solid transparent",
                background: active ? `${s.color}10` : "transparent",
                color: active ? s.color : "#555",
                whiteSpace: "nowrap",
                display: "flex", alignItems: "center", gap: 4,
              }}>
                {audioOnly && <span style={{ opacity: 0.5, fontSize: 10 }}>🔊</span>}
                {isMesh && <span style={{ fontSize: 10 }}>{(CHANNEL_STYLE[c] as { icon?: string })?.icon}</span>}
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Audio player */}
      {channelFilter !== "all" && !isMeshFilter && (
        <div style={{ borderBottom: "1px solid #1a1a1a", padding: "10px 24px", background: "#0a0a0a" }}>
          <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#444", whiteSpace: "nowrap" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", animation: "pulse 2s ease-in-out infinite" }} />
              Live audio
            </span>
            <audio controls src={`https://firebox.tail4bb545.ts.net/${channelFilter}.mp3`}
              style={{ width: "100%", height: 32, colorScheme: "dark" } as React.CSSProperties} />
          </div>
        </div>
      )}

      {/* Feed */}
      <main style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }} ref={feedRef}>
        <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 }}>

          {isAudioOnly ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: "#444" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔊</div>
              <p style={{ fontSize: 15, color: "#666", marginBottom: 6 }}>{ch(channelFilter).label}</p>
              <p style={{ fontSize: 13, marginBottom: 4 }}>Audio monitoring only — transcription not active.</p>
              <p style={{ fontSize: 12, color: "#333" }}>Use the player above to listen live.</p>
            </div>
          ) : filteredTx.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: "#333" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>📡</div>
              <p style={{ fontSize: 16, color: "#444" }}>No transmissions yet</p>
              <p style={{ fontSize: 13, marginTop: 6 }}>Waiting for radio traffic…</p>
            </div>
          ) : (
            filteredTx.map((tx, i) => {
              const s = ch(tx.channel);
              const isMesh = tx.channel.startsWith("mesh-");
              const isWx   = tx.channel === "mesh-weather";
              return (
                <div key={`${tx.timestamp}-${i}`} style={{
                  background: isMesh ? `${s.color}08` : "#111",
                  border: `1px solid ${isMesh ? s.color + "25" : "#1e1e1e"}`,
                  borderRadius: 12, padding: "14px 16px",
                  borderLeft: isMesh ? `3px solid ${s.color}60` : `3px solid ${s.color}30`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {/* Channel badge */}
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
                        color: s.color, background: `${s.color}15`,
                        display: "flex", alignItems: "center", gap: 4,
                      }}>
                        {isMesh && <span>{isWx ? "🌡" : "📡"}</span>}
                        {s.label}
                      </span>
                      {/* Speaker */}
                      {tx.speaker && tx.speaker !== "Unknown" && (
                        <span style={{
                          fontSize: 11, padding: "2px 8px", borderRadius: 6,
                          ...(isMesh
                            ? { color: s.color + "cc", background: `${s.color}10` }
                            : tx.speaker.toLowerCase() === "dispatch"
                              ? { color: "#64b5f6", background: "#64b5f610" }
                              : { color: "#f59e0b", background: "#f59e0b18" }),
                        }}>{tx.speaker}</span>
                      )}
                    </div>
                    <span style={{ fontSize: 11, fontFamily: "monospace", color: "#333" }}>
                      {formatTime(tx.timestamp)}
                    </span>
                  </div>
                  <p style={{
                    fontSize: 14, lineHeight: 1.55, margin: 0,
                    color: isMesh ? s.color + "dd" : "#d0d0d0",
                  }}>{tx.transcript}</p>
                </div>
              );
            })
          )}

          {hasMore && filteredTx.length > 0 && (
            <div style={{ textAlign: "center", padding: "12px 0 24px" }}>
              <button onClick={loadMore} disabled={loading} style={{
                padding: "8px 20px", fontSize: 12, borderRadius: 8,
                border: "1px solid #222", background: "transparent",
                color: "#555", cursor: loading ? "default" : "pointer", opacity: loading ? 0.4 : 1,
              }}>{loading ? "Loading…" : "Load more"}</button>
            </div>
          )}
        </div>
      </main>

      <footer style={{ borderTop: "1px solid #141414", padding: "12px 24px", textAlign: "center", fontSize: 11, color: "#2a2a2a" }}>
        WhistlerBrew FireBox · Sea to Sky Radio
      </footer>

      <style>{`
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>
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
