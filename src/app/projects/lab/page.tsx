"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// SITEMAP — single source of truth for all whistlerbrew.com projects.
// Add new entries here whenever you ship something. Polished projects also
// get a card on /projects; everything else lives in the Workshop section
// below so unlinked work isn't lost.
type Project = {
  name: string;
  href: string;
  description: string;
  status: "LIVE" | "BETA" | "NEW" | "WIP" | "ARCHIVED";
  accent: string;
  external?: boolean;
};

const POLISHED: Project[] = [
  {
    name: "SPS Dispatch Briefing",
    href: "/projects/sps-briefing",
    description: "Generate dispatch briefings for BC Wildfire deployments with route info, community intel, and KML exports.",
    status: "NEW",
    accent: "#00a8ff",
  },
  {
    name: "SimTable",
    href: "/simtable/",
    description: "BCWS Structure Protection training simulator — fire spread on real BC terrain with tactical decision layer.",
    status: "BETA",
    accent: "#ffd166",
    external: true,
  },
  {
    name: "SitRep — Resource Order",
    href: "/sitrep",
    description: "BC Wildfire resource ordering menu. Fast-entry incident tracker and resource request builder.",
    status: "LIVE",
    accent: "#ef4444",
    external: true,
  },
  {
    name: "FireBox",
    href: "/projects/firebox",
    description: "Live WFD radio transcripts from the Sea to Sky corridor. Powered by Whisper AI.",
    status: "LIVE",
    accent: "#ff6b35",
  },
];

const WORKSHOP: Project[] = [
  {
    name: "Wildfire Tracker",
    href: "/wildfire/index.html",
    description: "BC wildfire dashboard — live BCWS counts, evac notices, zone news. N8N-driven.",
    status: "LIVE",
    accent: "#ff6b35",
    external: true,
  },
  {
    name: "Pushup Challenge",
    href: "/pushup/index.html",
    description: "Daily pushup tracker with live participants and Google Sheets backend.",
    status: "LIVE",
    accent: "#10b981",
    external: true,
  },
  {
    name: "Opus",
    href: "/opus/index.html",
    description: "Experimental project page.",
    status: "WIP",
    accent: "#a78bfa",
    external: true,
  },
  {
    name: "FireSmart",
    href: "/firesmart/index.html",
    description: "FireSmart BC zone awareness experiment.",
    status: "WIP",
    accent: "#fb923c",
    external: true,
  },
  {
    name: "EV",
    href: "/ev/index.html",
    description: "EV charging / data experiment.",
    status: "WIP",
    accent: "#22d3ee",
    external: true,
  },
];

function Card({ p }: { p: Project }) {
  const Tag: typeof Link | "a" = p.external ? "a" : Link;
  const props = p.external ? { href: p.href } : { href: p.href };
  const dark = ["#ffd166", "#22d3ee"].includes(p.accent);
  return (
    <Tag
      {...(props as { href: string })}
      className="block p-6 bg-[#1e1e1e] border border-[#333] rounded-lg transition-colors group"
      style={{ borderColor: "#333" }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = p.accent)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#333")}
    >
      <span
        className="inline-block px-2 py-1 text-xs font-semibold rounded mb-3"
        style={{ backgroundColor: p.accent, color: dark ? "#000" : "#fff" }}
      >
        {p.status}
      </span>
      <h2
        className="text-xl font-semibold mb-2 transition-colors"
        style={{ color: "inherit" }}
      >
        {p.name}
      </h2>
      <p className="text-[#b0b0b0] text-sm">{p.description}</p>
    </Tag>
  );
}

export default function Lab() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const exp = parseInt(sessionStorage.getItem("wb_auth_exp") || localStorage.getItem("wb_auth_exp") || "0");
    if (exp < Date.now()) {
      router.push("/");
    } else {
      sessionStorage.setItem("wb_auth_exp", exp.toString());
      setIsAuthenticated(true);
    }
  }, [router]);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen flex flex-col items-center p-8">
      <header className="mb-8">
        <Image
          src="/logo.png"
          alt="WhistlerBrew.com"
          width={250}
          height={63}
          priority
          className="max-w-[200px] sm:max-w-[250px] h-auto"
        />
      </header>

      <main className="w-full max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="text-3xl font-bold">Lab</h1>
            <span className="text-xs text-[#b0b0b0] italic">
              Full sitemap — including unlinked work in progress.
            </span>
          </div>
          <Link
            href="/projects"
            className="px-4 py-2 border border-[#333] rounded-md text-[#b0b0b0] hover:border-[#00a8ff] hover:text-[#00a8ff] transition-colors text-sm"
          >
            ← Projects
          </Link>
        </div>

        <h3 className="text-sm uppercase tracking-wider text-[#b0b0b0] mb-4">Polished</h3>
        <div className="grid gap-6 md:grid-cols-2 mb-12">
          {POLISHED.map((p) => <Card key={p.name} p={p} />)}
        </div>

        <h3 className="text-sm uppercase tracking-wider text-[#b0b0b0] mb-4">Workshop</h3>
        <div className="grid gap-6 md:grid-cols-2">
          {WORKSHOP.map((p) => <Card key={p.name} p={p} />)}
        </div>
      </main>

      <footer className="mt-auto pt-12 text-[#b0b0b0] text-sm">
        <p>WhistlerBrew.com &copy; 2026 — Lab</p>
      </footer>
    </div>
  );
}
