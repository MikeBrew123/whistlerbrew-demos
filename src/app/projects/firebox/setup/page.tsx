"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Suspense } from "react";

// ── Node nickname map — update as you add nodes ──────────────────────────────
const NODE_NAMES: Record<string, string> = {
  // "abcd1234": "Brew1 — Base Node",
};

// ── Inner component (uses useSearchParams) ────────────────────────────────────

function SetupForm() {
  const params  = useSearchParams();
  const nodeRaw = (params.get("node") ?? "").replace(/^!/, "").toLowerCase();
  const nodeId  = /^[0-9a-f]{8}$/.test(nodeRaw) ? nodeRaw : null;

  const [callSign, setCallSign] = useState("");
  const [status,   setStatus]   = useState<"idle" | "sending" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const nicknameDisplay = nodeId
    ? (NODE_NAMES[nodeId] ?? `Node · ${nodeId.slice(-4).toUpperCase()}`)
    : null;

  const handleSubmit = async () => {
    if (!nodeId || !callSign.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/firebox-provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ node_id: nodeId, call_sign: callSign.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error ?? "Something went wrong"); setStatus("error"); return; }
      setStatus("done");
    } catch {
      setErrorMsg("No connection — check your internet and try again.");
      setStatus("error");
    }
  };

  // ── Invalid / missing node ID ─────────────────────────────────────────────
  if (!nodeId) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.logo}><Image src="/firebox-logo.png" alt="FireBox" width={140} height={70} style={{ mixBlendMode: "screen" }} /></div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#ef4444", marginBottom: 12 }}>Invalid QR Code</div>
          <div style={{ fontSize: 16, color: "#888", textAlign: "center", lineHeight: 1.6 }}>
            This link is missing a node ID.<br />Please scan the QR code again.
          </div>
        </div>
      </div>
    );
  }

  // ── Success ───────────────────────────────────────────────────────────────
  if (status === "done") {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.logo}><Image src="/firebox-logo.png" alt="FireBox" width={140} height={70} style={{ mixBlendMode: "screen" }} /></div>
          <div style={{ fontSize: 60, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#4ade80", marginBottom: 10, textAlign: "center" }}>
            You&apos;re set up!
          </div>
          <div style={{ fontSize: 17, color: "#888", textAlign: "center", lineHeight: 1.7 }}>
            Call sign <span style={{ color: "#f0a500", fontWeight: 700 }}>{callSign.trim().toUpperCase()}</span> has been<br />
            sent to your node.<br /><br />
            <span style={{ fontSize: 14, color: "#555" }}>It may take up to 30 seconds to update.</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        input:focus { outline: none; }
      `}</style>

      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logo}>
          <Image src="/firebox-logo.png" alt="FireBox" width={140} height={70} style={{ mixBlendMode: "screen" }} />
        </div>

        {/* Node badge */}
        <div style={{
          fontSize: 13, color: "#555", marginBottom: 28, textAlign: "center",
          fontFamily: "monospace", letterSpacing: 0.5,
        }}>
          {nicknameDisplay}
        </div>

        {/* Heading */}
        <div style={{ fontSize: 20, fontWeight: 700, color: "#ccc", marginBottom: 6, textAlign: "center" }}>
          Enter your call sign
        </div>
        <div style={{ fontSize: 14, color: "#555", textAlign: "center", marginBottom: 28 }}>
          This sets your name on the mesh network
        </div>

        {/* Input */}
        <input
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="e.g. VE7ABC or SPS145"
          value={callSign}
          onChange={e => { setCallSign(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")); setStatus("idle"); setErrorMsg(""); }}
          maxLength={8}
          style={{
            width: "100%", padding: "18px 20px", borderRadius: 14, marginBottom: 16,
            fontSize: 28, fontWeight: 700, textAlign: "center", letterSpacing: 3,
            background: "#1a1a1a", color: "#f0a500",
            border: `2px solid ${callSign.length >= 2 ? "#f0a50060" : "#2a2a2a"}`,
            fontFamily: "'Rajdhani', system-ui, sans-serif",
            transition: "border-color 0.2s",
          }}
        />

        {/* Error */}
        {status === "error" && (
          <div style={{
            fontSize: 14, color: "#ef4444", textAlign: "center",
            marginBottom: 16, padding: "10px 14px",
            background: "#ef444415", borderRadius: 10, border: "1px solid #ef444430",
          }}>
            {errorMsg}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={callSign.length < 2 || status === "sending"}
          style={{
            width: "100%", padding: "20px 0", borderRadius: 14,
            fontSize: 18, fontWeight: 800, letterSpacing: 1,
            border: "none", cursor: callSign.length >= 2 ? "pointer" : "default",
            background: callSign.length >= 2 ? "#f0a500" : "#1a1a1a",
            color: callSign.length >= 2 ? "#000" : "#333",
            transition: "background 0.2s",
          }}
        >
          {status === "sending" ? "Sending…" : "SET CALL SIGN →"}
        </button>

        {/* Footer note */}
        <div style={{ fontSize: 12, color: "#333", textAlign: "center", marginTop: 20, lineHeight: 1.6 }}>
          Your node must be within radio range<br />of the FireBox base station.
        </div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  page: {
    minHeight: "100dvh", background: "#0d0d0d",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "24px 16px",
  } as React.CSSProperties,
  card: {
    width: "100%", maxWidth: 400, padding: "36px 28px",
    background: "#111", borderRadius: 20, border: "1px solid #222",
    display: "flex", flexDirection: "column", alignItems: "center",
  } as React.CSSProperties,
  logo: { marginBottom: 8 } as React.CSSProperties,
};

// ── Page export (wrapped in Suspense for useSearchParams) ─────────────────────

export default function FireBoxSetupPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100dvh", background: "#0d0d0d" }} />}>
      <SetupForm />
    </Suspense>
  );
}
