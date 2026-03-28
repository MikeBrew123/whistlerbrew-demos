"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";

// ── Types ─────────────────────────────────────────────────────────────────────

type View = "channels" | "monitor";
type OpMode = "whistler" | "deployment";

type Transcript = {
  channel: string;
  timestamp: string;
  transcript: string;
  speaker?: string;
};

type MeshMessage = {
  id: number;
  direction: "in" | "out";
  sender?: string;
  message: string;
  sent_at: string;
};

type ChannelMeta = {
  label: string;
  color: string;
  canTranscribe: boolean;
  freq: string;
  pl: string;
  d2?: boolean;
  category?: "ofc" | "metal" | "colour" | "fire";
};

// ── NRS Tones (T1–T9, duplex/repeater channels only) ──────────────────────────

const NRS_TONES = [
  { key: "T1", hz: "114.8" },
  { key: "T2", hz: "123.0" },
  { key: "T3", hz: "131.8" },
  { key: "T4", hz: "141.3" },
  { key: "T5", hz: "151.4" },
  { key: "T6", hz: "162.2" },
  { key: "T7", hz: "173.8" },
  { key: "T8", hz: "186.2" },
  { key: "T9", hz: "192.8" },
];

// ── Whistler mode channels ────────────────────────────────────────────────────

const WHISTLER_CHANNELS: Record<string, ChannelMeta> = {
  "wfd-ch2-scene":       { label: "WFD On Scene",      color: "#f0a500", canTranscribe: true,  freq: "151.355", pl: "CSQ"   },
  "wfd-ch6-ce":          { label: "WFD Comb. Events",  color: "#fb923c", canTranscribe: true,  freq: "153.710", pl: "CSQ"   },
  "wb-patrol-whistler":  { label: "Whistler Patrol",   color: "#38bdf8", canTranscribe: false, freq: "151.625", pl: "103.5" },
  "wb-patrol-blackcomb": { label: "Blackcomb Patrol",  color: "#22d3ee", canTranscribe: false, freq: "151.985", pl: "110.9" },
  "wb-lift-ops":         { label: "Lift Ops",          color: "#67e8f9", canTranscribe: false, freq: "152.060", pl: "107.2" },
  "wb-ops":              { label: "WB Operations",     color: "#a5f3fc", canTranscribe: false, freq: "153.305", pl: "107.2" },
  "wb-heliski":          { label: "WB Heliskiing",     color: "#7dd3fc", canTranscribe: false, freq: "153.530", pl: "CSQ"   },
  "nrs-silver-local":    { label: "NRS Silver",        color: "#86efac", canTranscribe: false, freq: "163.890", pl: "CSQ",  d2: true },
};

// ── Deployment mode channels ──────────────────────────────────────────────────
// Colour channels: RX (receive/output) frequency listed. TX freq is different — see inter-agency agreement.
// Tones T1–T9 are zone-specific (set per deployment in the UI). No tone needed for simplex/metals.

const DEPLOYMENT_CHANNELS: Record<string, ChannelMeta> = {
  // OFC — Fire dept coordination
  "bcws-ofc1":  { label: "OFC 1",      color: "#fb923c", canTranscribe: true, freq: "155.460", pl: "CSQ", category: "ofc"    },
  "bcws-ofc2":  { label: "OFC 2",      color: "#f97316", canTranscribe: true, freq: "150.350", pl: "CSQ", category: "ofc"    },
  // NRS Metals — simplex (TX=RX, no tone)
  "nrs-gold":   { label: "NRS Gold",   color: "#ffd700", canTranscribe: true, freq: "163.830", pl: "CSQ", category: "metal", d2: true },
  "nrs-silver": { label: "NRS Silver", color: "#c0c0c0", canTranscribe: true, freq: "163.890", pl: "CSQ", category: "metal", d2: true },
  "nrs-bronze": { label: "NRS Bronze", color: "#cd7f32", canTranscribe: true, freq: "163.980", pl: "CSQ", category: "metal", d2: true },
  "nrs-copper": { label: "NRS Copper", color: "#b87333", canTranscribe: true, freq: "164.910", pl: "CSQ", category: "metal", d2: true },
  "nrs-nickel": { label: "NRS Nickel", color: "#9ca3af", canTranscribe: true, freq: "159.270", pl: "CSQ", category: "metal", d2: true },
  "nrs-iron":   { label: "NRS Iron",   color: "#6b7280", canTranscribe: true, freq: "168.885", pl: "CSQ", category: "metal", d2: true },
  "nrs-zinc":   { label: "NRS Zinc",   color: "#94a3b8", canTranscribe: true, freq: "155.850", pl: "CSQ", category: "metal"  },
  // NRS Colours — repeater (RX freq listed, tone = zone-specific)
  "nrs-colour-red":    { label: "Red",    color: "#ef4444", canTranscribe: true, freq: "163.935", pl: "zone", category: "colour", d2: true },
  "nrs-colour-purple": { label: "Purple", color: "#a855f7", canTranscribe: true, freq: "163.965", pl: "zone", category: "colour", d2: true },
  "nrs-colour-green":  { label: "Green",  color: "#22c55e", canTranscribe: true, freq: "163.995", pl: "zone", category: "colour", d2: true },
  "nrs-colour-pink":   { label: "Pink",   color: "#f472b6", canTranscribe: true, freq: "164.055", pl: "zone", category: "colour", d2: true },
  "nrs-colour-blue":   { label: "Blue",   color: "#3b82f6", canTranscribe: true, freq: "164.085", pl: "zone", category: "colour", d2: true },
  "nrs-colour-orange": { label: "Orange", color: "#f97316", canTranscribe: true, freq: "164.145", pl: "zone", category: "colour", d2: true },
  "nrs-colour-brown":  { label: "Brown",  color: "#92400e", canTranscribe: true, freq: "164.175", pl: "zone", category: "colour", d2: true },
  "nrs-colour-yellow": { label: "Yellow", color: "#eab308", canTranscribe: true, freq: "164.205", pl: "zone", category: "colour", d2: true },
  "nrs-colour-grey":   { label: "Grey",   color: "#9ca3af", canTranscribe: true, freq: "164.235", pl: "zone", category: "colour", d2: true },
  "nrs-colour-black":  { label: "Black",  color: "#64748b", canTranscribe: true, freq: "164.265", pl: "zone", category: "colour", d2: true },
  "nrs-colour-white":  { label: "White",  color: "#e2e8f0", canTranscribe: true, freq: "162.585", pl: "zone", category: "colour", d2: true },
  "nrs-colour-maroon": { label: "Maroon", color: "#9f1239", canTranscribe: true, freq: "164.115", pl: "zone", category: "colour", d2: true },
  "nrs-colour-lime":   { label: "Lime",   color: "#84cc16", canTranscribe: true, freq: "166.335", pl: "zone", category: "colour", d2: true },
  "nrs-colour-navy":   { label: "Navy",   color: "#3b82f6", canTranscribe: true, freq: "159.465", pl: "zone", category: "colour", d2: true },
  // Fire channels — A series (repeater), B series (simplex)
  "nrs-fire-a1": { label: "Fire A1", color: "#f0a500", canTranscribe: true, freq: "167.670", pl: "CSQ", category: "fire", d2: true },
  "nrs-fire-a2": { label: "Fire A2", color: "#f0a500", canTranscribe: true, freq: "166.710", pl: "CSQ", category: "fire", d2: true },
  "nrs-fire-a3": { label: "Fire A3", color: "#f0a500", canTranscribe: true, freq: "167.070", pl: "CSQ", category: "fire", d2: true },
  "nrs-fire-b1": { label: "Fire B1", color: "#fb923c", canTranscribe: true, freq: "169.950", pl: "CSQ", category: "fire", d2: true },
  "nrs-fire-b2": { label: "Fire B2", color: "#fb923c", canTranscribe: true, freq: "171.030", pl: "CSQ", category: "fire", d2: true },
  "nrs-fire-b3": { label: "Fire B3", color: "#fb923c", canTranscribe: true, freq: "172.050", pl: "CSQ", category: "fire", d2: true },
};

// Meshtastic channels
const MESH_CHANNELS: Record<string, ChannelMeta> = {
  "mesh-text":    { label: "Mesh · Text",    color: "#4ade80", canTranscribe: false, freq: "", pl: "" },
  "mesh-weather": { label: "Mesh · Weather", color: "#38bdf8", canTranscribe: false, freq: "", pl: "" },
};

// Combined registry for transcript display lookup
const ALL_CHANNEL_REGISTRY: Record<string, ChannelMeta> = { ...WHISTLER_CHANNELS, ...DEPLOYMENT_CHANNELS, ...MESH_CHANNELS };

const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZ21wa2Jib2hidWN3b2l1Y3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1Nzk3ODEsImV4cCI6MjA5MDE1NTc4MX0.WAuh1vJsqxkdQKoBQ6i_qfHiJyKM-TSJ9BLtn8EyUws";
const TAILSCALE_BASE = "https://firebox.tail4bb545.ts.net";

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
  } catch { return iso; }
}

function parseWeather(transcript: string): { temp?: number; humidity?: number; pressure?: number } {
  const out: { temp?: number; humidity?: number; pressure?: number } = {};
  for (const part of transcript.split("|").map(p => p.trim())) {
    const t = part.match(/^Temp:\s*([\d.]+)C$/);       if (t) out.temp     = parseFloat(t[1]);
    const h = part.match(/^Humidity:\s*([\d.]+)%$/);    if (h) out.humidity = parseFloat(h[1]);
    const p = part.match(/^Pressure:\s*([\d.]+)\s*hPa$/); if (p) out.pressure = parseFloat(p[1]);
  }
  return out;
}

// ── Kiosk weather bar ─────────────────────────────────────────────────────────

function KioskWeatherBar({ weatherTranscripts }: { weatherTranscripts: Transcript[] }) {
  // Latest reading per node
  const byNode: Record<string, Transcript> = {};
  for (const t of weatherTranscripts) {
    const node = t.speaker ?? "Node";
    if (!byNode[node]) byNode[node] = t;
  }
  const nodes = Object.entries(byNode);
  if (nodes.length === 0) return null;

  return (
    <div style={{
      height: 36, background: "#060d06", borderBottom: "1px solid #172617",
      display: "flex", alignItems: "center", flexShrink: 0, overflow: "hidden",
    }}>
      <style>{`@keyframes kWxPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }`}</style>
      <div style={{
        flexShrink: 0, height: "100%", padding: "0 10px",
        display: "flex", alignItems: "center", borderRight: "1px solid #172617",
      }}>
        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, color: "#38bdf8" }}>WX</span>
      </div>
      {nodes.map(([node, tx]) => {
        const w = parseWeather(tx.transcript);
        const crossover = w.temp != null && w.humidity != null && w.temp >= w.humidity;
        const extreme   = w.temp != null && w.humidity != null && w.temp >= 30 && w.humidity <= 15;
        const accent    = extreme ? "#ef4444" : crossover ? "#f97316" : "#38bdf8";
        return (
          <div key={node} style={{
            display: "flex", alignItems: "center", gap: 7, padding: "0 12px",
            height: "100%", borderRight: "1px solid #172617",
            borderLeft: crossover ? `2px solid ${accent}` : "2px solid transparent",
            animation: extreme ? "kWxPulse 1.2s ease-in-out infinite" : undefined,
          }}>
            <span style={{ fontSize: 9, color: "#2d6a2d", letterSpacing: 0.5 }}>{node}</span>
            {w.temp     != null && <span style={{ fontSize: 12, fontWeight: 700, color: accent,    fontFamily: "monospace" }}>{w.temp.toFixed(1)}°C</span>}
            {w.humidity != null && <span style={{ fontSize: 12, fontWeight: 600, color: crossover ? accent : "#64b5f6", fontFamily: "monospace" }}>{w.humidity.toFixed(0)}%</span>}
            {w.pressure != null && <span style={{ fontSize: 9, color: "#2d4a2d", fontFamily: "monospace" }}>{w.pressure.toFixed(0)}hPa</span>}
            {crossover && (
              <span style={{
                fontSize: 8, fontWeight: 800, letterSpacing: 0.5, padding: "1px 4px",
                borderRadius: 3, color: accent, background: `${accent}18`,
              }}>{extreme ? "EXTREME" : "XOVER"}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Audio manager ─────────────────────────────────────────────────────────────

class AudioManager {
  private audio: HTMLAudioElement | null = null;
  private currentChannel: string | null = null;
  play(channel: string) {
    if (this.currentChannel === channel) return;
    if (this.audio) { this.audio.pause(); this.audio.src = ""; }
    this.audio = new Audio(`${TAILSCALE_BASE}/${channel}.mp3`);
    this.audio.play().catch(() => {});
    this.currentChannel = channel;
  }
  stop() {
    if (this.audio) { this.audio.pause(); this.audio.src = ""; }
    this.currentChannel = null;
    this.audio = null;
  }
  getChannel() { return this.currentChannel; }
}

const audioMgr = new AudioManager();

// ── Mesh ticker ───────────────────────────────────────────────────────────────

function MeshTicker({ messages, onReply }: { messages: Transcript[]; onReply: () => void }) {
  const latest = messages[0];
  const hasMsg = !!latest;
  const icon   = latest?.channel === "mesh-weather" ? "🌡" : "📡";
  const label  = hasMsg ? `${icon} ${latest.speaker ?? "Mesh"}: ${latest.transcript}` : null;
  const secs   = label ? Math.max(12, label.length * 0.22) : 0;

  return (
    <div style={{
      height: 38, background: "#050e05", borderBottom: "1px solid #172617",
      display: "flex", alignItems: "center", flexShrink: 0, overflow: "hidden",
    }}>
      <style>{`
        @keyframes meshScroll {
          0%   { transform: translateX(680px); }
          100% { transform: translateX(-100%); }
        }
      `}</style>

      {/* Label pill */}
      <div style={{
        flexShrink: 0, height: "100%", padding: "0 12px",
        display: "flex", alignItems: "center", gap: 6,
        borderRight: "1px solid #172617", background: "#050e05",
      }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: "#2d6a2d" }}>MESH</span>
        {messages.length > 0 && (
          <span style={{
            fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 10,
            background: "#1a3a1a", color: "#4ade80",
          }}>{messages.length}</span>
        )}
      </div>

      {/* Scrolling text */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative", height: "100%" }}>
        {hasMsg ? (
          <div key={label} style={{
            animation: `meshScroll ${secs}s linear 1 forwards`,
            whiteSpace: "nowrap", fontSize: 12, color: "#86efac",
            lineHeight: "38px", paddingLeft: 8,
          }}>
            {label}
          </div>
        ) : (
          <div style={{ fontSize: 11, color: "#1e3a1e", lineHeight: "38px", paddingLeft: 12 }}>
            No mesh traffic
          </div>
        )}
      </div>

      {/* Reply button */}
      <button onClick={onReply} style={{
        flexShrink: 0, height: "100%", padding: "0 18px",
        fontSize: 12, fontWeight: 700, letterSpacing: 0.5,
        background: hasMsg ? "#0d2a0d" : "#050e05",
        color: hasMsg ? "#4ade80" : "#1e3a1e",
        border: "none", borderLeft: "1px solid #172617",
        cursor: "pointer",
      }}>
        ⌨ Reply
      </button>
    </div>
  );
}

// ── Mesh compose overlay ───────────────────────────────────────────────────────

function MeshCompose({ onSend, onClose }: { onSend: (msg: string) => void; onClose: () => void }) {
  const [text, setText] = useState("");
  const submit = () => { if (text.trim()) { onSend(text.trim()); onClose(); } };
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 40, background: "#050e05",
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        height: 52, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 16px", borderBottom: "1px solid #172617", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: "#4ade80", letterSpacing: 1 }}>📡 MESH REPLY</span>
          <span style={{ fontSize: 11, color: "#2d6a2d" }}>→ Broadcast · all nodes</span>
        </div>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: 8, fontSize: 18, lineHeight: 1,
          background: "#0a1a0a", border: "1px solid #172617", color: "#4ade80", cursor: "pointer",
        }}>×</button>
      </div>

      {/* Input */}
      <div style={{ flex: 1, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea
          autoFocus value={text} onChange={e => setText(e.target.value)}
          placeholder="Type your message…"
          style={{
            flex: 1, width: "100%", padding: 14, borderRadius: 10, resize: "none",
            background: "#0a1a0a", border: `1px solid ${text.trim() ? "#2d6a2d" : "#172617"}`,
            color: "#e0e0e0", fontSize: 15, fontFamily: "system-ui, sans-serif",
            boxSizing: "border-box", outline: "none",
          }}
        />
      </div>

      {/* Action buttons — large touch targets */}
      <div style={{
        display: "flex", gap: 0, flexShrink: 0,
        borderTop: "1px solid #172617", height: 64,
      }}>
        <button onClick={onClose} style={{
          flex: 1, fontSize: 14, fontWeight: 600, background: "#050e05",
          border: "none", borderRight: "1px solid #172617", color: "#3a5a3a", cursor: "pointer",
        }}>Cancel</button>
        <button onClick={submit} disabled={!text.trim()} style={{
          flex: 2, fontSize: 15, fontWeight: 800, letterSpacing: 0.5,
          background: text.trim() ? "#0d2a0d" : "#060e06",
          border: "none", color: text.trim() ? "#4ade80" : "#1a3a1a",
          cursor: text.trim() ? "pointer" : "default",
        }}>SEND →</button>
      </div>
    </div>
  );
}

// ── Mode selector ─────────────────────────────────────────────────────────────

function ModeSelector({ onSelect }: { onSelect: (m: OpMode) => void }) {
  return (
    <div style={{
      position: "absolute", inset: 0, background: "#0a0a0a", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24,
    }}>
      {/* Logo — screen blend mode removes white bg */}
      <div style={{ textAlign: "center" }}>
        <Image
          src="/firebox-logo.png" alt="FireBox" width={280} height={140}
          style={{ objectFit: "contain", mixBlendMode: "screen" }}
        />
        <div style={{ fontSize: 11, color: "#444", letterSpacing: 2, textTransform: "uppercase", marginTop: 2 }}>
          Select Operating Mode
        </div>
      </div>

      {/* Mode cards — full width, touch-friendly */}
      <div style={{ display: "flex", gap: 16, padding: "0 32px", width: "100%", boxSizing: "border-box" }}>
        {([
          {
            mode: "whistler" as const,
            icon: "🏔️", title: "WHISTLER",
            sub: "Local operations",
            lines: ["WFD On Scene + Comb. Events", "WB Patrol + Lift + Heli", "NRS Silver (local)"],
            color: "#38bdf8",
          },
          {
            mode: "deployment" as const,
            icon: "🔥", title: "DEPLOYMENT",
            sub: "BCWS inter-agency",
            lines: ["OFC 1 + OFC 2", "All NRS metals (simplex)", "14 colour channels + Fire A/B"],
            color: "#f0a500",
          },
        ]).map(({ mode, icon, title, sub, lines, color }) => (
          <button key={mode} onClick={() => onSelect(mode)}
            style={{
              flex: 1, padding: "20px 20px 22px", borderRadius: 14, background: "#111",
              border: `1px solid ${color}30`, cursor: "pointer", textAlign: "left",
              transition: "border-color 0.15s",
            }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 26 }}>{icon}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color, letterSpacing: 1 }}>{title}</div>
                <div style={{ fontSize: 10, color: "#555", marginTop: 1 }}>{sub}</div>
              </div>
            </div>
            {lines.map(l => (
              <div key={l} style={{
                fontSize: 11, color: "#555", marginTop: 6,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: color + "60", flexShrink: 0 }} />
                {l}
              </div>
            ))}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Top bar ───────────────────────────────────────────────────────────────────

function TopBar({ view, setView, opMode, onModeSwitch, meshUnread, onInfo, activeIncident }: {
  view: View; setView: (v: View) => void; opMode: OpMode;
  onModeSwitch: () => void; meshUnread: boolean; onInfo: () => void;
  activeIncident?: { name: string; start_at: string } | null;
}) {
  return (
    <div style={{
      height: 52, background: "#0a0a0a", borderBottom: "1px solid #222",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 12px", flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={onModeSwitch}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "5px 12px",
            borderRadius: 8, background: "#141414", border: "1px solid #2a2a2a",
            color: "#ccc", fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}>
          {opMode === "whistler" ? "🏔️ WHISTLER" : "🔥 DEPLOYMENT"}
          <span style={{ color: "#444", fontSize: 10 }}>▾</span>
        </button>
        {activeIncident && (
          <div style={{
            padding: "3px 10px", borderRadius: 6, background: "#1a0e00",
            border: "1px solid #f0a50030", maxWidth: 200, overflow: "hidden",
          }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: "#f0a500", letterSpacing: 1, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
              ⚡ {activeIncident.name.toUpperCase()}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid #2a2a2a" }}>
          {(["channels", "monitor"] as View[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{
                padding: "5px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none",
                background: view === v ? "#f0a500" : "#1a1a1a",
                color: view === v ? "#000" : "#666",
              }}>
              {v === "channels" ? "Channels" : "Monitor"}
            </button>
          ))}
        </div>
        <button onClick={onInfo}
          style={{
            width: 32, height: 32, borderRadius: "50%", background: "#1a1a1a",
            color: "#888", fontSize: 14, border: "none", cursor: "pointer",
            position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
          ℹ
          {meshUnread && (
            <span style={{ position: "absolute", top: 2, right: 2, width: 8, height: 8, borderRadius: "50%", background: "#4ade80" }} />
          )}
        </button>
      </div>
    </div>
  );
}

// ── Whistler channel grid ─────────────────────────────────────────────────────

function WhistlerGrid({ activeChannels, onToggle, extraChannels = [], onRemoveExtra, onOpenAdd }: {
  activeChannels: string[]; onToggle: (ch: string) => void;
  extraChannels?: string[]; onRemoveExtra?: (ch: string) => void; onOpenAdd?: () => void;
}) {
  const allKeys = [...Object.keys(WHISTLER_CHANNELS), ...extraChannels];
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {allKeys.map(ch => {
          const meta = ALL_CHANNEL_REGISTRY[ch];
          if (!meta) return null;
          const active = activeChannels.includes(ch);
          const isExtra = extraChannels.includes(ch);
          const agency = ch.startsWith("wfd") ? "WFD" : ch.startsWith("wb") ? "WB" : ch.startsWith("bcws") ? "BCWS" : "NRS";
          return (
            <button key={ch} onClick={() => meta.canTranscribe && onToggle(ch)}
              style={{
                borderRadius: 12, padding: 12, textAlign: "left", position: "relative",
                background: active ? `${meta.color}18` : "#141414",
                border: `1px solid ${active ? meta.color + "60" : isExtra ? "#2a2420" : "#222"}`,
                opacity: meta.canTranscribe || meta.d2 ? 1 : 0.65,
                cursor: meta.canTranscribe ? "pointer" : "default", minHeight: 80,
              }}>
              {isExtra && onRemoveExtra && (
                <span onClick={e => { e.stopPropagation(); onRemoveExtra(ch); }}
                  style={{
                    position: "absolute", top: 5, right: 5, width: 16, height: 16,
                    borderRadius: "50%", background: "#2a1a1a", border: "1px solid #444",
                    color: "#888", fontSize: 10, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
                  }}>×</span>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: meta.color }}>{agency}</span>
                <span style={{ fontSize: 10 }}>
                  {meta.d2
                    ? <span style={{ color: active ? "#f0a500" : "#555", fontSize: 9, fontWeight: 600 }}>{active ? "● D2" : "D2"}</span>
                    : active ? <span style={{ color: "#4ade80" }}>● ON</span>
                    : meta.canTranscribe ? <span style={{ color: "#444" }}>OFF</span>
                    : <span>🔊</span>}
                </span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#ccc", lineHeight: 1.3 }}>{meta.label}</div>
              <div style={{ fontSize: 10, color: "#444", marginTop: 4 }}>{meta.freq} MHz</div>
            </button>
          );
        })}
        <button onClick={onOpenAdd} style={{
          borderRadius: 12, minHeight: 80, background: "transparent",
          border: "1px dashed #252525", color: "#383838", fontSize: 22,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        }}>+</button>
      </div>
    </div>
  );
}

// ── Tone picker modal ─────────────────────────────────────────────────────────

function TonePicker({ channelLabel, currentTone, onSelect, onClear, onClose }: {
  channelLabel: string; currentTone: string | null;
  onSelect: (tone: string) => void; onClear: () => void; onClose: () => void;
}) {
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 30, display: "flex",
      alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.88)",
    }} onClick={onClose}>
      <div style={{ borderRadius: 14, border: "1px solid #333", padding: 18, width: 300, background: "#141414" }}
           onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{channelLabel}</span>
          <button onClick={onClose}
            style={{ color: "#666", fontSize: 18, lineHeight: 1, background: "none", border: "none", cursor: "pointer" }}>×</button>
        </div>
        <div style={{ fontSize: 10, color: "#555", marginBottom: 14 }}>Select zone tone — check your handheld radio or district map</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {NRS_TONES.map(({ key, hz }) => {
            const selected = currentTone === key;
            return (
              <button key={key} onClick={() => { onSelect(key); onClose(); }}
                style={{
                  borderRadius: 8, padding: "10px 0", border: `1px solid ${selected ? "#f0a500" : "#2a2a2a"}`,
                  background: selected ? "#f0a50018" : "#1a1a1a", cursor: "pointer", textAlign: "center",
                }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: selected ? "#f0a500" : "#ccc" }}>{key}</div>
                <div style={{ fontSize: 9, color: "#555", marginTop: 2 }}>{hz} Hz</div>
              </button>
            );
          })}
        </div>

        {currentTone && (
          <button onClick={() => { onClear(); onClose(); }}
            style={{
              width: "100%", marginTop: 10, padding: "8px 0", borderRadius: 8,
              background: "transparent", border: "1px solid #2a2a2a",
              fontSize: 11, color: "#555", cursor: "pointer",
            }}>
            Clear tone
          </button>
        )}
      </div>
    </div>
  );
}

// ── Deployment channel grid ───────────────────────────────────────────────────

const SECTION_ORDER = ["ofc", "metal", "colour", "fire"] as const;
const SECTION_LABELS: Record<string, string> = {
  ofc:    "OFC — Fire Dept Coordination",
  metal:  "NRS Metals — Simplex (no tone)",
  colour: "NRS Colours — Repeater (zone tone required)",
  fire:   "Fire Channels",
};

function DeploymentGrid({ activeChannels, onToggle, colourTones, onSetTone, extraChannels = [], onRemoveExtra, onOpenAdd }: {
  activeChannels: string[]; onToggle: (ch: string) => void;
  colourTones: Record<string, string>; onSetTone: (ch: string, tone: string | null) => void;
  extraChannels?: string[]; onRemoveExtra?: (ch: string) => void; onOpenAdd?: () => void;
}) {
  const [tonePicking, setTonePicking] = useState<string | null>(null);

  const bySection: Record<string, string[]> = { ofc: [], metal: [], colour: [], fire: [] };
  for (const ch of Object.keys(DEPLOYMENT_CHANNELS)) {
    const cat = DEPLOYMENT_CHANNELS[ch].category ?? "colour";
    bySection[cat].push(ch);
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 12, position: "relative" }}>
      {SECTION_ORDER.map(section => {
        const keys = bySection[section];
        if (!keys.length) return null;
        const isColour = section === "colour";

        return (
          <div key={section} style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: "#f0a500", marginBottom: 8,
              textTransform: "uppercase", letterSpacing: 1,
            }}>
              {SECTION_LABELS[section]}
            </div>

            {/* OFC + Metal + Fire: 3-col card grid */}
            {!isColour && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {keys.map(ch => {
                  const meta = DEPLOYMENT_CHANNELS[ch];
                  const active = activeChannels.includes(ch);
                  return (
                    <button key={ch} onClick={() => onToggle(ch)}
                      style={{
                        borderRadius: 10, padding: "10px 12px", textAlign: "left",
                        background: active ? `${meta.color}18` : "#141414",
                        border: `1px solid ${active ? meta.color + "60" : "#222"}`,
                        cursor: "pointer", minHeight: 62,
                      }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: meta.color }}>{meta.label}</span>
                        <span style={{ fontSize: 10 }}>
                          {meta.d2
                            ? <span style={{ color: active ? "#f0a500" : "#555", fontSize: 9, fontWeight: 600 }}>
                                {active ? "● D2" : "D2"}
                              </span>
                            : active
                            ? <span style={{ color: "#4ade80" }}>● ON</span>
                            : <span style={{ color: "#444" }}>OFF</span>}
                        </span>
                      </div>
                      <div style={{ fontSize: 10, color: "#555" }}>{meta.freq} MHz</div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Colours: compact 2-col list with tone selector */}
            {isColour && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {keys.map(ch => {
                  const meta = DEPLOYMENT_CHANNELS[ch];
                  const active = activeChannels.includes(ch);
                  const tone = colourTones[ch] ?? null;
                  const toneInfo = tone ? NRS_TONES.find(t => t.key === tone) : null;
                  return (
                    <div key={ch}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        borderRadius: 8, padding: "6px 10px",
                        background: active ? `${meta.color}10` : "#141414",
                        border: `1px solid ${active ? meta.color + "50" : "#222"}`,
                      }}>
                      {/* Colour swatch + name */}
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: meta.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#ccc", flex: 1, minWidth: 0 }}>{meta.label}</span>

                      {/* Tone picker button */}
                      <button onClick={() => setTonePicking(ch)}
                        style={{
                          padding: "2px 7px", borderRadius: 6, fontSize: 9, fontWeight: 700,
                          border: `1px solid ${tone ? "#f0a500" : "#2a2a2a"}`,
                          background: tone ? "#f0a50018" : "#1a1a1a",
                          color: tone ? "#f0a500" : "#555",
                          cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap",
                        }}>
                        {tone ? `${tone} · ${toneInfo?.hz}` : "set tone"}
                      </button>

                      {/* ON/OFF toggle */}
                      <button onClick={() => onToggle(ch)}
                        style={{
                          padding: "2px 7px", borderRadius: 6, fontSize: 9, fontWeight: 700,
                          border: `1px solid ${active ? "#4ade8060" : "#2a2a2a"}`,
                          background: active ? "#4ade8018" : "#1a1a1a",
                          color: active ? "#4ade80" : "#444",
                          cursor: "pointer", flexShrink: 0,
                        }}>
                        {active ? "ON" : "OFF"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Extra channels section */}
      {extraChannels.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#555", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
            Added Channels
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {extraChannels.map(ch => {
              const meta = ALL_CHANNEL_REGISTRY[ch];
              if (!meta) return null;
              const active = activeChannels.includes(ch);
              return (
                <button key={ch} onClick={() => onToggle(ch)}
                  style={{
                    borderRadius: 10, padding: "10px 12px", textAlign: "left", position: "relative",
                    background: active ? `${meta.color}18` : "#141414",
                    border: `1px solid ${active ? meta.color + "60" : "#2a2420"}`,
                    cursor: "pointer", minHeight: 62,
                  }}>
                  {onRemoveExtra && (
                    <span onClick={e => { e.stopPropagation(); onRemoveExtra(ch); }}
                      style={{
                        position: "absolute", top: 4, right: 4, width: 16, height: 16,
                        borderRadius: "50%", background: "#2a1a1a", border: "1px solid #444",
                        color: "#888", fontSize: 10, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>×</span>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: meta.color }}>{meta.label}</span>
                    {meta.d2 && <span style={{ color: active ? "#f0a500" : "#555", fontSize: 9, fontWeight: 600 }}>{active ? "● D2" : "D2"}</span>}
                  </div>
                  <div style={{ fontSize: 10, color: "#555" }}>{meta.freq} MHz</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Add channel button */}
      <button onClick={onOpenAdd} style={{
        width: "100%", padding: "10px 0", borderRadius: 10, marginBottom: 12,
        background: "transparent", border: "1px dashed #252525",
        color: "#383838", fontSize: 13, cursor: "pointer",
      }}>+ Add Channel</button>

      {/* Tone picker modal */}
      {tonePicking && (() => {
        const meta = DEPLOYMENT_CHANNELS[tonePicking];
        return (
          <TonePicker
            channelLabel={`${meta.label} — ${meta.freq} MHz rx`}
            currentTone={colourTones[tonePicking] ?? null}
            onSelect={tone => onSetTone(tonePicking, tone)}
            onClear={() => onSetTone(tonePicking, null)}
            onClose={() => setTonePicking(null)}
          />
        );
      })()}
    </div>
  );
}

// ── Monitor view ──────────────────────────────────────────────────────────────

function TranscriptItem({ tx, nodeAliases = {} }: { tx: Transcript; nodeAliases?: Record<string, string> }) {
  const meta = ALL_CHANNEL_REGISTRY[tx.channel] ?? { color: "#888" };
  const isMesh = tx.channel.startsWith("mesh-");
  const isWeather = tx.channel === "mesh-weather";
  const resolveName = (s?: string) => {
    if (!s) return s;
    const lower = s.toLowerCase();
    for (const [hex, alias] of Object.entries(nodeAliases)) {
      if (hex.endsWith(lower) || hex === lower) return alias;
    }
    return s;
  };
  const displaySpeaker = resolveName(tx.speaker);
  return (
    <div style={{ padding: "8px 12px", borderBottom: "1px solid #1a1a1a" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
        {/* Mesh badge */}
        {isMesh && (
          <span style={{
            fontSize: 10, padding: "1px 6px", borderRadius: 4, fontWeight: 700,
            color: isWeather ? "#38bdf8" : "#4ade80",
            background: isWeather ? "#38bdf810" : "#4ade8010",
          }}>
            {isWeather ? "📡 WX" : "📡 MESH"}
          </span>
        )}
        {/* Speaker badge (radio) */}
        {!isMesh && displaySpeaker && displaySpeaker !== "Unknown" && (
          <span style={{
            fontSize: 11, padding: "1px 6px", borderRadius: 4,
            ...(displaySpeaker.toLowerCase() === "dispatch"
              ? { color: "#64b5f6", background: "#64b5f610" }
              : { color: "#f59e0b", background: "#f59e0b18" }),
          }}>
            {displaySpeaker}
          </span>
        )}
        {/* Node name for mesh */}
        {isMesh && displaySpeaker && (
          <span style={{ fontSize: 10, color: "#555" }}>{displaySpeaker}</span>
        )}
        <span style={{ fontSize: 11, fontFamily: "monospace", color: "#444", marginLeft: "auto" }}>
          {formatTime(tx.timestamp)}
        </span>
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.4, color: "#e0e0e0", margin: 0 }}>{tx.transcript}</p>
    </div>
  );
}

function ChannelSlot({ channelKey, primary, transcripts, playing, onPlay, onSwap, onAdd, nodeAliases = {} }: {
  channelKey: string | null; primary: boolean; transcripts: Transcript[];
  playing: boolean; onPlay: () => void; onSwap?: () => void; onAdd: () => void;
  nodeAliases?: Record<string, string>;
}) {
  if (!channelKey) {
    return (
      <button onClick={onAdd}
        style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: 12, border: "1px dashed #2a2a2a", color: "#444", fontSize: 13,
          margin: 4, minHeight: primary ? 200 : 90, cursor: "pointer", background: "transparent",
        }}>
        + Add Channel
      </button>
    );
  }
  const meta = ALL_CHANNEL_REGISTRY[channelKey] ?? { label: channelKey, color: "#888" };
  const feed = transcripts.filter(t => t.channel === channelKey).slice(0, primary ? 20 : 4);

  return (
    <div style={{
      display: "flex", flexDirection: "column", borderRadius: 12, overflow: "hidden",
      border: `1px solid ${meta.color}40`, background: "#0f0f0f", margin: 4,
      flex: primary ? "0 0 auto" : 1,
      width: primary ? "calc(100% - 230px)" : "auto", minWidth: 0,
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 12px", borderBottom: "1px solid #1a1a1a",
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: meta.color }}>{meta.label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={onPlay}
            style={{
              padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 500,
              border: "none", cursor: "pointer",
              ...(playing
                ? { background: meta.color + "30", color: meta.color }
                : { background: "#1a1a1a", color: "#666" }),
            }}>
            {playing ? "● LIVE" : "▶"}
          </button>
          {!primary && onSwap && (
            <button onClick={onSwap}
              style={{
                padding: "3px 8px", borderRadius: 6, fontSize: 11,
                background: "#1a1a1a", color: "#555", border: "none", cursor: "pointer",
              }}>
              ↑
            </button>
          )}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", maxHeight: primary ? 280 : 120 }}>
        {feed.length === 0
          ? <p style={{ fontSize: 11, padding: 12, color: "#333" }}>No recent traffic</p>
          : feed.map((tx, i) => <TranscriptItem key={i} tx={tx} nodeAliases={nodeAliases} />)}
      </div>
    </div>
  );
}

function ChannelPicker({ channels, onPick, onClose }: {
  channels: Record<string, ChannelMeta>; onPick: (ch: string) => void; onClose: () => void;
}) {
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 20, display: "flex",
      alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.85)",
    }} onClick={onClose}>
      <div style={{ borderRadius: 12, border: "1px solid #333", padding: 16, width: 280, background: "#141414" }}
           onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>Select Channel</span>
          <button onClick={onClose}
            style={{ color: "#666", fontSize: 18, lineHeight: 1, background: "none", border: "none", cursor: "pointer" }}>×</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 300, overflowY: "auto" }}>
          {Object.entries(channels).map(([ch, meta]) => (
            <button key={ch} onClick={() => onPick(ch)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                borderRadius: 8, fontSize: 12, textAlign: "left", color: "#ccc",
                background: "#1a1a1a", border: "none", cursor: "pointer",
              }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: meta.color, flexShrink: 0 }} />
              {meta.label}
              <span style={{ marginLeft: "auto", fontSize: 10, color: "#444" }}>{meta.freq}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Add-channel picker (shows channels from the other mode) ───────────────────

function AddChannelPicker({ opMode, currentExtras, onPick, onClose }: {
  opMode: OpMode; currentExtras: string[];
  onPick: (ch: string) => void; onClose: () => void;
}) {
  const pool = opMode === "whistler" ? DEPLOYMENT_CHANNELS : WHISTLER_CHANNELS;
  const available = Object.entries(pool).filter(([ch]) => !currentExtras.includes(ch));
  const byCategory: Record<string, [string, ChannelMeta][]> = {};
  for (const [ch, meta] of available) {
    const cat = meta.category ?? (opMode === "deployment" ? "wb" : "other");
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push([ch, meta]);
  }
  const CAT_LABEL: Record<string, string> = {
    ofc: "OFC", metal: "NRS Metals", colour: "NRS Colours", fire: "Fire",
    wb: "Whistler Blackcomb", other: "Other",
  };
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 30, display: "flex",
      alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.88)",
    }} onClick={onClose}>
      <div style={{ borderRadius: 12, border: "1px solid #333", padding: 16, width: 320, maxHeight: 360, background: "#141414", display: "flex", flexDirection: "column" }}
           onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Add Channel</span>
          <button onClick={onClose} style={{ color: "#666", fontSize: 18, lineHeight: 1, background: "none", border: "none", cursor: "pointer" }}>×</button>
        </div>
        <div style={{ fontSize: 10, color: "#444", marginBottom: 12, flexShrink: 0 }}>
          Channels outside {opMode === "whistler" ? "Whistler" : "Deployment"} mode
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {Object.entries(byCategory).map(([cat, entries]) => (
            <div key={cat} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#555", letterSpacing: 1, marginBottom: 5 }}>
                {CAT_LABEL[cat] ?? cat.toUpperCase()}
              </div>
              {entries.map(([ch, meta]) => (
                <button key={ch} onClick={() => onPick(ch)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", width: "100%",
                    borderRadius: 7, fontSize: 12, textAlign: "left", color: "#ccc", marginBottom: 4,
                    background: "#1a1a1a", border: "none", cursor: "pointer",
                  }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: meta.color, flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{meta.label}</span>
                  <span style={{ fontSize: 10, color: "#444" }}>{meta.freq}</span>
                  {meta.d2 && <span style={{ fontSize: 9, color: "#555", fontWeight: 700 }}>D2</span>}
                </button>
              ))}
            </div>
          ))}
          {available.length === 0 && (
            <div style={{ fontSize: 12, color: "#444", padding: 8 }}>All channels already added.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function MonitorView({ transcripts, meshTranscripts, opMode, nodeAliases = {} }: {
  transcripts: Transcript[]; meshTranscripts: Transcript[]; opMode: OpMode;
  nodeAliases?: Record<string, string>;
}) {
  const defaultPrimary = opMode === "whistler" ? "wfd-ch2-scene" : "bcws-ofc1";
  const defaultSecondary = opMode === "whistler" ? "wfd-ch6-ce" : "bcws-ofc2";
  const [primary, setPrimary] = useState<string | null>(defaultPrimary);
  const [secondary, setSecondary] = useState<string | null>(defaultSecondary);
  const [playingChannel, setPlayingChannel] = useState<string | null>(null);
  const [picker, setPicker] = useState<"primary" | "secondary" | null>(null);
  const channels = opMode === "whistler" ? WHISTLER_CHANNELS : DEPLOYMENT_CHANNELS;

  const play = (ch: string) => {
    if (playingChannel === ch) { audioMgr.stop(); setPlayingChannel(null); }
    else { audioMgr.play(ch); setPlayingChannel(ch); }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
      <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>
        {primary ? (
          <ChannelSlot channelKey={primary} primary transcripts={transcripts}
            playing={playingChannel === primary} onPlay={() => play(primary)}
            onAdd={() => setPicker("primary")} nodeAliases={nodeAliases} />
        ) : (
          <button onClick={() => setPicker("primary")}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              color: "#444", fontSize: 13, border: "1px dashed #2a2a2a", borderRadius: 12,
              margin: 4, cursor: "pointer", background: "transparent",
            }}>
            + Primary Channel
          </button>
        )}
        <div style={{ width: 220, flexShrink: 0, display: "flex", flexDirection: "column" }}>
          <ChannelSlot channelKey={secondary} primary={false} transcripts={transcripts}
            playing={playingChannel === secondary}
            onPlay={() => secondary && play(secondary)}
            onSwap={() => { const tmp = primary; setPrimary(secondary); setSecondary(tmp); }}
            onAdd={() => setPicker("secondary")} nodeAliases={nodeAliases} />
          <button onClick={() => setPicker("secondary")}
            style={{
              margin: 4, display: "flex", alignItems: "center", justifyContent: "center",
              color: "#444", fontSize: 11, border: "1px dashed #2a2a2a", borderRadius: 12,
              padding: "10px 0", cursor: "pointer", background: "transparent",
            }}>
            + Add Channel
          </button>
        </div>
      </div>

      {meshTranscripts.length > 0 && (
        <div style={{
          borderTop: "1px solid #172617", background: "#050e05",
          flexShrink: 0, maxHeight: 96, overflowY: "auto",
        }}>
          {meshTranscripts.slice(0, 3).map((m, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "baseline", gap: 8,
              padding: "5px 12px", borderBottom: i < 2 ? "1px solid #0d1a0d" : "none",
            }}>
              <span style={{ fontSize: 10, color: m.channel === "mesh-weather" ? "#38bdf8" : "#4ade80", flexShrink: 0 }}>
                {m.channel === "mesh-weather" ? "🌡" : "📡"}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#2d6a2d", flexShrink: 0 }}>
                {(() => { const s = m.speaker; if (!s) return "Mesh"; const l = s.toLowerCase(); for (const [hex, alias] of Object.entries(nodeAliases)) { if (hex.endsWith(l) || hex === l) return alias; } return s; })()}
              </span>
              <span style={{ fontSize: 11, color: "#6b9e6b", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {m.transcript}
              </span>
              <span style={{ fontSize: 10, color: "#1e3a1e", flexShrink: 0, fontFamily: "monospace" }}>
                {formatTime(m.timestamp)}
              </span>
            </div>
          ))}
        </div>
      )}

      {picker && (
        <ChannelPicker channels={channels}
          onPick={ch => { picker === "primary" ? setPrimary(ch) : setSecondary(ch); setPicker(null); }}
          onClose={() => setPicker(null)} />
      )}
    </div>
  );
}

// ── Info panel ────────────────────────────────────────────────────────────────

function InfoPanel({ onClose, opMode }: { onClose: () => void; opMode: OpMode }) {
  const freqRows: [string, string, string, string][] = opMode === "whistler"
    ? [
        ["WFD On Scene",       "151.355", "CSQ",   "#f0a500"],
        ["WFD Comb. Events",   "153.710", "CSQ",   "#fb923c"],
        ["Whistler Patrol",    "151.625", "103.5", "#38bdf8"],
        ["Blackcomb Patrol",   "151.985", "110.9", "#22d3ee"],
        ["WB Lift Ops",        "152.060", "107.2", "#67e8f9"],
        ["WB Operations",      "153.305", "107.2", "#a5f3fc"],
        ["WB Heliskiing",      "153.530", "CSQ",   "#7dd3fc"],
        ["NRS Silver (local)", "163.890", "CSQ",   "#86efac"],
      ]
    : [
        ["OFC 1",      "155.460", "CSQ", "#fb923c"],
        ["OFC 2",      "150.350", "CSQ", "#f97316"],
        ["NRS Gold",   "163.830", "CSQ", "#ffd700"],
        ["NRS Silver", "163.890", "CSQ", "#c0c0c0"],
        ["NRS Bronze", "163.980", "CSQ", "#cd7f32"],
        ["NRS Copper", "164.910", "CSQ", "#b87333"],
        ["NRS Nickel", "159.270", "CSQ", "#9ca3af"],
        ["NRS Iron",   "168.885", "CSQ", "#6b7280"],
        ["NRS Zinc",   "155.850", "CSQ", "#94a3b8"],
      ];

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 16, background: "#0d0d0d" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={{ fontWeight: 700, color: "#fff" }}>FireBox Reference</span>
        <button onClick={onClose}
          style={{ color: "#666", fontSize: 22, lineHeight: 1, padding: "0 8px", background: "none", border: "none", cursor: "pointer" }}>
          ×
        </button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 10, fontWeight: 700, color: "#f0a500", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
          {opMode === "whistler" ? "Whistler Frequencies" : "Inter-Agency Frequencies"}
        </h2>
        <div style={{ borderRadius: 12, border: "1px solid #222", overflow: "hidden", fontSize: 11 }}>
          {freqRows.map(([label, freq, pl, color]) => (
            <div key={freq + label}
              style={{ display: "flex", alignItems: "center", padding: "7px 12px", borderBottom: "1px solid #1a1a1a" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, marginRight: 8, flexShrink: 0 }} />
              <span style={{ flex: 1, color: "#ccc" }}>{label}</span>
              <span style={{ fontFamily: "monospace", color: "#888", marginRight: 12 }}>{freq}</span>
              <span style={{ fontFamily: "monospace", color: "#555" }}>PL {pl}</span>
            </div>
          ))}
        </div>
      </div>

      {opMode === "deployment" && (
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 10, fontWeight: 700, color: "#f0a500", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            NRS Zone Tones (Colour Channels)
          </h2>
          <div style={{ borderRadius: 12, border: "1px solid #222", overflow: "hidden", fontSize: 11 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", }}>
              {NRS_TONES.map(({ key, hz }) => (
                <div key={key} style={{ padding: "6px 12px", borderBottom: "1px solid #1a1a1a", borderRight: "1px solid #1a1a1a" }}>
                  <span style={{ fontWeight: 700, color: "#f0a500" }}>{key}</span>
                  <span style={{ color: "#666", marginLeft: 6, fontFamily: "monospace" }}>{hz} Hz</span>
                </div>
              ))}
            </div>
            <div style={{ padding: "8px 12px", fontSize: 10, color: "#444" }}>
              Zone tone set per district. Check handheld radio or district map. Not used on simplex/metal channels.
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 10, fontWeight: 700, color: "#f0a500", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Pi Access</h2>
        <div style={{ borderRadius: 12, border: "1px solid #222", padding: 12, fontSize: 11, color: "#888", lineHeight: 2.2 }}>
          <div><span style={{ color: "#ccc" }}>SSH:</span> ssh brew@192.168.8.210</div>
          <div><span style={{ color: "#ccc" }}>Tailscale:</span> ssh brew@100.84.254.62</div>
          <div><span style={{ color: "#ccc" }}>Logs:</span> tail -f /home/brew/recordings/push.log</div>
          <div><span style={{ color: "#ccc" }}>Restart radio:</span> sudo systemctl restart rtl-airband</div>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 10, fontWeight: 700, color: "#f0a500", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Pipeline</h2>
        <div style={{ borderRadius: 12, border: "1px solid #222", padding: 12, fontSize: 11, color: "#888", lineHeight: 2.2 }}>
          <div>Transcribe: every 2 min (Whisper + GPT)</div>
          <div>Push to cloud: every 30s</div>
          <div>Lag: ~2 min normal</div>
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: 10, fontWeight: 700, color: "#f0a500", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>BCWS Reference</h2>
        <div style={{ borderRadius: 12, border: "1px solid #222", padding: 12, fontSize: 11, color: "#888", lineHeight: 2.2 }}>
          <div>SPS 145 = Michel Brew, Whistler</div>
          <div>T101 = Type 1 Tender · TT101 = Tactical Tender</div>
          <div>Sierra [Town] 8xx = SPC crew</div>
          <div>NRS metals = simplex · Colours = repeater pairs (zone-assigned)</div>
          {opMode === "deployment" && (
            <div style={{ color: "#555", marginTop: 6 }}>D2 badge = requires second RTL-SDR dongle</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main app ──────────────────────────────────────────────────────────────────

export default function FireBoxApp() {
  const [opMode, setOpMode] = useState<OpMode | null>(null);
  const [view, setView] = useState<View>("channels");
  const [activeChannels, setActiveChannels] = useState<string[]>(["wfd-ch2-scene", "wfd-ch6-ce"]);
  const [colourTones, setColourTones] = useState<Record<string, string>>({});
  const [extraChannels, setExtraChannels] = useState<string[]>([]);
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [meshUnread, setMeshUnread] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [nodeAliases, setNodeAliases] = useState<Record<string, string>>({});
  const lastMeshTs = useRef("");

  // Fetch node aliases, refresh every 5 min
  useEffect(() => {
    const load = () => fetch("/api/firebox-provision")
      .then(r => r.ok ? r.json() : {}).then(setNodeAliases).catch(() => {});
    load();
    const t = setInterval(load, 300000);
    return () => clearInterval(t);
  }, []);

  const resolveName = (speaker?: string) => {
    if (!speaker) return speaker;
    const lower = speaker.toLowerCase();
    for (const [hex, alias] of Object.entries(nodeAliases)) {
      if (hex.endsWith(lower) || hex === lower) return alias;
    }
    return speaker;
  };

  // Restore mode + colour tones from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("firebox_mode") as OpMode | null;
    if (stored === "whistler" || stored === "deployment") setOpMode(stored);
    try {
      const tones = JSON.parse(localStorage.getItem("firebox_colour_tones") ?? "{}");
      if (typeof tones === "object") setColourTones(tones);
    } catch {}
  }, []);

  // Load per-mode extra channels when mode changes
  useEffect(() => {
    if (!opMode) return;
    try {
      const stored = JSON.parse(localStorage.getItem(`firebox_extra_${opMode}`) ?? "[]");
      setExtraChannels(Array.isArray(stored) ? stored : []);
    } catch { setExtraChannels([]); }
  }, [opMode]);

  const addExtra = (ch: string) => {
    const updated = [...extraChannels, ch];
    setExtraChannels(updated);
    if (opMode) localStorage.setItem(`firebox_extra_${opMode}`, JSON.stringify(updated));
    setShowAddChannel(false);
  };

  const removeExtra = (ch: string) => {
    const updated = extraChannels.filter(c => c !== ch);
    setExtraChannels(updated);
    if (opMode) localStorage.setItem(`firebox_extra_${opMode}`, JSON.stringify(updated));
  };

  const MODE_DEFAULT_CHANNELS: Record<OpMode, string[]> = {
    whistler:   ["wfd-ch2-scene", "wfd-ch6-ce"],
    deployment: ["wfd-ch6-ce", "bcws-ofc1", "nrs-zinc"],
  };

  const selectMode = (m: OpMode) => {
    localStorage.setItem("firebox_mode", m);
    setOpMode(m);
    setView("channels");
    setShowInfo(false);
    const channels = MODE_DEFAULT_CHANNELS[m];
    setActiveChannels(channels);
    // Push to Supabase — Pi watcher picks up within 30s and switches rtl_airband config
    fetch("/api/firebox-config", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-firebox-key": "firebox-pi-secret" },
      body: JSON.stringify({ firebox_mode: m, active_channels: channels }),
    }).catch(() => {});
  };

  const handleSetTone = (ch: string, tone: string | null) => {
    const updated = { ...colourTones };
    if (tone === null) delete updated[ch];
    else updated[ch] = tone;
    setColourTones(updated);
    localStorage.setItem("firebox_colour_tones", JSON.stringify(updated));
  };

  // Load active channels from API
  useEffect(() => {
    fetch("/api/firebox-config")
      .then(r => r.json())
      .then(d => { if (d.active_channels) setActiveChannels(d.active_channels); })
      .catch(() => {});
  }, []);

  // Active incident (read-only on kiosk — manage from web)
  const [activeIncident, setActiveIncident] = useState<{ name: string; start_at: string } | null>(null);
  useEffect(() => {
    fetch("/api/firebox-incidents").then(r => r.ok ? r.json() : {})
      .then(d => {
        const active = (d.incidents ?? []).find((i: { status: string }) => i.status === "active");
        setActiveIncident(active ?? null);
      }).catch(() => {});
    const t = setInterval(() => {
      fetch("/api/firebox-incidents").then(r => r.ok ? r.json() : {})
        .then(d => { const a = (d.incidents ?? []).find((i: { status: string }) => i.status === "active"); setActiveIncident(a ?? null); }).catch(() => {});
    }, 60000);
    return () => clearInterval(t);
  }, []);

  const fetchTranscripts = useCallback(async () => {
    try {
      const r = await fetch("/api/firebox?limit=80");
      if (!r.ok) return;
      const d = await r.json();
      setTranscripts(d.transcripts ?? []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchTranscripts();
    const t1 = setInterval(fetchTranscripts, 15000);
    return () => clearInterval(t1);
  }, [fetchTranscripts]);

  // Derive mesh messages from transcripts + track unread
  const meshTranscripts = transcripts.filter(t => t.channel.startsWith("mesh-"));
  useEffect(() => {
    if (meshTranscripts.length > 0 && meshTranscripts[0].timestamp !== lastMeshTs.current) {
      if (lastMeshTs.current) setMeshUnread(true);
      lastMeshTs.current = meshTranscripts[0].timestamp;
    }
  }, [meshTranscripts]);

  const sendMesh = async (message: string) => {
    await fetch(`https://bdgmpkbbohbucwoiucyw.supabase.co/rest/v1/firebox_outbox`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON,
        "Authorization": `Bearer ${SUPABASE_ANON}`,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({ message }),
    });
  };

  const toggleChannel = async (ch: string) => {
    const updated = activeChannels.includes(ch)
      ? activeChannels.filter(c => c !== ch)
      : [...activeChannels, ch];
    setActiveChannels(updated);
    try {
      await fetch("/api/firebox-config", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-firebox-key": "firebox-pi-secret" },
        body: JSON.stringify({ active_channels: updated }),
      });
    } catch {}
  };

  const openInfo = () => { setShowInfo(true); setMeshUnread(false); };

  if (!opMode) {
    return (
      <div style={{
        width: 800, height: 480, background: "#0d0d0d", color: "#e0e0e0",
        fontFamily: "system-ui, sans-serif", overflow: "hidden",
        userSelect: "none", position: "relative", margin: "0 auto",
      }}>
        <ModeSelector onSelect={selectMode} />
      </div>
    );
  }

  return (
    <div style={{
      width: 800, height: 480, background: "#0d0d0d", color: "#e0e0e0",
      fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column",
      overflow: "hidden", userSelect: "none", position: "relative", margin: "0 auto",
    }}>
      <TopBar
        view={view} setView={setView}
        opMode={opMode} onModeSwitch={() => setOpMode(null)}
        meshUnread={meshUnread} onInfo={openInfo}
        activeIncident={activeIncident}
      />

      <MeshTicker messages={meshTranscripts} onReply={() => setShowCompose(true)} />

      <KioskWeatherBar weatherTranscripts={meshTranscripts.filter(t => t.channel === "mesh-weather")} />

      {showInfo ? (
        <InfoPanel onClose={() => setShowInfo(false)} opMode={opMode} />
      ) : view === "monitor" ? (
        <MonitorView transcripts={transcripts} meshTranscripts={meshTranscripts} opMode={opMode} nodeAliases={nodeAliases} />
      ) : opMode === "whistler" ? (
        <WhistlerGrid activeChannels={activeChannels} onToggle={toggleChannel}
          extraChannels={extraChannels} onRemoveExtra={removeExtra}
          onOpenAdd={() => setShowAddChannel(true)} />
      ) : (
        <DeploymentGrid
          activeChannels={activeChannels} onToggle={toggleChannel}
          colourTones={colourTones} onSetTone={handleSetTone}
          extraChannels={extraChannels} onRemoveExtra={removeExtra}
          onOpenAdd={() => setShowAddChannel(true)} />
      )}

      {showCompose && <MeshCompose onSend={sendMesh} onClose={() => setShowCompose(false)} />}
      {showAddChannel && opMode && (
        <AddChannelPicker opMode={opMode} currentExtras={extraChannels}
          onPick={addExtra} onClose={() => setShowAddChannel(false)} />
      )}
    </div>
  );
}
