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

// ── Mode selector ─────────────────────────────────────────────────────────────

function ModeSelector({ onSelect }: { onSelect: (m: OpMode) => void }) {
  return (
    <div style={{
      position: "absolute", inset: 0, background: "#0a0a0a", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 32,
    }}>
      <div style={{ textAlign: "center" }}>
        <Image src="/firebox-logo.png" alt="FireBox" width={320} height={160} style={{ objectFit: "contain" }} />
        <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>Select Operating Mode</div>
      </div>
      <div style={{ display: "flex", gap: 20 }}>
        {([
          {
            mode: "whistler" as const, icon: "🏔️", title: "WHISTLER",
            lines: ["WFD + WB channels", "NRS Silver (local)"],
            color: "#38bdf8",
          },
          {
            mode: "deployment" as const, icon: "🔥", title: "DEPLOYMENT",
            lines: ["OFC 1 + OFC 2", "All NRS metals", "14 colour channels", "Fire A/B channels"],
            color: "#f0a500",
          },
        ]).map(({ mode, icon, title, lines, color }) => (
          <button key={mode} onClick={() => onSelect(mode)}
            style={{
              width: 210, padding: "22px 18px", borderRadius: 16, background: "#141414",
              border: `1px solid ${color}40`, cursor: "pointer", textAlign: "left",
            }}>
            <div style={{ fontSize: 30, marginBottom: 12 }}>{icon}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 10 }}>{title}</div>
            {lines.map(l => (
              <div key={l} style={{ fontSize: 11, color: "#666", marginTop: 4 }}>· {l}</div>
            ))}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Top bar ───────────────────────────────────────────────────────────────────

function TopBar({ view, setView, opMode, onModeSwitch, meshUnread, onInfo }: {
  view: View; setView: (v: View) => void; opMode: OpMode;
  onModeSwitch: () => void; meshUnread: boolean; onInfo: () => void;
}) {
  return (
    <div style={{
      height: 52, background: "#0a0a0a", borderBottom: "1px solid #222",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 12px", flexShrink: 0,
    }}>
      <button onClick={onModeSwitch}
        style={{
          display: "flex", alignItems: "center", gap: 6, padding: "5px 12px",
          borderRadius: 8, background: "#141414", border: "1px solid #2a2a2a",
          color: "#ccc", fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}>
        {opMode === "whistler" ? "🏔️ WHISTLER" : "🔥 DEPLOYMENT"}
        <span style={{ color: "#444", fontSize: 10 }}>▾</span>
      </button>

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

function WhistlerGrid({ activeChannels, onToggle }: {
  activeChannels: string[]; onToggle: (ch: string) => void;
}) {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {Object.entries(WHISTLER_CHANNELS).map(([ch, meta]) => {
          const active = activeChannels.includes(ch);
          const agency = ch.startsWith("wfd") ? "WFD" : ch.startsWith("wb") ? "WB" : "NRS";
          return (
            <button key={ch} onClick={() => meta.canTranscribe && onToggle(ch)}
              style={{
                borderRadius: 12, padding: 12, textAlign: "left",
                background: active ? `${meta.color}18` : "#141414",
                border: `1px solid ${active ? meta.color + "60" : "#222"}`,
                opacity: meta.canTranscribe || meta.d2 ? 1 : 0.65,
                cursor: meta.canTranscribe ? "pointer" : "default",
                minHeight: 80,
              }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: meta.color }}>{agency}</span>
                <span style={{ fontSize: 10 }}>
                  {meta.d2
                    ? <span style={{ color: "#555", fontSize: 9, fontWeight: 600 }}>D2</span>
                    : active
                    ? <span style={{ color: "#4ade80" }}>● ON</span>
                    : meta.canTranscribe
                    ? <span style={{ color: "#444" }}>OFF</span>
                    : <span>🔊</span>}
                </span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#ccc", lineHeight: 1.3 }}>{meta.label}</div>
              <div style={{ fontSize: 10, color: "#444", marginTop: 4 }}>{meta.freq} MHz</div>
            </button>
          );
        })}
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

function DeploymentGrid({ activeChannels, onToggle, colourTones, onSetTone }: {
  activeChannels: string[]; onToggle: (ch: string) => void;
  colourTones: Record<string, string>; onSetTone: (ch: string, tone: string | null) => void;
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

function TranscriptItem({ tx }: { tx: Transcript }) {
  const meta = ALL_CHANNEL_REGISTRY[tx.channel] ?? { color: "#888" };
  const isMesh = tx.channel.startsWith("mesh-");
  const isWeather = tx.channel === "mesh-weather";
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
        {!isMesh && tx.speaker && tx.speaker !== "Unknown" && (
          <span style={{
            fontSize: 11, padding: "1px 6px", borderRadius: 4,
            ...(tx.speaker.toLowerCase() === "dispatch"
              ? { color: "#64b5f6", background: "#64b5f610" }
              : { color: "#f59e0b", background: "#f59e0b18" }),
          }}>
            {tx.speaker}
          </span>
        )}
        {/* Node name for mesh */}
        {isMesh && tx.speaker && (
          <span style={{ fontSize: 10, color: "#555" }}>{tx.speaker}</span>
        )}
        <span style={{ fontSize: 11, fontFamily: "monospace", color: "#444", marginLeft: "auto" }}>
          {formatTime(tx.timestamp)}
        </span>
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.4, color: "#e0e0e0", margin: 0 }}>{tx.transcript}</p>
    </div>
  );
}

function ChannelSlot({ channelKey, primary, transcripts, playing, onPlay, onSwap, onAdd }: {
  channelKey: string | null; primary: boolean; transcripts: Transcript[];
  playing: boolean; onPlay: () => void; onSwap?: () => void; onAdd: () => void;
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
          : feed.map((tx, i) => <TranscriptItem key={i} tx={tx} />)}
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

function MonitorView({ transcripts, meshMessages, opMode }: {
  transcripts: Transcript[]; meshMessages: MeshMessage[]; opMode: OpMode;
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
            onAdd={() => setPicker("primary")} />
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
            onAdd={() => setPicker("secondary")} />
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

      {meshMessages.length > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "0 12px",
          height: 44, borderTop: "1px solid #1a1a1a", background: "#0a0a0a",
          flexShrink: 0, overflow: "hidden",
        }}>
          <span style={{ fontSize: 12, color: "#4ade80", flexShrink: 0 }}>📡</span>
          <span style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#aaa" }}>
            <span style={{ color: "#4ade80", marginRight: 6 }}>{meshMessages[0].sender ?? "Mesh"}</span>
            {meshMessages[0].message}
          </span>
          <span style={{ fontSize: 11, color: "#444", flexShrink: 0 }}>{formatTime(meshMessages[0].sent_at)}</span>
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
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [meshMessages, setMeshMessages] = useState<MeshMessage[]>([]);
  const [meshUnread, setMeshUnread] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const lastMeshId = useRef(0);

  // Restore mode + colour tones from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("firebox_mode") as OpMode | null;
    if (stored === "whistler" || stored === "deployment") setOpMode(stored);
    try {
      const tones = JSON.parse(localStorage.getItem("firebox_colour_tones") ?? "{}");
      if (typeof tones === "object") setColourTones(tones);
    } catch {}
  }, []);

  const selectMode = (m: OpMode) => {
    localStorage.setItem("firebox_mode", m);
    setOpMode(m);
    setView("channels");
    setShowInfo(false);
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

  const fetchTranscripts = useCallback(async () => {
    try {
      const r = await fetch("/api/firebox?limit=80");
      if (!r.ok) return;
      const d = await r.json();
      setTranscripts(d.transcripts ?? []);
    } catch {}
  }, []);

  const fetchMesh = useCallback(async () => {
    try {
      const r = await fetch(
        "https://bdgmpkbbohbucwoiucyw.supabase.co/rest/v1/firebox_mesh?order=sent_at.desc&limit=20",
        { headers: { "apikey": SUPABASE_ANON, "Authorization": `Bearer ${SUPABASE_ANON}` } }
      );
      if (!r.ok) return;
      const msgs: MeshMessage[] = await r.json();
      if (msgs.length > 0 && msgs[0].id > lastMeshId.current) {
        if (lastMeshId.current > 0) setMeshUnread(true);
        lastMeshId.current = msgs[0].id;
      }
      setMeshMessages(msgs);
    } catch {}
  }, []);

  useEffect(() => {
    fetchTranscripts();
    fetchMesh();
    const t1 = setInterval(fetchTranscripts, 15000);
    const t2 = setInterval(fetchMesh, 10000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [fetchTranscripts, fetchMesh]);

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
      />

      {showInfo ? (
        <InfoPanel onClose={() => setShowInfo(false)} opMode={opMode} />
      ) : view === "monitor" ? (
        <MonitorView transcripts={transcripts} meshMessages={meshMessages} opMode={opMode} />
      ) : opMode === "whistler" ? (
        <WhistlerGrid activeChannels={activeChannels} onToggle={toggleChannel} />
      ) : (
        <DeploymentGrid
          activeChannels={activeChannels} onToggle={toggleChannel}
          colourTones={colourTones} onSetTone={handleSetTone}
        />
      )}
    </div>
  );
}
