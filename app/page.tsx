"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const COMPANIES = [
  "Meta",
  "Google",
  "Amazon",
  "Microsoft",
  "Apple",
  "Netflix",
  "Uber",
  "Bloomberg",
];

export default function Home() {
  const [username, setUsername] = useState("");
  const [company, setCompany] = useState("");
  const router = useRouter();

  const handleAnalyze = () => {
    if (!username.trim()) return;
    const params = new URLSearchParams({ username: username.trim() });
    if (company) params.set("company", company.toLowerCase());
    router.push(`/dashboard?${params.toString()}`);
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: `
          radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)`,
        backgroundSize: "28px 28px",
        backgroundColor: "#0f0f0f",
      }}
    >
      <div className="w-full max-w-md flex flex-col items-center gap-8 text-center">

        {/* Eyebrow */}
        <span
          className="text-xs font-medium tracking-widest uppercase px-3 py-1 rounded-full border"
          style={{
            color: "#f59e0b",
            borderColor: "rgba(245,158,11,0.3)",
            backgroundColor: "rgba(245,158,11,0.06)",
            fontFamily: "var(--font-body)",
          }}
        >
          AI-Powered LeetCode Analytics
        </span>

        {/* Heading */}
        <div className="flex flex-col gap-3">
          <h1
            className="text-7xl font-extrabold leading-none tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "#f5f5f5" }}
          >
            LeetPulse
          </h1>
          <p
            className="text-lg"
            style={{ fontFamily: "var(--font-body)", color: "#a1a1aa" }}
          >
            Understand your strengths, fix your gaps, get hired.
          </p>
        </div>

        {/* Form */}
        <div className="w-full flex flex-col gap-3">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            placeholder="LeetCode username"
            className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all"
            style={{
              backgroundColor: "#1a1a1a",
              border: "1px solid #2a2a2a",
              color: "#f5f5f5",
              fontFamily: "var(--font-body)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.border = "1px solid #f59e0b";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(245,158,11,0.15)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.border = "1px solid #2a2a2a";
              e.currentTarget.style.boxShadow = "none";
            }}
          />

          {/* Company selector */}
          <div className="flex flex-col gap-1.5 text-left">
            <label
              className="text-xs"
              style={{ color: "#71717a", fontFamily: "var(--font-body)" }}
            >
              Targeting a company? (optional)
            </label>
            <select
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all appearance-none cursor-pointer"
              style={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #2a2a2a",
                color: company ? "#f5f5f5" : "#71717a",
                fontFamily: "var(--font-body)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.border = "1px solid #f59e0b";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(245,158,11,0.15)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.border = "1px solid #2a2a2a";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <option value="">None</option>
              {COMPANIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Submit button */}
          <button
            onClick={handleAnalyze}
            disabled={!username.trim()}
            className="w-full py-3 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: "#f59e0b",
              color: "#0f0f0f",
              fontFamily: "var(--font-body)",
            }}
            onMouseEnter={(e) => {
              if (username.trim())
                e.currentTarget.style.backgroundColor = "#fbbf24";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#f59e0b";
            }}
          >
            Analyze
          </button>
        </div>

      </div>
    </main>
  );
}
