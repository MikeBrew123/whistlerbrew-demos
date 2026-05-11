"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const FIREBOX_PASSWORD = "FireBox";
const SUPABASE_URL  = "https://bdgmpkbbohbucwoiucyw.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZ21wa2Jib2hidWN3b2l1Y3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1Nzk3ODEsImV4cCI6MjA5MDE1NTc4MX0.WAuh1vJsqxkdQKoBQ6i_qfHiJyKM-TSJ9BLtn8EyUws";
const SB_HDRS = { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` };

const ALERT_LEVELS = {
  critical: { color: "#ff4444", bg: "#3a0000", border: "#ff000060", label: "CRITICAL" },
  urgent:   { color: "#fb923c", bg: "#2a1000", border: "#fb923c60", label: "URGENT"   },
  info:     { color: "#f0a500", bg: "#1c1200", border: "#f0a50060", label: "INFO"     },
} as const;
type AlertLevel = keyof typeof ALERT_LEVELS;

type AlertRow = {
  id: string;
  keyword: string;
  level: AlertLevel;
  channel: string;
  transcript: string;
  recorded_at: string;
  filename: string | null;
  speaker: string | null;
  created_at: string;
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700&family=JetBrains+Mono:wght@400;500;700&family=Barlow+Condensed:wght@400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
  .fb-btn:hover { opacity: 0.85; }
  .alert-row:hover { background: #0c140c !important; }
`;

function useClock() {
  const [t, setT] = useState("");
  useEffect(() => {
    const tick = () => setT(new Date().toLocaleTimeString("en-CA", { hour12: false, hour: "2-digit", minute: "2-digit" }));
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, []);
  return t;
}

function formatTs(iso: string, secs = false) {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return secs ? `${hh}:${mm}:${ss}` : `${hh}:${mm}`;
}

function dateLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-CA", { weekday: "long", month: "short", day: "numeric" });
}

function dateKey(iso: string) {
  return iso.slice(0, 10); // YYYY-MM-DD
}

function highlightKeyword(text: string, keyword: string, color: string): string {
  // returned as plain string — rendered via dangerouslySetInnerHTML
  const re = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return text.replace(re, `<mark style="background:${color}33;color:${color};font-weight:700;padding:0 2px">$1</mark>`);
}

// ── Alert detail modal ────────────────────────────────────────────────────────
function AlertDetail({ alert, onClose }: { alert: AlertRow; onClose: () => void }) {
  const lv = ALERT_LEVELS[alert.level] ?? ALERT_LEVELS.info;
  const highlighted = highlightKeyword(alert.transcript, alert.keyword, lv.color);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: "100%", maxWidth: 560, background: "#080d08", border: `1px solid ${lv.border}`, display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ borderBottom: `1px solid ${lv.border}`, padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", background: lv.bg }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, color: lv.color, padding: "2px 8px", border: `1px solid ${lv.border}` }}>{lv.label}</span>
            <span style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 800, fontSize: 16, letterSpacing: 2, color: lv.color }}>{alert.keyword.toUpperCase()}</span>
          </div>
          <button onClick={onClose} className="fb-btn" style={{ background: "none", border: "none", color: `${lv.color}88`, fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {/* Meta row */}
        <div style={{ display: "flex", gap: 20, padding: "10px 18px", borderBottom: "1px solid #0e1a0e", background: "#060b06" }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#3a5a3a", letterSpacing: 1, marginBottom: 3 }}>CHANNEL</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#7aba7a", fontWeight: 700 }}>{alert.channel.toUpperCase()}</div>
          </div>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#3a5a3a", letterSpacing: 1, marginBottom: 3 }}>TIME</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#7aba7a" }}>{new Date(alert.recorded_at).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}</div>
          </div>
          {alert.speaker && alert.speaker !== "Unknown" && (
            <div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#3a5a3a", letterSpacing: 1, marginBottom: 3 }}>SPEAKER</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#f0a500" }}>{alert.speaker.toUpperCase()}</div>
            </div>
          )}
        </div>

        {/* Transcript */}
        <div style={{ padding: "18px 18px 22px" }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#3a5a3a", letterSpacing: 1, marginBottom: 10 }}>TRANSCRIPT</div>
          <p
            style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 18, fontWeight: 500, lineHeight: 1.5, color: "#b0d098" }}
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
function AlertsHistory() {
  const [alerts,    setAlerts]    = useState<AlertRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [levelFilter, setLevel]   = useState<AlertLevel | "all">("all");
  const [selected,  setSelected]  = useState<AlertRow | null>(null);
  const clock = useClock();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const lvQ  = levelFilter !== "all" ? `&level=eq.${levelFilter}` : "";
        const url  = `${SUPABASE_URL}/rest/v1/firebox_alerts?order=recorded_at.desc&limit=200${lvQ}`;
        const r    = await fetch(url, { headers: SB_HDRS });
        if (!r.ok) { setError("Could not load alerts — is the firebox_alerts table created?"); setLoading(false); return; }
        const rows = await r.json();
        setAlerts(rows);
      } catch { setError("Network error."); }
      setLoading(false);
    };
    load();
  }, [levelFilter]);

  // Group by date
  const grouped = new Map<string, AlertRow[]>();
  for (const a of alerts) {
    const k = dateKey(a.recorded_at);
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k)!.push(a);
  }

  return (
    <div style={{ height: "100vh", overflow: "hidden", background: "#060b06", color: "#b8d8a0", fontFamily: "'Rajdhani',sans-serif", display: "flex", flexDirection: "column",
      backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(57,211,83,0.012) 3px,rgba(57,211,83,0.012) 4px)" }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* Header */}
      <header style={{ flexShrink: 0, background: "#050a05", borderBottom: "1px solid #0e1a0e", padding: "0 16px" }}>
        <div style={{ height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/projects/firebox" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#4a7a4a", textDecoration: "none" }}>← Feed</Link>
            <div style={{ width: 1, height: 22, background: "#1a2a1a" }} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 4, color: "#c8e8b0", lineHeight: 1 }}>FIREBOX</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#3a6a3a", letterSpacing: 1, marginTop: 1 }}>Alert History</div>
            </div>
          </div>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: "#4a7a4a" }}>{clock}</span>
        </div>
      </header>

      {/* Filter bar */}
      <div style={{ flexShrink: 0, borderBottom: "1px solid #0e1a0e", padding: "8px 16px", display: "flex", alignItems: "center", gap: 8, background: "#050a05" }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#3a6a3a", letterSpacing: 1, marginRight: 4 }}>FILTER:</span>
        {(["all", "critical", "urgent", "info"] as const).map(l => {
          const lv = l !== "all" ? ALERT_LEVELS[l] : null;
          const active = levelFilter === l;
          return (
            <button key={l} onClick={() => setLevel(l)} className="fb-btn" style={{
              padding: "5px 12px", border: `1px solid ${active ? (lv?.border ?? "#39d35360") : "#1a2a1a"}`,
              background: active ? (lv?.bg ?? "#0a140a") : "transparent",
              color: active ? (lv?.color ?? "#39d353") : "#3a6a3a",
              fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700,
              cursor: "pointer", letterSpacing: 1,
            }}>{l.toUpperCase()}</button>
          );
        })}
        <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#2a5a2a" }}>
          {alerts.length} alert{alerts.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Content */}
      <main style={{ flex: 1, overflowY: "auto", padding: "0 0 24px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 24px" }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#2a5a2a", animation: "pulse 2s ease-in-out infinite", letterSpacing: 2 }}>● ● ●</div>
            <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 15, color: "#3a7a3a", marginTop: 14 }}>Loading alerts…</div>
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "80px 24px" }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#ff6b6b", marginBottom: 12 }}>⚠ {error}</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#3a3a3a", lineHeight: 1.7 }}>
              Run the migration SQL in the Supabase dashboard to create the firebox_alerts table.
            </div>
          </div>
        ) : alerts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 24px" }}>
            <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 20, color: "#3a7a3a", marginBottom: 8 }}>No alerts yet</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#2a5a2a" }}>Alerts are recorded automatically when a keyword triggers.</div>
          </div>
        ) : (
          Array.from(grouped.entries()).map(([dateStr, rows]) => (
            <div key={dateStr}>
              {/* Date group header */}
              <div style={{ padding: "12px 20px 6px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, background: "#060b06", borderBottom: "1px solid #0a160a", zIndex: 2 }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: "#5a8a5a", letterSpacing: 1 }}>{dateLabel(rows[0].recorded_at)}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#3a5a3a" }}>{dateStr}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#2a4a2a", marginLeft: "auto" }}>{rows.length} event{rows.length !== 1 ? "s" : ""}</span>
              </div>

              {rows.map(alert => {
                const lv = ALERT_LEVELS[alert.level] ?? ALERT_LEVELS.info;
                return (
                  <div
                    key={alert.id}
                    className="alert-row"
                    onClick={() => setSelected(alert)}
                    style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 20px", borderBottom: "1px solid #0a120a", cursor: "pointer", background: "#060b06", transition: "background 0.1s" }}
                  >
                    {/* Time */}
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#4a7a4a", flexShrink: 0, paddingTop: 2, minWidth: 58 }}>
                      {formatTs(alert.recorded_at, true)}
                    </span>

                    {/* Level badge */}
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 700, color: lv.color, padding: "2px 7px", background: lv.bg, border: `1px solid ${lv.border}`, flexShrink: 0, alignSelf: "flex-start", letterSpacing: 0.5 }}>
                      {lv.label}
                    </span>

                    {/* Keyword */}
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700, color: lv.color, flexShrink: 0, textTransform: "uppercase", minWidth: 100 }}>
                      {alert.keyword}
                    </span>

                    {/* Channel */}
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#4a8a4a", flexShrink: 0, minWidth: 90, paddingTop: 1 }}>
                      {alert.channel.toUpperCase()}
                    </span>

                    {/* Transcript snippet */}
                    <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, color: "#7a9a6a", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {alert.transcript}
                    </span>

                    {/* Speaker */}
                    {alert.speaker && alert.speaker !== "Unknown" && (
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#f59e0b", flexShrink: 0, padding: "1px 6px", background: "#130d00", border: "1px solid #f59e0b28" }}>
                        {alert.speaker.toUpperCase()}
                      </span>
                    )}

                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#2a4a2a", flexShrink: 0 }}>›</span>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </main>

      {/* Footer */}
      <footer style={{ flexShrink: 0, borderTop: "1px solid #0b160b", padding: "5px 16px", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#2a4a2a" }}>FIREBOX · Alert History</span>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#2a4a2a" }}>50°07′N 122°57′W</span>
      </footer>

      {selected && <AlertDetail alert={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

export default function FireBoxAlertsPage() {
  const [authed,  setAuthed]  = useState(false);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    if (sessionStorage.getItem("firebox_auth") === "true") setAuthed(true);
    setChecked(true);
  }, []);
  if (!checked) return null;
  if (!authed) return (
    <div style={{ minHeight: "100vh", background: "#060b06", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: "#3a6a3a" }}>
        Access the main feed at <a href="/projects/firebox" style={{ color: "#39d353" }}>/projects/firebox</a> first.
      </div>
    </div>
  );
  return <AlertsHistory />;
}
