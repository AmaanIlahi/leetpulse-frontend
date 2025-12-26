"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const [username, setUsername] = useState<string>("");
  const router = useRouter();

  const handleAnalyze = () => {
    if (!username) return;
    router.push(`/dashboard?username=${username}`);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-4xl font-bold text-center">LeetPulse</h1>
        <p className="text-center text-zinc-400">
          LeetCode analytics at a glance
        </p>

        <input
          type="text"
          className="w-full p-3 rounded-lg bg-zinc-900 border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Enter LeetCode username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <button
          onClick={handleAnalyze}
          disabled={!username}
          className="w-full bg-green-500 text-black py-3 rounded-lg font-semibold disabled:opacity-40"
        >
          Analyze
        </button>
      </div>
    </main>
  );
}
