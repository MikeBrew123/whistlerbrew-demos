"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

const CORRECT_PASSWORD = "Wildfire2026";

export default function Home() {
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = () => {
    if (password === CORRECT_PASSWORD) {
      sessionStorage.setItem("whistlerbrew_auth", "true");
      router.push("/projects");
    } else {
      setError("Incorrect password, try again");
      setPassword("");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <header className="mb-8">
        <Image
          src="/logo.png"
          alt="WhistlerBrew.com"
          width={400}
          height={100}
          priority
          className="max-w-[280px] sm:max-w-[400px] h-auto"
        />
      </header>

      <main className="max-w-xl">
        <p className="text-[#b0b0b0] text-lg mb-8 leading-relaxed">
          Test site for Brew&apos;s projects in AI, Automation, and Data Management
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#00a8ff] hover:bg-[#0090e0] text-white font-semibold py-3 px-8 rounded-md transition-colors"
        >
          Enter Projects
        </button>
      </main>

      <footer className="mt-auto pt-12 text-[#b0b0b0] text-sm">
        <p>WhistlerBrew.com &copy; 2026</p>
      </footer>

      {showModal && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="bg-[#1e1e1e] p-10 rounded-xl max-w-md w-[90%] border border-[#333]">
            <h2 className="text-xl font-semibold mb-6">Enter Password</h2>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Password"
              className="w-full p-3 bg-[#2a2a2a] border border-[#333] rounded-md text-white mb-4 focus:outline-none focus:border-[#00a8ff]"
              autoFocus
            />
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => { setShowModal(false); setPassword(""); setError(""); }}
                className="px-6 py-2 border border-[#333] rounded-md text-[#b0b0b0] hover:border-[#00a8ff] hover:text-[#00a8ff] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-6 py-2 bg-[#00a8ff] hover:bg-[#0090e0] rounded-md font-semibold transition-colors"
              >
                Enter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
