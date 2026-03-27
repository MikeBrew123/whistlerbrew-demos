"use client";

import { useEffect, useState, useCallback, useRef } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Mode = "channels" | "monitor" | "info";
type Agency = "all" | "WFD" | "WB" | "BCWS";

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

// ── Channel registry ──────────────────────────────────────────────────────────

const CHANNELS: Record<string, { label: string; color: string; agency: Agency; canTranscribe: boolean }> = {
  "wfd-ch2-scene":       { label: "Ch.2 On Scene",        color: "#f0a500", agency: "WFD",  canTranscribe: true },
  "wfd-ch6-ce":          { label: "Ch.6 Combined Events", color: "#fb923c", agency: "WFD",  canTranscribe: true },
  "wb-patrol-whistler":  { label: "Whistler Patrol",      color: "#38bdf8", agency: "WB",   canTranscribe: true },
  "wb-patrol-blackcomb": { label: "Blackcomb Patrol",     color: "#22d3ee", agency: "WB",   canTranscribe: true },
  "wb-lift-ops":         { label: "Lift Ops",             color: "#67e8f9", agency: "WB",   canTranscribe: false },
  "wb-ops":              { label: "WB Operations",        color: "#a5f3fc", agency: "WB",   canTranscribe: false },
  "wb-heliski":          { label: "Heliskiing",           color: "#7dd3fc", agency: "WB",   canTranscribe: false },
  "bcws-titanium":       { label: "NRS Titanium",         color: "#4ade80", agency: "BCWS", canTranscribe: true },
  "bcws-platinum":       { label: "NRS Platinum",         color: "#86efac", agency: "BCWS", canTranscribe: true },
};

const ALL_CHANNELS = Object.keys(CHANNELS);
const TAILSCALE_BASE = "https://firebox.tail4bb545.ts.net";

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
  } catch { return iso; }
}

// ── Audio manager (single active stream) ─────────────────────────────────────

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

// ── Top bar ───────────────────────────────────────────────────────────────────

function TopBar({ mode, setMode, agency, setAgency, meshUnread, onInfo }:
  { mode: Mode; setMode: (m: Mode) => void; agency: Agency; setAgency: (a: Agency) => void;
    meshUnread: boolean; onInfo: () => void }) {
  return (
    <div className="flex items-center justify-between px-3 border-b border-[#222]"
         style={{ height: 52, background: "#0a0a0a", flexShrink: 0 }}>
      {/* Agency filter */}
      <div className="flex gap-1">
        {(["all","WFD","WB","BCWS"] as Agency[]).map(a => (
          <button key={a} onClick={() => setAgency(a)}
            className="px-3 py-1 rounded-full text-xs font-semibold transition-colors"
            style={agency === a
              ? { background: "#f0a500", color: "#000" }
              : { background: "#1a1a1a", color: "#666" }}>
            {a === "all" ? "All" : a}
          </button>
        ))}
      </div>

      {/* Mode toggle + info */}
      <div className="flex items-center gap-2">
        <div className="flex rounded-lg overflow-hidden border border-[#2a2a2a]">
          <button onClick={() => setMode("channels")}
            className="px-3 py-1 text-xs font-medium transition-colors"
            style={mode === "channels" ? { background: "#f0a500", color: "#000" } : { background: "#1a1a1a", color: "#666" }}>
            Channels
          </button>
          <button onClick={() => setMode("monitor")}
            className="px-3 py-1 text-xs font-medium transition-colors"
            style={mode === "monitor" ? { background: "#f0a500", color: "#000" } : { background: "#1a1a1a", color: "#666" }}>
            Monitor
          </button>
        </div>
        <button onClick={onInfo}
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm relative"
          style={{ background: "#1a1a1a", color: "#888" }}>
          ℹ
          {meshUnread && (
            <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-[#4ade80] animate-pulse" />
          )}
        </button>
      </div>
    </div>
  );
}

// ── Channel grid ──────────────────────────────────────────────────────────────

function ChannelGrid({ agency, activeChannels, onToggle }:
  { agency: Agency; activeChannels: string[]; onToggle: (ch: string) => void }) {
  const visible = ALL_CHANNELS.filter(ch =>
    agency === "all" || CHANNELS[ch].agency === agency
  );

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {visible.map(ch => {
          const meta = CHANNELS[ch];
          const active = activeChannels.includes(ch);
          return (
            <button key={ch} onClick={() => meta.canTranscribe && onToggle(ch)}
              className="rounded-xl p-3 text-left transition-all"
              style={{
                background: active ? `${meta.color}18` : "#141414",
                border: `1px solid ${active ? meta.color + "60" : "#222"}`,
                opacity: meta.canTranscribe ? 1 : 0.6,
                cursor: meta.canTranscribe ? "pointer" : "default",
                minHeight: 80,
              }}>
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs font-semibold leading-tight" style={{ color: meta.color }}>
                  {meta.agency}
                </span>
                {active ? (
                  <span className="flex items-center gap-1 text-xs" style={{ color: "#4ade80" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse inline-block" />
                    ON
                  </span>
                ) : meta.canTranscribe ? (
                  <span className="text-xs" style={{ color: "#444" }}>OFF</span>
                ) : (
                  <span className="text-xs">🔊</span>
                )}
              </div>
              <div className="text-xs font-medium leading-snug" style={{ color: "#ccc" }}>
                {meta.label}
              </div>
              {!meta.canTranscribe && (
                <div className="text-xs mt-1" style={{ color: "#444" }}>Audio only</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Monitor view ──────────────────────────────────────────────────────────────

function TranscriptItem({ tx }: { tx: Transcript }) {
  const meta = CHANNELS[tx.channel] ?? { color: "#888" };
  return (
    <div className="px-3 py-2 border-b border-[#1a1a1a]">
      <div className="flex items-center justify-between mb-0.5">
        {tx.speaker && tx.speaker !== "Unknown" && (
          <span className="text-xs px-1.5 py-0.5 rounded"
            style={tx.speaker.toLowerCase() === "dispatch"
              ? { color: "#64b5f6", background: "#64b5f610" }
              : { color: "#f59e0b", background: "#f59e0b18" }}>
            {tx.speaker}
          </span>
        )}
        <span className="text-xs font-mono ml-auto" style={{ color: "#444" }}>
          {formatTime(tx.timestamp)}
        </span>
      </div>
      <p className="text-sm leading-snug" style={{ color: "#e0e0e0" }}>{tx.transcript}</p>
    </div>
  );
}

function ChannelSlot({ channelKey, primary, transcripts, playing, onPlay, onSwap, onAdd }:
  { channelKey: string | null; primary: boolean; transcripts: Transcript[];
    playing: boolean; onPlay: () => void; onSwap?: () => void; onAdd: () => void }) {
  if (!channelKey) {
    return (
      <button onClick={onAdd}
        className="flex-1 flex items-center justify-center rounded-xl border border-dashed border-[#2a2a2a] text-[#444] text-sm gap-2 m-1"
        style={{ minHeight: primary ? 200 : 90 }}>
        + Add Channel
      </button>
    );
  }
  const meta = CHANNELS[channelKey] ?? { label: channelKey, color: "#888" };
  const feed = transcripts.filter(t => t.channel === channelKey).slice(0, primary ? 20 : 4);

  return (
    <div className="flex flex-col rounded-xl border overflow-hidden m-1"
         style={{ flex: primary ? "0 0 auto" : 1, border: `1px solid ${meta.color}40`,
                  background: "#0f0f0f", width: primary ? "calc(100% - 230px)" : "auto", minWidth: 0 }}>
      {/* Slot header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a1a1a]">
        <span className="text-xs font-semibold" style={{ color: meta.color }}>{meta.label}</span>
        <div className="flex items-center gap-2">
          <button onClick={onPlay}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
            style={playing
              ? { background: meta.color + "30", color: meta.color }
              : { background: "#1a1a1a", color: "#666" }}>
            {playing ? "● LIVE" : "▶"}
          </button>
          {!primary && onSwap && (
            <button onClick={onSwap}
              className="text-xs px-2 py-1 rounded" style={{ background: "#1a1a1a", color: "#555" }}>
              ↑
            </button>
          )}
        </div>
      </div>
      {/* Transcript feed */}
      <div className="flex-1 overflow-y-auto" style={{ maxHeight: primary ? 280 : 120 }}>
        {feed.length === 0 ? (
          <p className="text-xs p-3" style={{ color: "#333" }}>No recent traffic</p>
        ) : (
          feed.map((tx, i) => <TranscriptItem key={i} tx={tx} />)
        )}
      </div>
    </div>
  );
}

function ChannelPicker({ onPick, onClose }:
  { onPick: (ch: string) => void; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center"
         style={{ background: "rgba(0,0,0,0.85)" }} onClick={onClose}>
      <div className="rounded-xl border border-[#333] p-4 w-72" style={{ background: "#141414" }}
           onClick={e => e.stopPropagation()}>
        <div className="flex justify-between mb-3">
          <span className="text-sm font-semibold text-white">Select Channel</span>
          <button onClick={onClose} className="text-[#666] text-lg leading-none">×</button>
        </div>
        <div className="flex flex-col gap-2">
          {ALL_CHANNELS.map(ch => {
            const meta = CHANNELS[ch];
            return (
              <button key={ch} onClick={() => onPick(ch)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left"
                style={{ background: "#1a1a1a", color: "#ccc" }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: meta.color }} />
                <span>{meta.agency} — {meta.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MonitorView({ transcripts, meshMessages }:
  { transcripts: Transcript[]; meshMessages: MeshMessage[] }) {
  const [primary, setPrimary] = useState<string | null>("wfd-ch2-scene");
  const [secondary, setSecondary] = useState<string | null>("wfd-ch6-ce");
  const [playingChannel, setPlayingChannel] = useState<string | null>(null);
  const [picker, setPicker] = useState<"primary" | "secondary" | null>(null);

  const play = (ch: string) => {
    if (playingChannel === ch) { audioMgr.stop(); setPlayingChannel(null); }
    else { audioMgr.play(ch); setPlayingChannel(ch); }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Channel slots */}
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {primary ? (
          <ChannelSlot
            channelKey={primary} primary transcripts={transcripts}
            playing={playingChannel === primary}
            onPlay={() => play(primary)}
            onAdd={() => setPicker("primary")}
          />
        ) : (
          <button onClick={() => setPicker("primary")}
            className="flex-1 flex items-center justify-center text-[#444] text-sm border border-dashed border-[#2a2a2a] rounded-xl m-1">
            + Primary Channel
          </button>
        )}

        <div className="flex flex-col" style={{ width: 220, flexShrink: 0 }}>
          <ChannelSlot
            channelKey={secondary} primary={false} transcripts={transcripts}
            playing={playingChannel === secondary}
            onPlay={() => secondary && play(secondary)}
            onSwap={() => { const tmp = primary; setPrimary(secondary); setSecondary(tmp); }}
            onAdd={() => setPicker("secondary")}
          />
          <button onClick={() => setPicker("secondary")}
            className="m-1 flex items-center justify-center text-[#444] text-xs border border-dashed border-[#2a2a2a] rounded-xl py-3">
            + Add Channel
          </button>
        </div>
      </div>

      {/* Mesh message strip */}
      {meshMessages.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 border-t border-[#1a1a1a]"
             style={{ background: "#0a0a0a", height: 44, flexShrink: 0, overflow: "hidden" }}>
          <span className="text-xs flex-shrink-0" style={{ color: "#4ade80" }}>📡</span>
          <span className="text-xs truncate" style={{ color: "#aaa" }}>
            <span style={{ color: "#4ade80", marginRight: 6 }}>
              {meshMessages[0].sender ?? "Mesh"}
            </span>
            {meshMessages[0].message}
          </span>
          <span className="text-xs flex-shrink-0" style={{ color: "#444" }}>
            {formatTime(meshMessages[0].sent_at)}
          </span>
        </div>
      )}

      {/* Channel picker modal */}
      {picker && (
        <ChannelPicker
          onPick={ch => { picker === "primary" ? setPrimary(ch) : setSecondary(ch); setPicker(null); }}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}

// ── Info panel ────────────────────────────────────────────────────────────────

function InfoPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex-1 overflow-y-auto p-4" style={{ background: "#0d0d0d" }}>
      <div className="flex items-center justify-between mb-4">
        <span className="font-bold text-white">FireBox Reference</span>
        <button onClick={onClose} className="text-[#666] text-2xl leading-none px-2">×</button>
      </div>

      {/* Frequency table */}
      <div className="mb-5">
        <h2 className="text-xs font-semibold uppercase mb-2" style={{ color: "#f0a500" }}>Frequencies</h2>
        <div className="rounded-xl border border-[#222] overflow-hidden text-xs">
          {[
            ["WFD Ch.2 On Scene",        "151.355", "CSQ",   "#f0a500"],
            ["WFD Ch.6 Combined Events",  "153.710", "CSQ",   "#fb923c"],
            ["WB Whistler Patrol",        "151.625", "103.5", "#38bdf8"],
            ["WB Blackcomb Patrol",       "151.985", "110.9", "#22d3ee"],
            ["WB Lift Ops",               "152.060", "107.2", "#67e8f9"],
            ["NRS Titanium (BCWS)",        "152.465", "CSQ",   "#4ade80"],
            ["NRS Platinum (BCWS)",        "152.780", "CSQ",   "#86efac"],
            ["WB Misc Ops",               "153.305", "107.2", "#a5f3fc"],
            ["WB Heliskiing",             "153.530", "CSQ",   "#7dd3fc"],
          ].map(([label, freq, pl, color]) => (
            <div key={freq + label} className="flex items-center px-3 py-2 border-b border-[#1a1a1a] last:border-0">
              <span className="w-2 h-2 rounded-full mr-2 flex-shrink-0" style={{ background: color as string }} />
              <span className="flex-1" style={{ color: "#ccc" }}>{label}</span>
              <span className="font-mono mr-3" style={{ color: "#888" }}>{freq}</span>
              <span className="font-mono" style={{ color: "#555" }}>PL {pl}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pi maintenance */}
      <div className="mb-5">
        <h2 className="text-xs font-semibold uppercase mb-2" style={{ color: "#f0a500" }}>Pi Access</h2>
        <div className="rounded-xl border border-[#222] p-3 text-xs space-y-2" style={{ color: "#888" }}>
          <div><span style={{ color: "#ccc" }}>SSH:</span> ssh brew@192.168.8.210</div>
          <div><span style={{ color: "#ccc" }}>Tailscale:</span> ssh brew@100.84.254.62</div>
          <div><span style={{ color: "#ccc" }}>Logs:</span> tail -f /home/brew/recordings/push.log</div>
          <div><span style={{ color: "#ccc" }}>Restart radio:</span> sudo systemctl restart rtl-airband</div>
        </div>
      </div>

      {/* Cron schedule */}
      <div className="mb-5">
        <h2 className="text-xs font-semibold uppercase mb-2" style={{ color: "#f0a500" }}>Pipeline</h2>
        <div className="rounded-xl border border-[#222] p-3 text-xs space-y-2" style={{ color: "#888" }}>
          <div>Transcribe: every 2 min (Whisper + GPT)</div>
          <div>Push to cloud: every 30s (Supabase)</div>
          <div>Transcript lag: ~2 min normal</div>
        </div>
      </div>

      {/* BCWS callsigns */}
      <div>
        <h2 className="text-xs font-semibold uppercase mb-2" style={{ color: "#f0a500" }}>BCWS Reference</h2>
        <div className="rounded-xl border border-[#222] p-3 text-xs space-y-1" style={{ color: "#888" }}>
          <div>SPS 145 = Michel Brew, Whistler</div>
          <div>T101 = Type 1 Tender, unit 01</div>
          <div>TT101 = Tactical Tender</div>
          <div>Sierra [Town] 8xx = SPC crew</div>
          <div>NRS colours: Titanium → Platinum → Silver → Gold…</div>
        </div>
      </div>
    </div>
  );
}

// ── Main app ──────────────────────────────────────────────────────────────────

export default function FireBoxApp() {
  const [mode, setMode] = useState<Mode>("channels");
  const [agency, setAgency] = useState<Agency>("all");
  const [activeChannels, setActiveChannels] = useState<string[]>(["wfd-ch2-scene", "wfd-ch6-ce"]);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [meshMessages, setMeshMessages] = useState<MeshMessage[]>([]);
  const [meshUnread, setMeshUnread] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const lastMeshId = useRef(0);

  // Load active channels from API
  useEffect(() => {
    fetch("/api/firebox-config")
      .then(r => r.json())
      .then(d => { if (d.active_channels) setActiveChannels(d.active_channels); })
      .catch(() => {});
  }, []);

  // Poll transcripts every 15s
  const fetchTranscripts = useCallback(async () => {
    try {
      const r = await fetch("/api/firebox?limit=80");
      if (!r.ok) return;
      const d = await r.json();
      setTranscripts(d.transcripts ?? []);
    } catch {}
  }, []);

  // Poll mesh messages every 10s
  const fetchMesh = useCallback(async () => {
    try {
      const r = await fetch(
        `https://bdgmpkbbohbucwoiucyw.supabase.co/rest/v1/firebox_mesh?order=sent_at.desc&limit=20`,
        { headers: {
          "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZ21wa2Jib2hidWN3b2l1Y3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1Nzk3ODEsImV4cCI6MjA5MDE1NTc4MX0.WAuh1vJsqxkdQKoBQ6i_qfHiJyKM-TSJ9BLtn8EyUws",
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZ21wa2Jib2hidWN3b2l1Y3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1Nzk3ODEsImV4cCI6MjA5MDE1NTc4MX0.WAuh1vJsqxkdQKoBQ6i_qfHiJyKM-TSJ9BLtn8EyUws",
        }}
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

  // Toggle transcription for a channel
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

  return (
    <div style={{
      width: 800, height: 480, background: "#0d0d0d", color: "#e0e0e0",
      fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column",
      overflow: "hidden", userSelect: "none", position: "relative",
      margin: "0 auto",
    }}>
      <TopBar
        mode={mode} setMode={setMode}
        agency={agency} setAgency={setAgency}
        meshUnread={meshUnread} onInfo={openInfo}
      />

      {showInfo ? (
        <InfoPanel onClose={() => setShowInfo(false)} />
      ) : mode === "channels" ? (
        <ChannelGrid agency={agency} activeChannels={activeChannels} onToggle={toggleChannel} />
      ) : (
        <MonitorView transcripts={transcripts} meshMessages={meshMessages} />
      )}
    </div>
  );
}
