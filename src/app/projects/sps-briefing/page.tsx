"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SPSBriefing() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

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

  return (
    <div className="min-h-screen flex flex-col items-center p-8">
      <header className="w-full max-w-4xl flex justify-between items-center mb-8">
        <Link href="/projects">
          <Image
            src="/logo.png"
            alt="WhistlerBrew.com"
            width={200}
            height={50}
            priority
            className="max-w-[150px] sm:max-w-[200px] h-auto"
          />
        </Link>
        <Link
          href="/projects"
          className="text-[#b0b0b0] hover:text-[#00a8ff] transition-colors text-sm"
        >
          ← Back to Projects
        </Link>
      </header>

      <main className="w-full max-w-4xl flex-1 flex flex-col items-center justify-center text-center">
        <h1 className="text-3xl font-bold mb-4">SPS Dispatch Briefing App</h1>
        <p className="text-[#b0b0b0] text-lg mb-8">Coming Soon</p>
        <div className="p-8 bg-[#1e1e1e] border border-[#333] rounded-lg max-w-md">
          <p className="text-[#b0b0b0] text-sm leading-relaxed">
            This tool will generate comprehensive dispatch briefings for BC Wildfire deployments,
            including route information, community intelligence, weather data, and KML exports
            for offline mapping.
          </p>
        </div>
      </main>

      <footer className="mt-auto pt-12 text-[#b0b0b0] text-sm">
        <p>WhistlerBrew.com &copy; 2026</p>
      </footer>
    </div>
  );
}
