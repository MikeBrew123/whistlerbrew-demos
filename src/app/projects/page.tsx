"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Projects() {
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

  const handleLogout = () => {
    sessionStorage.removeItem("whistlerbrew_auth");
    router.push("/");
  };

  if (!isAuthenticated) {
    return null;
  }

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
          <h1 className="text-3xl font-bold">Projects</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 border border-[#333] rounded-md text-[#b0b0b0] hover:border-[#00a8ff] hover:text-[#00a8ff] transition-colors text-sm"
          >
            Logout
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Link
            href="/projects/sps-briefing"
            className="block p-6 bg-[#1e1e1e] border border-[#333] rounded-lg hover:border-[#00a8ff] transition-colors group"
          >
            <span className="inline-block px-2 py-1 text-xs font-semibold bg-[#00a8ff] rounded mb-3">
              NEW
            </span>
            <h2 className="text-xl font-semibold mb-2 group-hover:text-[#00a8ff] transition-colors">
              SPS Dispatch Briefing
            </h2>
            <p className="text-[#b0b0b0] text-sm">
              Generate dispatch briefings for BC Wildfire deployments with route info, community intel, and KML exports.
            </p>
          </Link>

          <div className="p-6 bg-[#1e1e1e] border border-[#333] rounded-lg opacity-50">
            <span className="inline-block px-2 py-1 text-xs font-semibold bg-[#333] rounded mb-3">
              COMING SOON
            </span>
            <h2 className="text-xl font-semibold mb-2">More Projects</h2>
            <p className="text-[#b0b0b0] text-sm">
              Additional tools and demos will be added here.
            </p>
          </div>
        </div>
      </main>

      <footer className="mt-auto pt-12 text-[#b0b0b0] text-sm">
        <p>WhistlerBrew.com &copy; 2026</p>
      </footer>
    </div>
  );
}
