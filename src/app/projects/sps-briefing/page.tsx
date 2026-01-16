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

type FormErrors = {
  startLocation?: string;
  reportTo?: string;
  community?: string;
};

type Fire = {
  fireNumber: string;
  name: string;
  status: string;
  size: number;
  lat: number;
  lng: number;
  isFireOfNote: boolean;
  url: string;
  cause: string;
  fireCentre: string;
  distanceKm?: number;
};

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

  // UI state
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  // Fire search state
  const [isSearchingFires, setIsSearchingFires] = useState(false);
  const [nearbyFires, setNearbyFires] = useState<Fire[]>([]);
  const [fireSearchError, setFireSearchError] = useState("");
  const [showFireResults, setShowFireResults] = useState(false);

  useEffect(() => {
    const auth = sessionStorage.getItem("whistlerbrew_auth");
    if (auth !== "true") {
      router.push("/");
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    const isFullMode = mode === "full";

    if (!community.trim()) {
      newErrors.community = "Community to Protect is required";
    }

    if (isFullMode) {
      if (!startLocation) {
        newErrors.startLocation = "Start Location is required";
      }
      if (!reportTo.trim()) {
        newErrors.reportTo = "Report TO is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const searchNearbyFires = async () => {
    if (!community.trim()) {
      setFireSearchError("Enter a community name first");
      return;
    }

    setIsSearchingFires(true);
    setFireSearchError("");
    setNearbyFires([]);
    setShowFireResults(false);

    try {
      // First geocode the community
      const geoRes = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: community }),
      });

      if (!geoRes.ok) {
        const geoError = await geoRes.json();
        throw new Error(geoError.error || "Failed to find location");
      }

      const geoData = await geoRes.json();

      // Then search for fires near that location
      const firesRes = await fetch("/api/fires/nearby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: geoData.latitude,
          longitude: geoData.longitude,
          radiusKm: 100,
        }),
      });

      if (!firesRes.ok) {
        throw new Error("Failed to search for fires");
      }

      const firesData = await firesRes.json();
      setNearbyFires(firesData.fires || []);
      setShowFireResults(true);

      if (firesData.fires?.length === 0) {
        setFireSearchError("No active fires found within 100km");
      }
    } catch (error) {
      setFireSearchError(error instanceof Error ? error.message : "Search failed");
    } finally {
      setIsSearchingFires(false);
    }
  };

  const selectFire = (fire: Fire) => {
    setFireNumber(fire.fireNumber);
    setShowFireResults(false);
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    const formData = {
      mode,
      startLocation: mode === "full" ? startLocation : null,
      reportTo: mode === "full" ? reportTo : null,
      community,
      fireNumber: fireNumber || null,
      departureDate: mode === "full" ? departureDate || null : null,
      departureTime: mode === "full" ? departureTime || null : null,
    };

    console.log("Form submitted:", formData);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsLoading(false);
  };

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
              onClick={() => { setMode("full"); setErrors({}); }}
              className={`flex-1 py-3 px-4 rounded-md font-medium transition-colors ${
                isFullMode
                  ? "bg-[#00a8ff] text-white"
                  : "bg-[#1e1e1e] text-[#b0b0b0] border border-[#333] hover:border-[#00a8ff]"
              }`}
            >
              Full Briefing
            </button>
            <button
              onClick={() => { setMode("community"); setErrors({}); }}
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
              onChange={(e) => { setStartLocation(e.target.value); setErrors((prev) => ({ ...prev, startLocation: undefined })); }}
              className={`w-full p-3 bg-[#1e1e1e] border rounded-md text-white focus:outline-none focus:border-[#00a8ff] ${
                errors.startLocation ? "border-red-400" : "border-[#333]"
              }`}
            >
              <option value="">Select location...</option>
              {START_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
            {errors.startLocation && (
              <p className="text-red-400 text-xs mt-1">{errors.startLocation}</p>
            )}
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
              onChange={(e) => { setReportTo(e.target.value); setErrors((prev) => ({ ...prev, reportTo: undefined })); }}
              placeholder="e.g., Burns Lake Fire Centre"
              className={`w-full p-3 bg-[#1e1e1e] border rounded-md text-white placeholder-[#666] focus:outline-none focus:border-[#00a8ff] ${
                errors.reportTo ? "border-red-400" : "border-[#333]"
              }`}
            />
            {errors.reportTo && (
              <p className="text-red-400 text-xs mt-1">{errors.reportTo}</p>
            )}
          </div>
        )}

        {/* Community to Protect - Always Shows */}
        <div className="mb-4">
          <label className="block text-sm text-[#b0b0b0] mb-2">
            Community to Protect <span className="text-red-400">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={community}
              onChange={(e) => { setCommunity(e.target.value); setErrors((prev) => ({ ...prev, community: undefined })); setShowFireResults(false); }}
              placeholder="e.g., Burns Lake"
              className={`flex-1 p-3 bg-[#1e1e1e] border rounded-md text-white placeholder-[#666] focus:outline-none focus:border-[#00a8ff] ${
                errors.community ? "border-red-400" : "border-[#333]"
              }`}
            />
            <button
              type="button"
              onClick={searchNearbyFires}
              disabled={isSearchingFires}
              className={`px-4 py-3 rounded-md font-medium text-sm whitespace-nowrap transition-colors ${
                isSearchingFires
                  ? "bg-[#333] text-[#666] cursor-not-allowed"
                  : "bg-[#1e1e1e] border border-[#333] text-[#b0b0b0] hover:border-[#00a8ff] hover:text-[#00a8ff]"
              }`}
            >
              {isSearchingFires ? "Searching..." : "🔥 Find Fires"}
            </button>
          </div>
          {errors.community && (
            <p className="text-red-400 text-xs mt-1">{errors.community}</p>
          )}
          {fireSearchError && (
            <p className="text-amber-400 text-xs mt-1">{fireSearchError}</p>
          )}
        </div>

        {/* Fire Search Results */}
        {showFireResults && nearbyFires.length > 0 && (
          <div className="mb-4 bg-[#1a1a1a] border border-[#333] rounded-md max-h-64 overflow-y-auto">
            <div className="p-2 border-b border-[#333] text-xs text-[#666]">
              {nearbyFires.length} fire{nearbyFires.length !== 1 ? "s" : ""} within 100km — click to select
            </div>
            {nearbyFires.map((fire) => (
              <button
                key={fire.fireNumber}
                onClick={() => selectFire(fire)}
                className="w-full p-3 text-left hover:bg-[#252525] border-b border-[#222] last:border-b-0 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[#00a8ff] text-sm">{fire.fireNumber}</span>
                      {fire.isFireOfNote && (
                        <span className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded">
                          FIRE OF NOTE
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-white truncate">{fire.name}</div>
                    <div className="text-xs text-[#666] mt-1">
                      {fire.status} • {fire.size.toLocaleString()} ha • {fire.distanceKm} km away
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

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
          onClick={handleSubmit}
          disabled={isLoading}
          className={`w-full py-4 font-semibold rounded-md transition-colors ${
            isLoading
              ? "bg-[#333] text-[#666] cursor-not-allowed"
              : "bg-[#00a8ff] hover:bg-[#0090e0] text-white"
          }`}
        >
          {isLoading ? "Generating..." : "Generate Briefing"}
        </button>
      </main>

      <footer className="mt-auto pt-8 text-[#b0b0b0] text-xs">
        <p>WhistlerBrew.com &copy; 2026</p>
      </footer>
    </div>
  );
}
