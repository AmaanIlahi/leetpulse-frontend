# LeetPulse — Frontend

Next.js 16 dashboard for AI-powered LeetCode analytics and coaching.

## Architecture

```
Browser
  │
  ├── /                   Landing page  (username + company selector)
  │                             │
  │                             ▼  redirect: /dashboard?username=X&company=Y
  │
  └── /dashboard          DashboardClient.tsx
                               │
                               ├── GET  /analyze/{username}   ──▶ 8 analytics cards
                               │                                   Hero · Difficulty · Topics
                               │                                   Streak · Languages · Submissions
                               │                                   Contest
                               │
                               └── POST /insights/{username}  ──▶ AI Coaching card
                                     body: { target_company }      Summary · Strengths · Improvements
                                                                    4-Week Study Plan (expandable)
                                                                    Regenerate with new company
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Yes | Base URL of the FastAPI backend |

Copy `.env.example` to `.env.local` and set the value:

```bash
cp .env.example .env.local
```

For local development the backend runs on `http://localhost:8000`.
For production set it to your deployed backend URL.

## Local Setup

**Requirements:** Node.js 18+

```bash
# 1. Install dependencies
npm install

# 2. Add environment variables
cp .env.example .env.local
# edit .env.local if your backend runs on a different port

# 3. Start the dev server
npm run dev
```

Open `http://localhost:3000` in your browser.

## Running Both Services Together

```bash
# Terminal 1 — backend
cd leetpulse-backend
source venv/bin/activate
uvicorn app.main:app --reload

# Terminal 2 — frontend
cd leetpulse-frontend
npm run dev
```

## Project Structure

```
app/
├── page.tsx               # Landing page — username input + company selector
├── layout.tsx             # Root layout — Syne + DM Sans fonts, metadata
├── globals.css            # Tailwind import, dark theme CSS variables
└── dashboard/
    ├── page.tsx           # Suspense wrapper (server component)
    └── DashboardClient.tsx  # All 8 dashboard cards (client component)
```

## Dashboard Cards

| Card | Data source |
|---|---|
| Hero | `analytics.username`, `analytics.consistency`, `analytics.contest` |
| Difficulty Breakdown | `analytics.difficulty` |
| Topic Explorer | `analytics.topics`, `analytics.strong_topics`, `analytics.weak_topics` |
| Streak & Activity | `analytics.consistency` |
| Languages | `analytics.languages` |
| Recent Submissions | `analytics.recent_submissions` |
| Contest Stats | `analytics.contest` |
| AI Coaching | `insights.*` — regeneratable per-company without page reload |

## Deployment — Vercel

```bash
# Install Vercel CLI
npm i -g vercel

vercel
# Follow prompts — it auto-detects Next.js

# Set the backend URL in Vercel dashboard:
# Project → Settings → Environment Variables
# NEXT_PUBLIC_API_BASE_URL = https://your-backend.fly.dev
```

Or connect the GitHub repo in the Vercel dashboard for automatic deploys on push.
