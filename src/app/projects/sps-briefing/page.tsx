"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
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

type BriefingResult = {
  routeBrief?: string;
  communityBrief: string;
  kmlData?: string;
  kmlFilename?: string;
  community?: string;
  latitude?: number;
  longitude?: number;
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
  const [loadingStatus, setLoadingStatus] = useState("");

  // Location disambiguation state
  const [locationOptions, setLocationOptions] = useState<Array<{
    latitude: number;
    longitude: number;
    formattedAddress: string;
    placeId: string;
  }>>([]);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    formattedAddress: string;
  } | null>(null);

  // Fire search state
  const [isSearchingFires, setIsSearchingFires] = useState(false);
  const [nearbyFires, setNearbyFires] = useState<Fire[]>([]);
  const [fireSearchError, setFireSearchError] = useState("");
  const [showFireResults, setShowFireResults] = useState(false);

  // Results state
  const [results, setResults] = useState<BriefingResult | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

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

  const selectLocation = (location: { latitude: number; longitude: number; formattedAddress: string }) => {
    setSelectedLocation(location);
    setShowLocationPicker(false);
    generateBriefingWithLocation(location);
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setLoadingStatus("Geocoding locations...");
    setResults(null);

    try {
      // Get coordinates for community
      const communityGeoRes = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: community }),
      });

      if (!communityGeoRes.ok) {
        throw new Error("Failed to geocode community");
      }

      const communityGeo = await communityGeoRes.json();

      // Check if disambiguation is needed
      if (communityGeo.multiple && communityGeo.options) {
        setLocationOptions(communityGeo.options);
        setShowLocationPicker(true);
        setIsLoading(false);
        return;
      }

      // Single result - proceed with briefing
      await generateBriefingWithLocation(communityGeo);
    } catch (error) {
      console.error("Error geocoding community:", error);
      alert(error instanceof Error ? error.message : "Failed to geocode community");
      setIsLoading(false);
    }
  };

  const generateBriefingWithLocation = async (communityGeo: { latitude: number; longitude: number; formattedAddress: string }) => {
    setIsLoading(true);
    setLoadingStatus("Generating briefing...");
    setResults(null);

    try {

      let routeBrief: string | undefined;
      let originLat: number | undefined;
      let originLng: number | undefined;

      // Full mode: get route brief
      if (mode === "full" && startLocation) {
        setLoadingStatus("Calculating route...");

        const originGeoRes = await fetch("/api/geocode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: startLocation === "Other" ? reportTo : startLocation }),
        });

        if (originGeoRes.ok) {
          const originGeo = await originGeoRes.json();
          originLat = originGeo.latitude;
          originLng = originGeo.longitude;

          const routeRes = await fetch("/api/route-brief/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              origin: startLocation === "Other" ? reportTo : startLocation,
              destination: community,
              originLat,
              originLng,
              destLat: communityGeo.latitude,
              destLng: communityGeo.longitude,
              departureDate,
              departureTime,
            }),
          });

          if (routeRes.ok) {
            const routeData = await routeRes.json();
            routeBrief = routeData.brief;
          }
        }
      }

      // Generate community briefing
      setLoadingStatus("Gathering community intel...");

      const briefingRes = await fetch("/api/briefing/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          community,
          fireNumber: fireNumber || undefined,
          latitude: communityGeo.latitude,
          longitude: communityGeo.longitude,
        }),
      });

      if (!briefingRes.ok) {
        throw new Error("Failed to generate community briefing");
      }

      const briefingData = await briefingRes.json();

      // Generate KML
      setLoadingStatus("Creating KML map file...");

      const kmlRes = await fetch("/api/kml/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          points: briefingData.kmlPoints || [],
          title: `SPS Briefing - ${community}`,
          community,
        }),
      });

      let kmlData: string | undefined;
      let kmlFilename: string | undefined;

      if (kmlRes.ok) {
        kmlData = await kmlRes.text();
        kmlFilename = `${community.replace(/[^a-z0-9]/gi, "_")}_briefing.kml`;
      }

      setResults({
        routeBrief,
        communityBrief: briefingData.briefing,
        kmlData,
        kmlFilename,
        community,
        latitude: communityGeo.latitude,
        longitude: communityGeo.longitude,
      });

      // Scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (error) {
      console.error("Error generating briefing:", error);
      alert(error instanceof Error ? error.message : "Failed to generate briefing");
    } finally {
      setIsLoading(false);
      setLoadingStatus("");
    }
  };

  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(section);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch {
      alert("Failed to copy to clipboard");
    }
  };

  const copyAll = async () => {
    if (!results) return;

    let fullText = "";
    if (results.routeBrief) {
      fullText += results.routeBrief + "\n\n";
    }
    fullText += results.communityBrief;

    await copyToClipboard(fullText, "all");
  };

  const downloadKML = () => {
    if (!results?.kmlData || !results?.kmlFilename) return;

    const blob = new Blob([results.kmlData], { type: "application/vnd.google-earth.kml+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = results.kmlFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadTacticalMap = async () => {
    if (!results?.community || !results?.latitude || !results?.longitude) return;

    try {
      const response = await fetch("/api/tactical-map/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          community: results.community,
          latitude: results.latitude,
          longitude: results.longitude,
          radiusKm: 30,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate tactical map");
      }

      const kmlData = await response.text();
      const blob = new Blob([kmlData], { type: "application/vnd.google-earth.kml+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${results.community.replace(/[^a-z0-9]/gi, "_")}_tactical_map.kml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading tactical map:", error);
      alert("Failed to generate tactical map");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const resetForm = () => {
    setResults(null);
    setShowLocationPicker(false);
    setLocationOptions([]);
    setSelectedLocation(null);
  };

  if (!isAuthenticated) {
    return null;
  }

  const isFullMode = mode === "full";

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-8">
      <header className="w-full max-w-2xl flex justify-between items-center mb-8 print:hidden">
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
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 print:text-black">SPS Dispatch Briefing</h1>

        {/* Form Section - Hide when showing results */}
        {!results && (
          <>
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
              {isLoading ? loadingStatus || "Generating..." : "Generate Briefing"}
            </button>
          </>
        )}

        {/* Location Disambiguation Picker */}
        {showLocationPicker && locationOptions.length > 0 && (
          <div className="bg-[#1a1a1a] border-2 border-[#00a8ff] rounded-md overflow-hidden animate-pulse">
            <div className="p-4 border-b border-[#333] bg-[#00a8ff]/10">
              <h3 className="font-semibold text-[#00a8ff]">📍 Multiple locations found</h3>
              <p className="text-sm text-[#b0b0b0] mt-1">Select the correct location for &quot;{community}&quot;</p>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {locationOptions.map((option, index) => (
                <button
                  key={option.placeId || index}
                  onClick={() => selectLocation(option)}
                  className="w-full p-4 text-left hover:bg-[#252525] border-b border-[#222] last:border-b-0 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="text-white font-medium">{option.formattedAddress}</div>
                      <div className="text-xs text-[#666] mt-1">
                        {option.latitude.toFixed(4)}°N, {option.longitude.toFixed(4)}°W
                      </div>
                    </div>
                    <div className="text-[#00a8ff] text-xl">→</div>
                  </div>
                </button>
              ))}
            </div>
            <div className="p-3 border-t border-[#333] bg-[#1a1a1a]">
              <button
                onClick={() => {
                  setShowLocationPicker(false);
                  setLocationOptions([]);
                }}
                className="text-sm text-[#b0b0b0] hover:text-white transition-colors"
              >
                ← Cancel
              </button>
            </div>
          </div>
        )}

        {/* Results Section */}
        {results && (
          <div ref={resultsRef} className="space-y-6">
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 print:hidden">
              <button
                onClick={copyAll}
                className={`flex-1 py-3 px-4 rounded-md font-medium text-sm transition-colors ${
                  copySuccess === "all"
                    ? "bg-green-600 text-white"
                    : "bg-[#1e1e1e] border border-[#333] text-[#b0b0b0] hover:border-[#00a8ff] hover:text-[#00a8ff]"
                }`}
              >
                {copySuccess === "all" ? "✓ Copied!" : "📋 Copy All"}
              </button>
              {results.kmlData && (
                <button
                  onClick={downloadKML}
                  className="flex-1 py-3 px-4 rounded-md font-medium text-sm bg-[#1e1e1e] border border-[#333] text-[#b0b0b0] hover:border-[#00a8ff] hover:text-[#00a8ff] transition-colors"
                >
                  📍 Infrastructure Map
                </button>
              )}
              <button
                onClick={downloadTacticalMap}
                className="flex-1 py-3 px-4 rounded-md font-medium text-sm bg-[#1e1e1e] border border-[#333] text-[#b0b0b0] hover:border-[#00a8ff] hover:text-[#00a8ff] transition-colors"
              >
                📡 Tactical Map
              </button>
              <button
                onClick={handlePrint}
                className="flex-1 py-3 px-4 rounded-md font-medium text-sm bg-[#1e1e1e] border border-[#333] text-[#b0b0b0] hover:border-[#00a8ff] hover:text-[#00a8ff] transition-colors"
              >
                🖨️ Print
              </button>
            </div>

            {/* Route Brief Section */}
            {results.routeBrief && (
              <div className="bg-[#1a1a1a] border border-[#333] rounded-md overflow-hidden print:border-black print:bg-white">
                <div className="flex items-center justify-between p-3 border-b border-[#333] print:border-black">
                  <h2 className="font-semibold text-[#00a8ff] print:text-black">Route Brief</h2>
                  <button
                    onClick={() => copyToClipboard(results.routeBrief!, "route")}
                    className={`text-xs px-2 py-1 rounded transition-colors print:hidden ${
                      copySuccess === "route"
                        ? "bg-green-600 text-white"
                        : "bg-[#333] text-[#b0b0b0] hover:bg-[#444]"
                    }`}
                  >
                    {copySuccess === "route" ? "✓ Copied" : "Copy"}
                  </button>
                </div>
                <pre className="p-4 text-sm whitespace-pre-wrap font-mono text-[#ccc] print:text-black overflow-x-auto">
                  {results.routeBrief}
                </pre>
              </div>
            )}

            {/* Community Brief Section */}
            <div className="bg-[#1a1a1a] border border-[#333] rounded-md overflow-hidden print:border-black print:bg-white">
              <div className="flex items-center justify-between p-3 border-b border-[#333] print:border-black">
                <h2 className="font-semibold text-[#00a8ff] print:text-black">Community Intel</h2>
                <button
                  onClick={() => copyToClipboard(results.communityBrief, "community")}
                  className={`text-xs px-2 py-1 rounded transition-colors print:hidden ${
                    copySuccess === "community"
                      ? "bg-green-600 text-white"
                      : "bg-[#333] text-[#b0b0b0] hover:bg-[#444]"
                  }`}
                >
                  {copySuccess === "community" ? "✓ Copied" : "Copy"}
                </button>
              </div>
              <div
                className="p-4 text-sm prose prose-invert max-w-none print:prose print:text-black"
                dangerouslySetInnerHTML={{ __html: results.communityBrief }}
              />
            </div>

            {/* New Briefing Button */}
            <button
              onClick={resetForm}
              className="w-full py-4 font-semibold rounded-md bg-[#1e1e1e] border border-[#333] text-[#b0b0b0] hover:border-[#00a8ff] hover:text-[#00a8ff] transition-colors print:hidden"
            >
              ← Generate Another Briefing
            </button>
          </div>
        )}
      </main>

      <footer className="mt-auto pt-8 text-[#b0b0b0] text-xs print:hidden">
        <p>WhistlerBrew.com &copy; 2026</p>
      </footer>
    </div>
  );
}
