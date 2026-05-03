"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Space_Grotesk, IBM_Plex_Mono, Inter } from "next/font/google";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Fonts ───────────────────────────────────────────────────────────────────

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"] });
const ibmPlexMono  = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"] });
const inter        = Inter({ subsets: ["latin"], weight: ["400", "500"] });

// ─── Theme constants ──────────────────────────────────────────────────────────

const C = {
  page: "#0f0f0f",
  card: "#1a1a1a",
  border: "#2a2a2a",
  amber: "#f59e0b",
  amberDim: "rgba(245,158,11,0.12)",
  amberBorder: "rgba(245,158,11,0.3)",
  text: "#f5f5f5",
  muted: "#71717a",
  green: "#22c55e",
  red: "#ef4444",
};

const COMPANIES = [
  "Meta","Google","Amazon","Microsoft","Apple","Netflix","Uber","Bloomberg",
];

const LANG_PALETTE = [
  "#f59e0b","#3b82f6","#22c55e","#a855f7","#ef4444",
  "#06b6d4","#f97316","#ec4899","#84cc16","#6366f1",
];

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

// ─── Types ────────────────────────────────────────────────────────────────────

type DifficultyStats  = { solved: number; attempted: number; total: number };
type TopicStat        = { name: string; solved: number; category: string };
type SubmissionEntry  = { title: string; slug: string; timestamp: number; status: string; language: string };
type ContestInfo      = { rating: number; global_rank: number; attended: number; top_percentage: number; history: ContestEntry[] };
type ContestEntry     = { title: string; start: number; rating: number; ranking: number; solved: number; total: number };
type ConsistencyInfo  = { current_streak: number; longest_streak: number; active_days_30: number; active_days_90: number; consistency_score: number; submission_calendar: Record<string, number> };
type LanguageStat     = { language: string; solved: number };

type AnalyticsResponse = {
  username: string;
  difficulty: Record<string, DifficultyStats>;
  topics: TopicStat[];
  strong_topics: TopicStat[];
  weak_topics: TopicStat[];
  consistency: ConsistencyInfo;
  languages: LanguageStat[];
  recent_submissions: SubmissionEntry[];
  contest: ContestInfo | null;
  cached_at: string | null;
};

type WeekPlan = {
  week: number;
  theme: string;
  topics: string[];
  patterns: string[];
  example_problems: string[];
};

type InsightsResponse = {
  summary: string;
  strengths: string[];
  improvements: string[];
  study_plan: WeekPlan[];
  target_company: string | null;
};

// ─── Primitives ───────────────────────────────────────────────────────────────

function Card({ children, fullWidth = false, style }: {
  children: React.ReactNode;
  fullWidth?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        backgroundColor: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 24,
        gridColumn: fullWidth ? "1 / -1" : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: spaceGrotesk.style.fontFamily,
        fontSize: 18,
        fontWeight: 700,
        color: C.text,
        marginBottom: 16,
      }}
    >
      {children}
    </h2>
  );
}

function Skeleton({ h = 16, w = "100%", style }: { h?: number; w?: string | number; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        height: h,
        width: w,
        borderRadius: 6,
        background: "linear-gradient(90deg, #1e1e1e 25%, #2a2a2a 50%, #1e1e1e 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite",
        ...style,
      }}
    />
  );
}

function SkeletonCard({ fullWidth = false, lines = 4 }: { fullWidth?: boolean; lines?: number }) {
  return (
    <Card fullWidth={fullWidth}>
      <Skeleton h={18} w="40%" style={{ marginBottom: 20 }} />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} h={12} w={i % 2 === 0 ? "100%" : "70%"} style={{ marginBottom: 10 }} />
      ))}
    </Card>
  );
}

function ErrorCard({ message, fullWidth = false }: { message: string; fullWidth?: boolean }) {
  return (
    <Card fullWidth={fullWidth}>
      <p style={{ color: C.red, fontFamily: inter.style.fontFamily, fontSize: 14 }}>
        {message}
      </p>
    </Card>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(isoString: string | null): string {
  if (!isoString) return "";
  const diffMs  = Date.now() - new Date(isoString).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60)  return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60)  return `${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24)   return `${diffHr} hour${diffHr !== 1 ? "s" : ""} ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay !== 1 ? "s" : ""} ago`;
}

// ─── Card 1: Hero ─────────────────────────────────────────────────────────────

function HeroCard({
  data,
  refreshing,
  confirmed,
  onRefresh,
}: {
  data: AnalyticsResponse;
  refreshing: boolean;
  confirmed: boolean;
  onRefresh: () => void;
}) {
  const score = data.consistency.consistency_score;
  const badgeColor = score >= 70 ? C.green : score >= 40 ? C.amber : C.red;
  const initial = data.username[0]?.toUpperCase() ?? "?";

  return (
    <Card fullWidth>
      <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        {/* Avatar */}
        <div
          style={{
            width: 64, height: 64, borderRadius: "50%",
            backgroundColor: C.amber,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ fontFamily: spaceGrotesk.style.fontFamily, fontSize: 28, fontWeight: 800, color: C.page }}>
            {initial}
          </span>
        </div>

        {/* Info */}
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: spaceGrotesk.style.fontFamily, fontSize: 28, fontWeight: 800, color: C.text, margin: 0 }}>
            {data.username}
          </h1>
          <p style={{ fontFamily: inter.style.fontFamily, fontSize: 14, color: C.muted, marginTop: 4 }}>
            {data.contest ? `LeetCode Rating: ${Math.round(data.contest.rating)}` : "No contest rating"}
          </p>

          {/* Last updated row */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
            {confirmed ? (
              <span style={{ fontFamily: inter.style.fontFamily, fontSize: 12, color: C.green }}>
                ✓ Updated
              </span>
            ) : (
              <span style={{ fontFamily: inter.style.fontFamily, fontSize: 12, color: C.muted }}>
                Last updated: {timeAgo(data.cached_at)}
              </span>
            )}

            <button
              onClick={onRefresh}
              disabled={refreshing}
              title="LeetCode data is cached for 24h. Click to fetch latest stats."
              style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "3px 10px", borderRadius: 6,
                border: `1px solid ${C.border}`,
                backgroundColor: "transparent",
                color: refreshing ? C.muted : "#a1a1aa",
                fontFamily: inter.style.fontFamily, fontSize: 12,
                cursor: refreshing ? "not-allowed" : "pointer",
                transition: "border-color 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!refreshing) {
                  e.currentTarget.style.borderColor = "#52525b";
                  e.currentTarget.style.color = C.text;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.color = refreshing ? C.muted : "#a1a1aa";
              }}
            >
              <span style={{ display: "inline-block", animation: refreshing ? "spin 0.8s linear infinite" : "none" }}>↻</span>
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: ibmPlexMono.style.fontFamily, fontSize: 22, fontWeight: 600, color: C.amber }}>
              🔥 {data.consistency.current_streak}
            </div>
            <div style={{ fontFamily: inter.style.fontFamily, fontSize: 12, color: C.muted }}>Current Streak</div>
          </div>

          <div
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              backgroundColor: badgeColor,
            }}
          >
            <span style={{ fontFamily: ibmPlexMono.style.fontFamily, fontSize: 14, fontWeight: 600, color: "#0f0f0f" }}>
              {score}/100
            </span>
            <span style={{ fontFamily: inter.style.fontFamily, fontSize: 12, color: "#0f0f0f", marginLeft: 6, opacity: 0.7 }}>
              Consistency
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Card 2: Difficulty ───────────────────────────────────────────────────────

function DifficultyCard({ data }: { data: AnalyticsResponse }) {
  const rows: [string, string, string][] = [
    ["easy",   "Easy",   C.green],
    ["medium", "Medium", C.amber],
    ["hard",   "Hard",   C.red],
  ];

  return (
    <Card style={{ height: "fit-content" }}>
      <CardTitle>Difficulty Breakdown</CardTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {rows.map(([key, label, color]) => {
          const s = data.difficulty[key];
          if (!s) return null;
          const pct = s.total > 0 ? (s.solved / s.total) * 100 : 0;
          return (
            <div key={key}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontFamily: inter.style.fontFamily, fontSize: 13, color, fontWeight: 500 }}>
                  {label}
                </span>
                <span style={{ fontFamily: ibmPlexMono.style.fontFamily, fontSize: 12, color: C.muted }}>
                  {s.solved} solved / {s.attempted} attempted
                </span>
              </div>
              <div style={{ height: 6, backgroundColor: "#2a2a2a", borderRadius: 4, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${pct}%`,
                    backgroundColor: color,
                    borderRadius: 4,
                    transition: "width 0.6s ease",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Card 3: Topic Explorer ───────────────────────────────────────────────────

function TopicExplorerCard({ data }: { data: AnalyticsResponse }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const strongNames = new Set(data.strong_topics.map((t) => t.name));
  const weakNames   = new Set(data.weak_topics.map((t) => t.name));

  const byCategory: Record<string, TopicStat[]> = { advanced: [], intermediate: [], fundamental: [] };
  for (const t of data.topics) {
    byCategory[t.category]?.push(t);
  }

  const maxSolved = Math.max(...data.topics.map((t) => t.solved), 1);

  const sections: [string, string][] = [
    ["advanced", "Advanced"],
    ["intermediate", "Intermediate"],
    ["fundamental", "Fundamental"],
  ];

  const advancedPracticed = (byCategory["advanced"] ?? [])
    .sort((a, b) => b.solved - a.solved)
    .slice(0, 10);

  return (
    <Card>
      <CardTitle>Topic Explorer</CardTitle>

      {/* ⚡ Key Patterns — top advanced topics, shown first */}
      {advancedPracticed.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{
            fontFamily: inter.style.fontFamily,
            fontSize: 12,
            fontWeight: 600,
            color: C.amber,
            margin: "0 0 10px",
            letterSpacing: "0.03em",
          }}>
            ⚡ Key Patterns Practiced
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {advancedPracticed.map((t) => (
              <div key={t.name} style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "7px 12px",
                borderRadius: 6,
                backgroundColor: "#141414",
                borderLeft: `3px solid ${C.amber}`,
              }}>
                <span style={{
                  fontFamily: inter.style.fontFamily,
                  fontSize: 13,
                  fontWeight: 500,
                  color: strongNames.has(t.name) ? C.amber : C.text,
                }}>
                  {t.name}
                </span>
                <span style={{
                  fontFamily: ibmPlexMono.style.fontFamily,
                  fontSize: 11,
                  color: C.muted,
                }}>
                  {t.solved} solved
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collapsible by tier — below Key Patterns */}
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        <p style={{
          fontFamily: inter.style.fontFamily,
          fontSize: 11,
          color: C.muted,
          margin: "0 0 4px",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}>
          Browse by Category
        </p>
        {sections.map(([cat, label]) => {
          const topics = byCategory[cat] ?? [];
          const isOpen = open[cat] ?? false;
          return (
            <div key={cat} style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
              <button
                onClick={() => setOpen((o) => ({ ...o, [cat]: !o[cat] }))}
                style={{
                  width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 14px", background: "transparent", border: "none", cursor: "pointer",
                }}
              >
                <span style={{ fontFamily: spaceGrotesk.style.fontFamily, fontSize: 13, fontWeight: 600, color: C.text }}>
                  {label}
                </span>
                <span style={{ fontFamily: inter.style.fontFamily, fontSize: 12, color: C.muted }}>
                  {topics.length} topics {isOpen ? "▲" : "▼"}
                </span>
              </button>

              {isOpen && (
                <div style={{ padding: "8px 14px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {topics.map((t) => {
                    const isStrong = strongNames.has(t.name);
                    const isWeak   = weakNames.has(t.name);
                    const barPct   = (t.solved / maxSolved) * 100;
                    return (
                      <div key={t.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span
                          style={{
                            fontFamily: inter.style.fontFamily, fontSize: 12, width: 130, flexShrink: 0,
                            color: isStrong ? C.amber : isWeak ? "#f87171" : C.text,
                          }}
                        >
                          {t.name}
                        </span>
                        <div style={{ flex: 1, height: 5, backgroundColor: "#2a2a2a", borderRadius: 3, overflow: "hidden" }}>
                          <div
                            style={{
                              height: "100%",
                              width: `${barPct}%`,
                              backgroundColor: isStrong ? C.amber : isWeak ? C.red : "#3b82f6",
                              borderRadius: 3,
                            }}
                          />
                        </div>
                        <span style={{ fontFamily: ibmPlexMono.style.fontFamily, fontSize: 11, color: C.muted, width: 28, textAlign: "right" }}>
                          {t.solved}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Card 4: Streak & Heatmap ─────────────────────────────────────────────────

function StreakCard({ data }: { data: AnalyticsResponse }) {
  const { current_streak, longest_streak, submission_calendar } = data.consistency;

  console.log("[StreakCard] consistency:", data.consistency);

  // 53 weeks × 7 days = 371 cells, ending today
  const WEEKS = 53;
  const DAYS  = 7;
  const TOTAL = WEEKS * DAYS;

  // Anchor: today at midnight UTC
  const todayUTC = new Date();
  todayUTC.setUTCHours(0, 0, 0, 0);

  // Build one Date per cell (oldest → newest, row-major: col=week, row=weekday)
  // Cell 0 is the oldest day, cell TOTAL-1 is today.
  const cells: { date: Date; count: number; ts: number }[] = [];
  for (let i = TOTAL - 1; i >= 0; i--) {
    const d = new Date(todayUTC);
    d.setUTCDate(todayUTC.getUTCDate() - i);
    const ts = Math.floor(d.getTime() / 1000); // midnight UTC epoch
    const count = submission_calendar?.[String(ts)] ?? 0;
    cells.push({ date: d, count, ts });
  }

  function cellColor(count: number): string {
    if (count === 0) return "#1e1e1e";
    if (count <= 2)  return "#92400e";
    if (count <= 5)  return "#d97706";
    return C.amber;
  }

  // Month labels: find the first cell in each month and record which column it falls in
  const monthLabels: { label: string; col: number }[] = [];
  let lastMonth = -1;
  cells.forEach((cell, i) => {
    const col = Math.floor(i / DAYS);
    const month = cell.date.getUTCMonth();
    if (month !== lastMonth) {
      monthLabels.push({
        label: cell.date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
        col,
      });
      lastMonth = month;
    }
  });

  const CELL = 12;
  const GAP  = 3;
  const STEP = CELL + GAP;

  return (
    <Card>
      <CardTitle>Streak & Activity</CardTitle>

      {/* Streak numbers */}
      <div style={{ display: "flex", gap: 32, marginBottom: 20 }}>
        {([
          ["Current Streak", `🔥 ${current_streak}d`],
          ["Longest Streak", `⚡ ${longest_streak}d`],
        ] as [string, string][]).map(([label, val]) => (
          <div key={label}>
            <div style={{ fontFamily: ibmPlexMono.style.fontFamily, fontSize: 28, fontWeight: 600, color: C.amber }}>
              {val}
            </div>
            <div style={{ fontFamily: inter.style.fontFamily, fontSize: 12, color: C.muted }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Heatmap — fits card width, no scrollbar */}
      <div style={{ overflow: "hidden" }}>
        {/* Month labels row */}
        <div style={{ position: "relative", height: 18, marginBottom: 4 }}>
          {monthLabels.map(({ label, col }) => (
            <span
              key={`${label}-${col}`}
              style={{
                position: "absolute",
                left: `calc(${col / WEEKS} * 100%)`,
                fontFamily: inter.style.fontFamily,
                fontSize: 10,
                color: C.muted,
              }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Grid: 7 rows × 53 cols, filled column-by-column (week by week) */}
        <div
          style={{
            display: "grid",
            gridTemplateRows: "repeat(7, 1fr)",
            gridTemplateColumns: "repeat(53, 1fr)",
            gridAutoFlow: "column",
            gap: 2,
            width: "100%",
          }}
        >
          {cells.map(({ date, count }, i) => {
            const dateLabel = date.toLocaleDateString("en-US", {
              month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
            });
            return (
              <div
                key={i}
                title={`${dateLabel}: ${count} submission${count !== 1 ? "s" : ""}`}
                style={{
                  borderRadius: 2,
                  backgroundColor: cellColor(count),
                  aspectRatio: "1",
                }}
              />
            );
          })}
        </div>
      </div>

      <p style={{ fontFamily: inter.style.fontFamily, fontSize: 11, color: C.muted, marginTop: 10 }}>
        {data.consistency.active_days_30} active days in last 30 · {data.consistency.active_days_90} in last 90
      </p>
    </Card>
  );
}

// ─── Card 5: Language Donut ───────────────────────────────────────────────────

function LanguageCard({ data }: { data: AnalyticsResponse }) {
  const langs = data.languages;
  const total  = langs.reduce((s, l) => s + l.solved, 0);
  if (total === 0) return <Card><CardTitle>Languages</CardTitle><p style={{ color: C.muted, fontSize: 13 }}>No data</p></Card>;

  const r = 60; const cx = 80; const cy = 80;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const slices = langs.map((l, i) => {
    const pct   = l.solved / total;
    const dash  = pct * circumference;
    const gap   = circumference - dash;
    const slice = { offset, dash, gap, color: LANG_PALETTE[i % LANG_PALETTE.length], pct };
    offset += dash;
    return slice;
  });

  return (
    <Card style={{ height: "fit-content" }}>
      <CardTitle>Languages</CardTitle>
      <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
        <svg width={160} height={160} viewBox="0 0 160 160">
          {/* background ring */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#2a2a2a" strokeWidth={18} />
          {slices.map((s, i) => (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={18}
              strokeDasharray={`${s.dash} ${s.gap}`}
              strokeDashoffset={-s.offset + circumference / 4}
              style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }}
            />
          ))}
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
            style={{ fontFamily: ibmPlexMono.style.fontFamily, fontSize: 14, fontWeight: 600, fill: C.text }}>
            {total}
          </text>
          <text x={cx} y={cy + 16} textAnchor="middle"
            style={{ fontFamily: inter.style.fontFamily, fontSize: 10, fill: C.muted }}>
            solved
          </text>
        </svg>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {langs.map((l, i) => (
            <div key={l.language} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: LANG_PALETTE[i % LANG_PALETTE.length], flexShrink: 0 }} />
              <span style={{ fontFamily: ibmPlexMono.style.fontFamily, fontSize: 13, color: C.text, minWidth: 72 }}>
                {l.language}
              </span>
              <span style={{ fontFamily: ibmPlexMono.style.fontFamily, fontSize: 12, color: C.muted }}>
                {l.solved} · {Math.round((l.solved / total) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ─── Card 6: Recent Submissions ───────────────────────────────────────────────

function SubmissionsCard({ data }: { data: AnalyticsResponse }) {
  return (
    <Card style={{ height: "100%" }}>
      <CardTitle>Recent Submissions</CardTitle>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: inter.style.fontFamily, fontSize: 13 }}>
          <thead>
            <tr>
              {["Problem", "Language", "Status", "Date"].map((h) => (
                <th key={h} style={{ textAlign: "left", color: C.muted, fontWeight: 500, paddingBottom: 10, paddingRight: 16, whiteSpace: "nowrap" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.recent_submissions.map((s, i) => {
              const date = new Date(s.timestamp * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });
              const accepted = s.status === "Accepted";
              return (
                <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ paddingTop: 10, paddingBottom: 10, paddingRight: 16 }}>
                    <a
                      href={`https://leetcode.com/problems/${s.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: C.text, textDecoration: "none" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = C.amber)}
                      onMouseLeave={(e) => (e.currentTarget.style.color = C.text)}
                    >
                      {s.title}
                    </a>
                  </td>
                  <td style={{ paddingTop: 10, paddingBottom: 10, paddingRight: 16, color: C.muted }}>{s.language}</td>
                  <td style={{ paddingTop: 10, paddingBottom: 10, paddingRight: 16 }}>
                    <span
                      style={{
                        padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500,
                        backgroundColor: accepted ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                        color: accepted ? C.green : C.red,
                      }}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td style={{ paddingTop: 10, paddingBottom: 10, color: C.muted, whiteSpace: "nowrap" }}>{date}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ─── Card 7: Contest Stats ────────────────────────────────────────────────────

function ContestCard({ data }: { data: AnalyticsResponse }) {
  const c = data.contest;

  if (!c) {
    return (
      <Card>
        <CardTitle>Contest Stats</CardTitle>
        <p style={{ fontFamily: inter.style.fontFamily, fontSize: 14, color: C.muted }}>
          No contest history yet.
        </p>
      </Card>
    );
  }

  const chartData = c.history.map((h) => ({
    name: h.title.replace("Weekly Contest ", "WC ").replace("Biweekly Contest ", "BWC "),
    rating: Math.round(h.rating),
  }));

  return (
    <Card>
      <CardTitle>Contest Stats</CardTitle>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 24 }}>
        {[
          ["Rating", Math.round(c.rating)],
          ["Global Rank", `#${c.global_rank.toLocaleString()}`],
          ["Attended", c.attended],
          ["Top", `${c.top_percentage}%`],
        ].map(([label, val]) => (
          <div key={label as string}>
            <div style={{ fontFamily: ibmPlexMono.style.fontFamily, fontSize: 24, fontWeight: 600, color: C.amber }}>
              {val}
            </div>
            <div style={{ fontFamily: inter.style.fontFamily, fontSize: 12, color: C.muted }}>{label}</div>
          </div>
        ))}
      </div>

      {chartData.length > 1 && (
        <div style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="name" stroke={C.muted} tick={{ fontSize: 10, fill: C.muted }} />
              <YAxis stroke={C.muted} tick={{ fontSize: 10, fill: C.muted }} domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: C.muted }}
                itemStyle={{ color: C.amber }}
              />
              <Line type="monotone" dataKey="rating" stroke={C.amber} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

// ─── Card 8: AI Coaching ──────────────────────────────────────────────────────

function CoachingCard({
  insights,
  insightsError,
  insightsLoading,
  username,
  initialCompany,
  onRegenerate,
}: {
  insights: InsightsResponse | null;
  insightsError: boolean;
  insightsLoading: boolean;
  username: string;
  initialCompany: string;
  onRegenerate: (company: string) => void;
}) {
  const [selectedCompany, setSelectedCompany] = useState(initialCompany);

  return (
    <Card fullWidth>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <h2 style={{ fontFamily: spaceGrotesk.style.fontFamily, fontSize: 16, fontWeight: 700, color: C.text, margin: 0 }}>
          AI Coaching
        </h2>
        {insights?.target_company && (
          <span
            style={{
              padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600,
              backgroundColor: C.amberDim, border: `1px solid ${C.amberBorder}`,
              color: C.amber, fontFamily: inter.style.fontFamily,
            }}
          >
            Tailored for {insights.target_company.charAt(0).toUpperCase() + insights.target_company.slice(1)}
          </span>
        )}
      </div>

      {/* Loading spinner */}
      {insightsLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Skeleton h={14} w="100%" />
          <Skeleton h={14} w="85%" />
          <Skeleton h={14} w="90%" style={{ marginTop: 8 }} />
        </div>
      )}

      {/* Error */}
      {insightsError && !insightsLoading && (
        <p style={{ fontFamily: inter.style.fontFamily, fontSize: 14, color: C.red }}>
          Could not load AI insights. Try regenerating below.
        </p>
      )}

      {/* Content */}
      {insights && !insightsLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <p style={{ fontFamily: inter.style.fontFamily, fontSize: 14, color: "#d4d4d8", lineHeight: 1.7, margin: 0 }}>
            {insights.summary}
          </p>

          {/* Strengths + Improvements */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <h3 style={{ fontFamily: spaceGrotesk.style.fontFamily, fontSize: 13, fontWeight: 700, color: C.green, marginBottom: 10 }}>
                Strengths
              </h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                {insights.strengths.map((s, i) => (
                  <li key={i} style={{ fontFamily: inter.style.fontFamily, fontSize: 13, color: "#d4d4d8", display: "flex", gap: 8 }}>
                    <span style={{ color: C.green, flexShrink: 0 }}>✓</span> {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 style={{ fontFamily: spaceGrotesk.style.fontFamily, fontSize: 13, fontWeight: 700, color: C.amber, marginBottom: 10 }}>
                Improvements
              </h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                {insights.improvements.map((s, i) => (
                  <li key={i} style={{ fontFamily: inter.style.fontFamily, fontSize: 13, color: "#d4d4d8", display: "flex", gap: 8 }}>
                    <span style={{ color: C.amber, flexShrink: 0 }}>→</span> {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Study Plan */}
          <div>
            <h3 style={{ fontFamily: spaceGrotesk.style.fontFamily, fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>
              4-Week Study Plan
            </h3>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 16,
            }}>
              {insights.study_plan.map((week) => (
                <div
                  key={week.week}
                  style={{
                    backgroundColor: "#252525",
                    borderRadius: 10,
                    borderLeft: `3px solid ${C.amber}`,
                    padding: "18px 20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                  }}
                >
                  {/* Header */}
                  <div>
                    <p style={{
                      fontFamily: inter.style.fontFamily,
                      fontSize: 11,
                      fontWeight: 600,
                      color: C.amber,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      margin: "0 0 4px",
                    }}>
                      Week {week.week}
                    </p>
                    <p style={{
                      fontFamily: spaceGrotesk.style.fontFamily,
                      fontSize: 16,
                      fontWeight: 700,
                      color: C.text,
                      margin: 0,
                    }}>
                      {week.theme}
                    </p>
                  </div>

                  {/* Topics — small amber outlined chips */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {week.topics.map((t) => (
                      <span key={t} style={{
                        padding: "2px 8px",
                        borderRadius: 999,
                        fontSize: 11,
                        border: `1px solid ${C.amberBorder}`,
                        color: C.amber,
                        fontFamily: inter.style.fontFamily,
                        opacity: 0.85,
                      }}>
                        {t}
                      </span>
                    ))}
                  </div>

                  {/* Patterns — dominant section */}
                  <div>
                    <p style={{
                      fontFamily: inter.style.fontFamily,
                      fontSize: 12,
                      fontWeight: 600,
                      color: C.amber,
                      margin: "0 0 8px",
                      letterSpacing: "0.03em",
                    }}>
                      ⚡ Patterns
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {week.patterns.map((p) => (
                        <div key={p} style={{
                          padding: "8px 12px",
                          borderRadius: 6,
                          backgroundColor: "#1a1a1a",
                          borderLeft: `3px solid ${C.amber}`,
                          fontFamily: ibmPlexMono.style.fontFamily,
                          fontSize: 13,
                          fontWeight: 500,
                          color: C.amber,
                        }}>
                          {p}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Practice problems — with divider */}
                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                    <p style={{
                      fontFamily: inter.style.fontFamily,
                      fontSize: 11,
                      color: C.muted,
                      margin: "0 0 7px",
                    }}>
                      Practice:
                    </p>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 5 }}>
                      {week.example_problems.map((prob) => (
                        <li key={prob} style={{
                          fontFamily: ibmPlexMono.style.fontFamily,
                          fontSize: 13,
                          color: "#a1a1aa",
                          display: "flex",
                          gap: 8,
                          alignItems: "baseline",
                        }}>
                          <span style={{ color: C.amber, flexShrink: 0, fontSize: 11 }}>→</span>
                          {prob}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Regenerate controls */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 28, flexWrap: "wrap" }}>
        <select
          value={selectedCompany}
          onChange={(e) => setSelectedCompany(e.target.value)}
          disabled={insightsLoading}
          style={{
            backgroundColor: "#111", border: `1px solid ${C.border}`, borderRadius: 8,
            color: C.text, padding: "8px 12px", fontSize: 13,
            fontFamily: inter.style.fontFamily, cursor: "pointer",
          }}
        >
          <option value="">No company target</option>
          {COMPANIES.map((co) => (
            <option key={co} value={co.toLowerCase()}>{co}</option>
          ))}
        </select>

        <button
          onClick={() => onRegenerate(selectedCompany)}
          disabled={insightsLoading}
          style={{
            padding: "8px 20px", borderRadius: 8, border: "none", cursor: insightsLoading ? "not-allowed" : "pointer",
            backgroundColor: insightsLoading ? "#4a4a4a" : C.amber,
            color: insightsLoading ? C.muted : C.page,
            fontFamily: inter.style.fontFamily, fontSize: 13, fontWeight: 600,
          }}
        >
          {insightsLoading ? "Generating…" : "Regenerate Plan"}
        </button>
      </div>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DashboardClient() {
  const searchParams  = useSearchParams();
  const username      = searchParams.get("username") ?? "";
  const companyParam  = searchParams.get("company") ?? "";

  const [analytics,       setAnalytics]       = useState<AnalyticsResponse | null>(null);
  const [analyticsError,  setAnalyticsError]  = useState(false);
  const [analyticsLoading,setAnalyticsLoading]= useState(true);

  const [insights,        setInsights]        = useState<InsightsResponse | null>(null);
  const [insightsError,   setInsightsError]   = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(true);

  const [refreshing,  setRefreshing]  = useState(false);
  const [confirmed,   setConfirmed]   = useState(false);

  const fetchAnalytics = (user: string) => {
    return axios
      .get<AnalyticsResponse>(`${API}/analyze/${user}`)
      .then((r) => {
        console.log("consistency:", r.data.consistency);
        console.log("raw calendar:", r.data.consistency?.submission_calendar);
        setAnalytics(r.data);
        setAnalyticsError(false);
      })
      .catch(() => setAnalyticsError(true));
  };

  const fetchInsights = (user: string, company: string) => {
    setInsightsLoading(true);
    setInsightsError(false);
    axios
      .post<InsightsResponse>(`${API}/insights/${user}`, {
        target_company: company || null,
      })
      .then((r) => setInsights(r.data))
      .catch(() => setInsightsError(true))
      .finally(() => setInsightsLoading(false));
  };

  const handleRefresh = () => {
    if (!username || refreshing) return;
    setRefreshing(true);
    setConfirmed(false);
    // Bust cache, then re-fetch both endpoints in parallel
    axios.delete(`${API}/cache/${username}`).finally(() => {
      Promise.all([
        fetchAnalytics(username),
        new Promise<void>((resolve) => {
          axios
            .post<InsightsResponse>(`${API}/insights/${username}`, {
              target_company: companyParam || null,
            })
            .then((r) => { setInsights(r.data); setInsightsError(false); })
            .catch(() => setInsightsError(true))
            .finally(() => { setInsightsLoading(false); resolve(); });
        }),
      ]).finally(() => {
        setRefreshing(false);
        setConfirmed(true);
        setTimeout(() => setConfirmed(false), 2000);
      });
    });
  };

  useEffect(() => {
    if (!username) return;
    if (!API) {
      setAnalyticsError(true);
      setAnalyticsLoading(false);
      setInsightsLoading(false);
      return;
    }

    // Parallel fetch
    fetchAnalytics(username).finally(() => setAnalyticsLoading(false));
    fetchInsights(username, companyParam);
  }, [username]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keyframes injected once ───────────────────────────────────────────────
  const injected = useRef(false);
  useEffect(() => {
    if (injected.current) return;
    injected.current = true;
    const style = document.createElement("style");
    style.textContent = `
      @keyframes shimmer {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }
      @media (max-width: 1024px) {
        .lp-3col { grid-template-columns: 1fr 1fr !important; }
        .lp-3col > div:nth-child(3) { grid-column: 1 / -1; }
      }
      @media (max-width: 768px) {
        .lp-3col { grid-template-columns: 1fr !important; }
        .lp-3col > div:nth-child(3) { grid-column: unset; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  // ── Missing env banner ────────────────────────────────────────────────────
  if (!API) {
    return (
      <main style={{ minHeight: "100vh", backgroundColor: C.page, padding: 32 }}>
        <div style={{
          backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: 10, padding: "14px 20px",
        }}>
          <p style={{ fontFamily: inter.style.fontFamily, fontSize: 14, color: C.red, margin: 0 }}>
            <strong>NEXT_PUBLIC_API_BASE_URL</strong> is not set. Add it to your <code>.env</code> file and restart the dev server.
          </p>
        </div>
      </main>
    );
  }

  const pageStyle: React.CSSProperties = {
    minHeight: "100vh",
    backgroundColor: C.page,
    padding: "32px 24px",
    fontFamily: inter.style.fontFamily,
  };

  const wrap: React.CSSProperties = {
    maxWidth: 1200,
    margin: "0 auto",
    opacity: refreshing ? 0.6 : 1,
    transition: "opacity 0.2s",
  };

  const col: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    minWidth: 0,
  };

  return (
    <main style={pageStyle}>
      {/* Back link */}
      <div style={{ maxWidth: 1200, margin: "0 auto 24px" }}>
        <a
          href="/"
          style={{ fontFamily: inter.style.fontFamily, fontSize: 13, color: C.muted, textDecoration: "none" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = C.amber)}
          onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
        >
          ← Back
        </a>
      </div>

      <div style={wrap}>
        {/* Card 1: Hero — full width */}
        <div style={{ marginBottom: 16 }}>
          {analyticsLoading
            ? <SkeletonCard fullWidth lines={2} />
            : analyticsError
              ? <ErrorCard fullWidth message="Failed to load profile. The LeetCode API may be unavailable." />
              : analytics && (
                  <HeroCard
                    data={analytics}
                    refreshing={refreshing}
                    confirmed={confirmed}
                    onRefresh={handleRefresh}
                  />
                )
          }
        </div>

        {/* 3-column grid */}
        <div className="lp-3col" style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 16,
          alignItems: "start",
        }}>
          {/* Column 1: Difficulty · Languages · Contest */}
          <div style={col}>
            {analyticsLoading
              ? <SkeletonCard lines={3} />
              : analyticsError
                ? <ErrorCard message="Failed to load difficulty data." />
                : analytics && <DifficultyCard data={analytics} />
            }
            {analyticsLoading
              ? <SkeletonCard lines={4} />
              : analyticsError
                ? <ErrorCard message="Failed to load language data." />
                : analytics && <LanguageCard data={analytics} />
            }
            {analyticsLoading
              ? <SkeletonCard lines={4} />
              : analyticsError
                ? <ErrorCard message="Failed to load contest data." />
                : analytics && <ContestCard data={analytics} />
            }
          </div>

          {/* Column 2: Streak · Topic Explorer */}
          <div style={col}>
            {analyticsLoading
              ? <SkeletonCard lines={4} />
              : analyticsError
                ? <ErrorCard message="Failed to load streak data." />
                : analytics && <StreakCard data={analytics} />
            }
            {analyticsLoading
              ? <SkeletonCard lines={5} />
              : analyticsError
                ? <ErrorCard message="Failed to load topic data." />
                : analytics && <TopicExplorerCard data={analytics} />
            }
          </div>

          {/* Column 3: Recent Submissions — stretches full column height */}
          <div style={{ ...col, height: "100%" }}>
            {analyticsLoading
              ? <SkeletonCard lines={6} />
              : analyticsError
                ? <ErrorCard message="Failed to load submission data." />
                : analytics && <SubmissionsCard data={analytics} />
            }
          </div>
        </div>

        {/* Card 8: AI Coaching — full width */}
        <div style={{ marginTop: 16 }}>
          <CoachingCard
            insights={insights}
            insightsError={insightsError}
            insightsLoading={insightsLoading}
            username={username}
            initialCompany={companyParam}
            onRegenerate={(company) => fetchInsights(username, company)}
          />
        </div>
      </div>
    </main>
  );
}
