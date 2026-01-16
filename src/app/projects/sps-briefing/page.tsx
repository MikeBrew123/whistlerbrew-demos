"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const START_LOCATIONS = [
  "Whistler",
  "Kamloops",
  "Prince George",
  "Victoria",
  "Kelowna",
  "Salmon Arm",
  "Vernon",
  "Cranbrook",
  "Nelson",
  "Williams Lake",
  "Other",
];

export default function SPSBriefing() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  // Form state
  const [mode, setMode] = useState<"full" | "community">("full");
  const [startLocation, setStartLocation] = useState("");
  const [reportTo, setReportTo] = useState("");
  const [community, setCommunity] = useState("");
  const [fireNumber, setFireNumber] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [departureTime, setDepartureTime] = useState("");

  useEffect(() => {
    const auth = sessionStorage.getItem("whistlerbrew_auth");
    if (auth !== "true") {
      router.push("/");
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  if (!isAuthenticated) {
    return null;
  }

  const isFullMode = mode === "full";

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-8">
      <header className="w-full max-w-2xl flex justify-between items-center mb-8">
        <Link href="/projects">
          <Image
            src="/logo.png"
            alt="WhistlerBrew.com"
            width={200}
            height={50}
            priority
            className="max-w-[120px] sm:max-w-[160px] h-auto"
          />
        </Link>
        <Link
          href="/projects"
          className="text-[#b0b0b0] hover:text-[#00a8ff] transition-colors text-sm"
        >
          ← Back
        </Link>
      </header>

      <main className="w-full max-w-2xl">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6">SPS Dispatch Briefing</h1>

        {/* Mode Toggle */}
        <div className="mb-6">
          <label className="block text-sm text-[#b0b0b0] mb-2">Briefing Mode</label>
          <div className="flex gap-2">
            <button
              onClick={() => setMode("full")}
              className={`flex-1 py-3 px-4 rounded-md font-medium transition-colors ${
                isFullMode
                  ? "bg-[#00a8ff] text-white"
                  : "bg-[#1e1e1e] text-[#b0b0b0] border border-[#333] hover:border-[#00a8ff]"
              }`}
            >
              Full Briefing
            </button>
            <button
              onClick={() => setMode("community")}
              className={`flex-1 py-3 px-4 rounded-md font-medium transition-colors ${
                !isFullMode
                  ? "bg-[#00a8ff] text-white"
                  : "bg-[#1e1e1e] text-[#b0b0b0] border border-[#333] hover:border-[#00a8ff]"
              }`}
            >
              Community Only
            </button>
          </div>
          <p className="text-xs text-[#666] mt-2">
            {isFullMode
              ? "Includes route info, road conditions, and hotel recommendations"
              : "Community intel, weather, and KML export only"}
          </p>
        </div>

        {/* Start Location - Full Mode Only */}
        {isFullMode && (
          <div className="mb-4">
            <label className="block text-sm text-[#b0b0b0] mb-2">
              Start Location <span className="text-red-400">*</span>
            </label>
            <select
              value={startLocation}
              onChange={(e) => setStartLocation(e.target.value)}
              className="w-full p-3 bg-[#1e1e1e] border border-[#333] rounded-md text-white focus:outline-none focus:border-[#00a8ff]"
            >
              <option value="">Select location...</option>
              {START_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Report TO - Full Mode Only */}
        {isFullMode && (
          <div className="mb-4">
            <label className="block text-sm text-[#b0b0b0] mb-2">
              Report TO <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={reportTo}
              onChange={(e) => setReportTo(e.target.value)}
              placeholder="e.g., Burns Lake Fire Centre"
              className="w-full p-3 bg-[#1e1e1e] border border-[#333] rounded-md text-white placeholder-[#666] focus:outline-none focus:border-[#00a8ff]"
            />
          </div>
        )}

        {/* Community to Protect - Always Shows */}
        <div className="mb-4">
          <label className="block text-sm text-[#b0b0b0] mb-2">
            Community to Protect <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={community}
            onChange={(e) => setCommunity(e.target.value)}
            placeholder="e.g., Burns Lake"
            className="w-full p-3 bg-[#1e1e1e] border border-[#333] rounded-md text-white placeholder-[#666] focus:outline-none focus:border-[#00a8ff]"
          />
        </div>

        {/* Fire Number - Always Shows */}
        <div className="mb-4">
          <label className="block text-sm text-[#b0b0b0] mb-2">
            Fire Number <span className="text-[#666]">(optional)</span>
          </label>
          <input
            type="text"
            value={fireNumber}
            onChange={(e) => setFireNumber(e.target.value)}
            placeholder="e.g., R20123"
            className="w-full p-3 bg-[#1e1e1e] border border-[#333] rounded-md text-white placeholder-[#666] focus:outline-none focus:border-[#00a8ff]"
          />
        </div>

        {/* Departure Date/Time - Full Mode Only */}
        {isFullMode && (
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#b0b0b0] mb-2">Departure Date</label>
              <input
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                className="w-full p-3 bg-[#1e1e1e] border border-[#333] rounded-md text-white focus:outline-none focus:border-[#00a8ff]"
              />
            </div>
            <div>
              <label className="block text-sm text-[#b0b0b0] mb-2">Departure Time</label>
              <input
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="w-full p-3 bg-[#1e1e1e] border border-[#333] rounded-md text-white focus:outline-none focus:border-[#00a8ff]"
              />
            </div>
          </div>
        )}

        {/* Generate Button */}
        <button
          className="w-full py-4 bg-[#00a8ff] hover:bg-[#0090e0] text-white font-semibold rounded-md transition-colors"
        >
          Generate Briefing
        </button>
      </main>

      <footer className="mt-auto pt-8 text-[#b0b0b0] text-xs">
        <p>WhistlerBrew.com &copy; 2026</p>
      </footer>
    </div>
  );
}
