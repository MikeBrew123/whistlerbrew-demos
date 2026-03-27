"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";

// The FireBox page has its own simple password, separate from the main site auth.
// This keeps the live radio feed accessible to demo guests without sharing
// the main WhistlerBrew login.
const FIREBOX_PASSWORD = "FireBox";

type Transcript = {
  channel: string;
  filename: string;
  timestamp: string;
  transcript: string;
  speaker?: string; // Identified by GPT-4o-mini: "Dispatch", "Engine 1", etc.
};

// Channel display names and accent colours for the feed.
// Add new channels here as rtl_airband picks up more frequencies.
const CHANNEL_STYLE: Record<string, { label: string; color: string }> = {
  // WFD Fire channels
  "wfd-ch1-dispatch":   { label: "WFD Ch.1 Dispatch",       color: "#ff6b35" },
  "wfd-ch2-scene":      { label: "WFD Ch.2 On Scene",        color: "#f0a500" },
  "wfd-ch6-ce":         { label: "WFD Ch.6 Combined Events", color: "#fb923c" },
  // Whistler Blackcomb
  "wb-patrol-whistler": { label: "WB Whistler Patrol",       color: "#38bdf8" },
  "wb-patrol-blackcomb":{ label: "WB Blackcomb Patrol",      color: "#22d3ee" },
  "wb-lift-ops":        { label: "WB Lift Ops",              color: "#67e8f9" },
  "wb-ops":             { label: "WB Operations",            color: "#a5f3fc" },
  "wb-heliski":         { label: "WB Heliskiing",            color: "#7dd3fc" },
  // BCWS NRS
  "bcws-titanium":      { label: "NRS Titanium",             color: "#4ade80" },
  "bcws-platinum":      { label: "NRS Platinum",             color: "#86efac" },
  // Legacy keys
  "wfd-garibaldi":      { label: "WFD Ch.5 Garibaldi",       color: "#00a8ff" },
  "wfd-dispatch":       { label: "WFD Ch.2 On Scene",        color: "#f0a500" },
};

function channelStyle(channel: string) {
  return CHANNEL_STYLE[channel] ?? { label: channel, color: "#888" };
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("en-CA", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

// ── Login screen ──────────────────────────────────────────────────────────────

function LoginScreen({ onAuth }: { onAuth: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  const submit = () => {
    if (value === FIREBOX_PASSWORD) {
      sessionStorage.setItem("firebox_auth", "true");
      onAuth();
    } else {
      setError(true);
      setValue("");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#0d0d0d]">
      <Image src="/logo.png" alt="WhistlerBrew" width={200} height={50} className="mb-8 h-auto" />
      <div className="w-full max-w-sm bg-[#1a1a1a] border border-[#333] rounded-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">📻</span>
          <h1 className="text-xl font-bold text-white">FireBox</h1>
        </div>
        <p className="text-[#888] text-sm mb-6">
          Live WFD radio transcripts. Enter access code to continue.
        </p>
        <input
          type="password"
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(false); }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Access code"
          autoFocus
          className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-white
                     placeholder-[#555] focus:outline-none focus:border-[#ff6b35] mb-3"
        />
        {error && (
          <p className="text-red-400 text-xs mb-3">Incorrect code. Try again.</p>
        )}
        <button
          onClick={submit}
          className="w-full bg-[#ff6b35] hover:bg-[#e55a25] text-white font-semibold
                     py-3 rounded-lg transition-colors"
        >
          Enter
        </button>
      </div>
    </div>
  );
}

// ── Main feed ─────────────────────────────────────────────────────────────────

function FireBoxFeed() {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [live, setLive] = useState(true);
  const feedRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  const fetchTranscripts = useCallback(async () => {
    try {
      const url = channelFilter === "all"
        ? "/api/firebox"
        : `/api/firebox?channel=${channelFilter}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      setTranscripts(data.transcripts ?? []);
      setLastUpdated(new Date());

      // Auto-scroll to top when new entries arrive
      if (data.transcripts.length > prevCountRef.current && feedRef.current) {
        feedRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
      prevCountRef.current = data.transcripts.length;
    } catch {
      // Silently ignore fetch errors — will retry on next poll
    }
  }, [channelFilter]);

  // Poll every 30 seconds when live
  useEffect(() => {
    fetchTranscripts();
    if (!live) return;
    const id = setInterval(fetchTranscripts, 30000);
    return () => clearInterval(id);
  }, [fetchTranscripts, live]);

  // Always show all monitored channels as tabs, even before any traffic arrives
  const MONITORED_CHANNELS = [
    "wfd-ch1-dispatch", "wfd-ch2-scene", "wfd-ch6-ce",
    "wb-patrol-whistler", "wb-patrol-blackcomb", "wb-lift-ops",
    "wb-ops", "wb-heliski", "bcws-titanium", "bcws-platinum",
  ];
  const activeChannels = Array.from(new Set([...MONITORED_CHANNELS, ...transcripts.map((t) => t.channel)]));

  return (
    <div className="min-h-screen flex flex-col bg-[#0d0d0d] text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0d0d0d]/95 backdrop-blur border-b border-[#222] px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/projects" className="text-[#555] hover:text-white transition-colors text-sm">
              ← Projects
            </Link>
            <span className="text-[#333]">|</span>
            <span className="text-lg font-bold">📻 FireBox</span>
            {/* Live indicator */}
            <span className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full
              ${live ? "bg-green-900/40 text-green-400" : "bg-[#222] text-[#666]"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${live ? "bg-green-400 animate-pulse" : "bg-[#555]"}`} />
              {live ? "LIVE" : "PAUSED"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-[#555] text-xs hidden sm:block">
                Updated {formatTime(lastUpdated.toISOString())}
              </span>
            )}
            <button
              onClick={() => setLive((v) => !v)}
              className="text-xs px-3 py-1.5 border border-[#333] rounded-lg
                         hover:border-[#ff6b35] hover:text-[#ff6b35] transition-colors"
            >
              {live ? "Pause" : "Resume"}
            </button>
          </div>
        </div>
      </header>

      {/* Channel filter tabs */}
      <div className="border-b border-[#222] px-6">
        <div className="max-w-3xl mx-auto flex flex-wrap gap-1 pt-3 pb-0">
          {["all", ...activeChannels].map((ch) => {
            const style = ch === "all" ? { label: "All Channels", color: "#aaa" } : channelStyle(ch);
            return (
              <button
                key={ch}
                onClick={() => setChannelFilter(ch)}
                className={`px-3 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap
                  ${channelFilter === ch
                    ? "border-[#ff6b35] text-white"
                    : "border-transparent text-[#666] hover:text-[#aaa]"}`}
              >
                {style.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feed */}
      <main className="flex-1 overflow-y-auto px-6 py-6" ref={feedRef}>
        <div className="max-w-3xl mx-auto space-y-3">
          {transcripts.length === 0 ? (
            <div className="text-center py-20 text-[#444]">
              <div className="text-4xl mb-4">📡</div>
              <p className="text-lg">No transmissions yet</p>
              <p className="text-sm mt-2">Waiting for radio traffic…</p>
            </div>
          ) : (
            transcripts.map((tx, i) => {
              const style = channelStyle(tx.channel);
              return (
                <div
                  key={`${tx.timestamp}-${i}`}
                  className="bg-[#141414] border border-[#222] rounded-xl p-4
                             hover:border-[#333] transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {/* Channel badge */}
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ color: style.color, backgroundColor: `${style.color}18` }}
                      >
                        {style.label}
                      </span>
                      {/* Speaker badge — Dispatch = blue, field units = amber */}
                      {tx.speaker && tx.speaker !== "Unknown" && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={tx.speaker.toLowerCase() === "dispatch"
                            ? { color: "#64b5f6", backgroundColor: "#64b5f610" }
                            : { color: "#f59e0b", backgroundColor: "#f59e0b18" }}
                        >
                          {tx.speaker}
                        </span>
                      )}
                    </div>
                    <span className="text-[#444] text-xs font-mono">
                      {formatTime(tx.timestamp)}
                    </span>
                  </div>
                  <p className="text-[#e0e0e0] text-sm leading-relaxed">{tx.transcript}</p>
                </div>
              );
            })
          )}
        </div>
      </main>

      <footer className="border-t border-[#1a1a1a] px-6 py-3 text-center text-[#333] text-xs">
        WhistlerBrew FireBox · Sea to Sky WFD Radio
      </footer>
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

export default function FireBoxPage() {
  const [authed, setAuthed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("firebox_auth") === "true") {
      setAuthed(true);
    }
    setChecked(true);
  }, []);

  if (!checked) return null;
  if (!authed) return <LoginScreen onAuth={() => setAuthed(true)} />;
  return <FireBoxFeed />;
}
