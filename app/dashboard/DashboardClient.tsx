"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* =======================
   Types
======================= */

type DifficultyStats = {
  solved: number;
  failed: number;
  untouched: number;
  percentile: number;
};

type SkillTopic = {
  name: string;
  solved: number;
  level: "fundamental" | "intermediate" | "advanced";
};

type FocusTopic = {
  topic: string;
  reason: string;
};

type StudyPlanItem = {
  day: string;
  task: string;
};

type ApiResponse = {
  username: string;
  progress: {
    easy: DifficultyStats;
    medium: DifficultyStats;
    hard: DifficultyStats;
  };
  skills: {
    topics: SkillTopic[];
  };
};

type InsightsResponse = {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  focus_topics: FocusTopic[];
  study_plan: StudyPlanItem[];
};

/* =======================
   Config
======================= */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

/* =======================
   Client Component
======================= */

export default function DashboardClient() {
  const searchParams = useSearchParams();
  const username = searchParams.get("username");

  const [data, setData] = useState<ApiResponse | null>(null);
  const [insights, setInsights] = useState<InsightsResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username || !API_BASE_URL) return;

    setLoading(true);
    setError(null);

    // ---- Analytics API ----
    axios
      .get<ApiResponse>(`${API_BASE_URL}/analyze/${username}`)
      .then((res) => {
        setData(res.data);
      })
      .catch((err) => {
        console.error("Analyze API error:", err);
        setError("Failed to load analytics");
      })
      .finally(() => {
        setLoading(false);
      });

    // ---- Insights API (LLM) ----
    setInsightsLoading(true);
    axios
      .post<InsightsResponse>(`${API_BASE_URL}/insights/${username}`)
      .then((res) => {
        setInsights(res.data);
      })
      .catch((err) => {
        console.error("Insights API error:", err);
      })
      .finally(() => {
        setInsightsLoading(false);
      });
  }, [username]);

  /* =======================
     States
  ======================= */

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-8">
        Loading analytics...
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-8">
        {error ?? "No data available"}
      </main>
    );
  }

  /* =======================
     Chart Data
  ======================= */

  const topTopics = data.skills.topics
    .slice()
    .sort((a, b) => b.solved - a.solved)
    .slice(0, 8);

  /* =======================
     UI
  ======================= */

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-8 space-y-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">
          {data.username}&apos;s LeetCode Stats
        </h1>
        <p className="text-zinc-400">
          Performance analytics with AI-powered insights
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Easy Solved" value={data.progress.easy.solved} />
        <StatCard label="Medium Solved" value={data.progress.medium.solved} />
        <StatCard label="Hard Solved" value={data.progress.hard.solved} />
      </div>

      {/* Topics Chart */}
      <div className="bg-zinc-900 p-6 rounded-xl h-[420px]">
        <h2 className="text-xl font-semibold mb-4">
          Top Problem-Solving Topics
        </h2>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={topTopics} layout="vertical">
            <XAxis type="number" stroke="#a1a1aa" />
            <YAxis
              dataKey="name"
              type="category"
              width={140}
              stroke="#a1a1aa"
            />
            <Tooltip />
            <Bar
              dataKey="solved"
              fill="#3b82f6"
              radius={[0, 6, 6, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* AI Insights */}
      <div className="bg-zinc-900 p-6 rounded-xl">
        <h2 className="text-xl font-semibold mb-4">
          AI-Powered Insights
        </h2>

        {insightsLoading && (
          <p className="text-zinc-400">
            Generating personalized insights using LLMs...
          </p>
        )}

        {insights && (
          <div className="space-y-6">
            <p className="text-zinc-200 leading-relaxed">
              {insights.summary}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2 text-green-400">
                  Strengths
                </h3>
                <ul className="list-disc list-inside space-y-1 text-zinc-300">
                  {insights.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2 text-red-400">
                  Areas to Improve
                </h3>
                <ul className="list-disc list-inside space-y-1 text-zinc-300">
                  {insights.weaknesses.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Focus Topics</h3>
              <div className="space-y-2">
                {insights.focus_topics.map((ft, i) => (
                  <div key={i} className="bg-zinc-800 p-3 rounded">
                    <p className="font-medium">{ft.topic}</p>
                    <p className="text-sm text-zinc-400">
                      {ft.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">4-Day Study Plan</h3>
              <div className="space-y-2">
                {insights.study_plan.map((sp, i) => (
                  <div
                    key={i}
                    className="bg-zinc-800 p-3 rounded flex gap-4"
                  >
                    <span className="text-green-400 font-medium">
                      {sp.day}
                    </span>
                    <span className="text-zinc-300">
                      {sp.task}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

/* =======================
   Components
======================= */

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-zinc-900 p-6 rounded-xl">
      <p className="text-zinc-400">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}
