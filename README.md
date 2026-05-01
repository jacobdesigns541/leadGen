# LeadGen LA

A lead generation web app for sales representatives targeting the Hispanic market in the Los Angeles area. Fetches local businesses via Google Places, scores each one on digital readiness, and surfaces the best opportunities first.

## Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: React (Vite)
- **Database**: SQLite (7-day lead cache via `better-sqlite3`)
- **Deployment**: Render (one-click via `render.yaml`)

## Scoring System (lower = better opportunity)

| Metric | Max Points | Low Score Means… |
|---|---|---|
| Digital Ad Presence | 30 | Business runs no paid Google Ads |
| Competitor Ads | 25 | Few/no competitors are advertising |
| Website Quality | 20 | Site is outdated or missing tracking |
| Reviews | 15 | Few reviews — room to grow |
| Social Media | 10 | No detectable Facebook/Instagram |

**Hispanic Market ZIP bonus:** −5 points for businesses in majority-Hispanic LA ZIP codes.

**Lead tiers:** 🟢 Hot (0–30) · 🟡 Warm (31–60) · 🔴 Low Priority (61–100)

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/jacobdesigns541/leadgen.git
cd leadgen

# Install backend deps
cd backend && npm install && cd ..

# Install frontend deps
cd frontend && npm install && cd ..
```

### 2. Configure environment variables

```bash
cp .env.example .env
# Edit .env and fill in your API keys
```

Required keys:

| Variable | Where to get it |
|---|---|
| `GOOGLE_PLACES_API_KEY` | [Google Cloud Console](https://console.cloud.google.com) — enable **Places API (New)** and **Geocoding API** |
| `SERPER_API_KEY` | [Serper.dev dashboard](https://serper.dev/api-key) |
| `APOLLO_API_KEY` | [Apollo.io developer portal](https://developer.apollo.io) |

### 3. Run locally

```bash
# Terminal 1 — backend (port 5000)
cd backend && npm run dev

# Terminal 2 — frontend (port 3000)
cd frontend && npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Render

1. Push this repo to GitHub.
2. Go to [render.com](https://render.com) → **New** → **Blueprint**.
3. Connect your GitHub repo — Render will detect `render.yaml` and create both services automatically.
4. In the Render dashboard, set environment variables for `leadgen-la-backend`:
   - `GOOGLE_PLACES_API_KEY`
   - `SERP_API_KEY`
   - `APOLLO_API_KEY`
5. Deploy. The frontend static site will proxy `/api` requests to the backend automatically.

> **Note on the free tier:** Render free web services spin down after inactivity. The first search after a period of dormancy may take ~30 seconds while the service wakes up.

## Project Structure

```
leadgen/
├── backend/
│   ├── src/
│   │   ├── index.js              # Express server entry point
│   │   ├── routes/
│   │   │   └── leads.js          # POST /api/leads/search
│   │   ├── services/
│   │   │   ├── googlePlaces.js   # Google Places API (New)
│   │   │   ├── serpApi.js        # SerpAPI — ads + social detection
│   │   │   ├── websiteChecker.js # Website quality analysis
│   │   │   ├── apolloApi.js      # Apollo contact enrichment
│   │   │   └── scoringEngine.js  # Composite scoring + pitch notes
│   │   └── db/
│   │       └── database.js       # SQLite cache (7-day TTL)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx               # Root component + state
│   │   ├── components/
│   │   │   ├── Header.jsx
│   │   │   ├── SearchPanel.jsx   # Search form + quick filters
│   │   │   ├── SummaryBar.jsx    # Results count + tier breakdown
│   │   │   ├── ScoreGuide.jsx    # Score legend
│   │   │   ├── LeadCard.jsx      # Individual lead card
│   │   │   ├── LoadingState.jsx  # Skeleton loading UI
│   │   │   └── EmptyState.jsx
│   │   ├── utils/
│   │   │   ├── api.js            # API client
│   │   │   └── scoring.js        # Color helpers + metric definitions
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── .env.example
├── .gitignore
├── render.yaml
└── README.md
```

## Supported Business Categories

Auto Dealership · Immigration Law · Family Law · Dental/Orthodontic · Tax/Accounting · Insurance Broker · Home Services/HVAC · Event Venue/Quinceañera · Restaurant Group · Real Estate · Notary Services

## Hispanic Market ZIP Codes

The following LA-area ZIP codes receive a −5 bonus (lower score = higher priority):

`90022, 90023, 90033, 90063, 90255, 90270, 90280, 90262, 90044, 90003, 90011, 90058, 90640, 91030, 91733, 91401, 91405, 91340, 90650, 90706, 90723`
