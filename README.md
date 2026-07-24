<div align="center">

# TruthLens

**AI-powered news bias detector, credibility scorer & manipulation analyzer**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-truthlens--ecru.vercel.app-c0392b?style=for-the-badge)](https://truthlens-ecru.vercel.app)
[![API Docs](https://img.shields.io/badge/API%20Docs-Render-2c3e50?style=for-the-badge)](https://truthlens-uopu.onrender.com/docs)
[![License](https://img.shields.io/badge/License-MIT-27ae60?style=for-the-badge)](#)

Paste any news article URL. Get bias score, credibility rating, manipulation alerts, fact checks, and live corroboration from independent sources — in under 15 seconds. Backed by AllSides, Ad Fontes Media & Media Bias/Fact Check published research.

**"We don't tell you what to think. We give you the tools to think for yourself."**

</div>

---

## The Problem

74% of people who share misinformation do so unknowingly. During active conflicts — Gaza, Ukraine, Kashmir — information becomes a weapon. Existing fact-checkers take days, cover only viral claims, and have no manipulation detection. TruthLens solves this in seconds, for any article, for free.

---

## What TruthLens Does

| Feature | What it shows |
|---|---|
| **Verdict** | Instant ✓ / ⚠ / ✗ — Trustworthy, Caution, or Unreliable |
| **Bias Detection** | Specific label (Pro-Palestine, Left-leaning, Neutral etc.) with confidence % and quoted evidence from the article |
| **Credibility Score** | 0–100 anchored to AllSides + MBFC + Ad Fontes Media published ratings |
| **Manipulation Analysis** | Flagged phrases by type: Fear, Anger, Urgency, Dehumanization, Propaganda |
| **Fact Check — Live Corroboration** | Each claim checked against real-time independent news from Reuters, BBC, AP |
| **AI Summary** | 3-sentence plain English explanation + what context is missing |
| **Evidence & References** | Clickable AllSides / MBFC / Ad Fontes links proving every score |
| **Sentiment & Emotion Analysis** | Positive/negative/neutral % + 7 emotion scores from ML analysis |
| **Media Fingerprint** | 6-dimension radar chart derived entirely from analysis data |
| **Multi-Source Compare** | Same story, 2–4 sources, side-by-side bias and framing differences |
| **PDF Export** | Professional branded report with all analysis data |
| **Chrome Extension** | Analyze any article without leaving the page |
| **History** | All past analyses stored in database with search and filter |

---

## Tech Stack

```
Frontend     React 18 + Vite + TailwindCSS + Framer Motion  →  Vercel
Backend      FastAPI Python 3.11 + Uvicorn                  →  Render
Database     PostgreSQL (Render)                             →  Render
Primary AI   Groq API — Llama 3.3 70B Versatile
ML Analysis  Groq linguistic analysis (sentiment, emotion, political lean)
Scraping     BeautifulSoup4 + Jina Reader API + CORS proxy fallback
News         NewsAPI.org (related articles + live corroboration)
```

---

## Article Extraction — 4-Layer Fallback

Never fails. Always returns a result.

| Layer | Method | What it handles |
|---|---|---|
| 1 | Direct fetch — 6 user agents + 30 site-specific CSS selectors | Most news sites |
| 2 | Jina Reader API (`r.jina.ai`) — renders JavaScript | Bot-protected & JS-heavy sites |
| 3 | Browser-side fetch via CORS proxy | Sites that block server IPs |
| 4 | Groq source-reputation analysis from URL + title | Paywalled & fully blocked sites |

---

## Source Credibility Database

50+ outlets with ratings from three independent research organisations:

| Organisation | What they rate |
|---|---|
| [AllSides](https://www.allsides.com/media-bias/ratings) | Left / Lean Left / Center / Lean Right / Right |
| [Ad Fontes Media](https://adfontesmedia.com) | Reliability vs political bias (2D chart) |
| [Media Bias/Fact Check](https://mediabiasfactcheck.com) | Factual reporting — Very High to Very Low |

Groq scores are anchored to this database **±15 points**. RT cannot score above 37. AP News cannot score below 73. Every score is citable.

**Real examples:**

| Source | Score | Bias |
|---|---|---|
| AP News | 88–92 | Neutral |
| Reuters | 86–90 | Neutral |
| BBC | 79–84 | Center |
| Guardian | 74–79 | Left-leaning |
| Al Jazeera | 58–66 | Pro-Palestine |
| Fox News (opinion) | 38–48 | Right-leaning |
| RT (Russia Today) | 18–26 | Pro-Russia |

---

## Score Reference

### Credibility (0–100)

| Range | Label |
|---|---|
| 80–100 | High — wire agencies, named sources, verifiable data |
| 60–79 | Moderate — quality press with editorial lean |
| 40–59 | Low — partisan outlets, advocacy journalism |
| 20–39 | Very Low — tabloids, partisan blogs |
| 0–19 | Unreliable — state propaganda, known disinformation |

### Bias Labels

`Neutral` · `Center` · `Left-leaning` · `Right-leaning` · `Pro-Israel` · `Pro-Palestine` · `Pro-Russia` · `Pro-Ukraine` · `Pro-China` · `Pro-India` · `Pro-US` · `Pro-Iran` · `Nationalist`

### Manipulation (0–100)

| Range | Level |
|---|---|
| 0–20 | Low — dry factual language |
| 21–45 | Low-Medium — some emotional framing |
| 46–65 | Medium — advocacy journalism |
| 66–100 | High — propaganda-level manipulation |

---

## API Endpoints

Base URL: `https://truthlens-uopu.onrender.com`
Interactive docs: `/docs`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/analyze` | Analyze article by URL |
| `POST` | `/api/v1/analyze/html` | Analyze by raw HTML (browser-sent) |
| `POST` | `/api/v1/analyze/text` | Analyze pasted article text |
| `POST` | `/api/v1/compare` | Compare 2–4 article URLs |
| `GET` | `/api/v1/history` | Recent analyses |
| `GET` | `/api/v1/analysis/{id}` | Get analysis by ID |
| `DELETE` | `/api/v1/analysis/{id}` | Delete from history |
| `GET` | `/api/v1/stats` | Total analysis count |
| `GET` | `/health` | Health check |

---

## Local Setup

### Prerequisites

- Node.js 18+
- Python 3.11+
- [Groq API key](https://console.groq.com) — free
- PostgreSQL database (local or [Render](https://render.com))
- [NewsAPI key](https://newsapi.org) — optional, for related articles

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Fill in GROQ_API_KEY and DATABASE_URL

uvicorn main:app --reload --port 8000
```

API docs at: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:8000" > .env.local
npm run dev
```

App at: `http://localhost:5173`

---

## Deployment

### Backend → Render

1. Push to GitHub
2. Render → **New Web Service** → connect repo
3. **Root Directory:** `backend`
4. **Runtime:** Python 3.11
5. **Build:** `pip install -r requirements.txt`
6. **Start:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
7. **Environment variables:**
   - `GROQ_API_KEY` — from [console.groq.com](https://console.groq.com)
   - `DATABASE_URL` — Internal URL from your Render PostgreSQL database
   - `NEWS_API_KEY` — optional, from [newsapi.org](https://newsapi.org)
8. Create a **PostgreSQL** database on Render → copy Internal Database URL → set as `DATABASE_URL`

### Frontend → Vercel

1. Vercel → **New Project** → import frontend folder
2. Add env var: `VITE_API_URL=https://your-render-url.onrender.com`
3. Deploy

### Chrome Extension

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select `chrome-extension/` folder
4. Pin to toolbar

---

## Project Structure

```
truthlens/
├── backend/
│   ├── main.py                     # FastAPI app + DB init on startup
│   ├── requirements.txt            # psycopg2-binary, groq, fastapi...
│   ├── render.yaml
│   ├── routers/
│   │   ├── analyze.py              # /analyze, /analyze/html, /analyze/text
│   │   ├── compare.py              # /compare — 4-layer extraction per URL
│   │   └── history.py              # /history, /stats, /analysis/{id}
│   └── services/
│       ├── groq_service.py         # Groq LLM — bias, credibility, facts, ML
│       ├── ml_service.py           # Sentiment, emotion, political lean via Groq
│       ├── scraper.py              # 4-layer article extraction
│       ├── database.py             # PostgreSQL CRUD via psycopg2
│       └── news_service.py         # NewsAPI + claim corroboration
│
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── utils/api.js            # smartAnalyze, analyzeText, compareUrls
│       ├── styles/global.css
│       ├── pages/
│       │   ├── HomePage.jsx        # Landing + URL input + live feed
│       │   ├── ResultPage.jsx      # 9-section analysis result
│       │   ├── ComparePage.jsx     # Multi-source comparison
│       │   └── HistoryPage.jsx     # Past analyses with search + delete
│       └── components/
│           ├── Navbar.jsx
│           ├── LoadingAnalysis.jsx     # 9-step progress animation
│           ├── ErrorBoundary.jsx       # Crash recovery
│           ├── CredibilityRing.jsx     # Animated ring + DB baseline
│           ├── BiasMeter.jsx           # Spectrum bar + evidence quotes
│           ├── ManipulationPanel.jsx   # Flagged phrases + emotion detection
│           ├── LiveCorroboration.jsx   # Claim vs real news side-by-side
│           ├── ELI15Panel.jsx          # AI Summary + missing context
│           ├── TrustEvidence.jsx       # AllSides/MBFC refs + bias evidence
│           ├── MLInsights.jsx          # Sentiment + emotion + political bars
│           ├── MediaFingerprint.jsx    # 6-dimension radar chart
│           ├── RelatedSources.jsx      # Related articles + search fallback
│           └── Skeletons.jsx           # Loading skeleton components
│
└── chrome-extension/
    ├── manifest.json
    ├── popup.html
    ├── popup.js
    └── content.js
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | ✅ Yes | From [console.groq.com](https://console.groq.com) — free |
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string |
| `NEWS_API_KEY` | Optional | From [newsapi.org](https://newsapi.org) — related articles |
| `VITE_API_URL` | Frontend | Your Render backend URL |

---

## How It Works — The Trust Chain

```
URL Input
    ↓
4-Layer Extraction (never fails)
    ↓
Groq Llama 3.3 70B
    ├── Bias label + confidence + quoted evidence
    ├── Credibility score (anchored to AllSides/MBFC/Ad Fontes ±15)
    ├── Manipulation phrases + emotional tone
    ├── Fact-check claims with status
    └── ML scores (sentiment, emotion, political lean)
    ↓
Source Database Cross-reference
    ├── AllSides published rating
    ├── MBFC factual reporting level
    └── Ad Fontes Media classification
    ↓
Live Corroboration (NewsAPI)
    └── Independent news sources per claim
    ↓
Result — 9 sections, every score citable
```

---

## Why TruthLens vs Existing Tools

| | TruthLens | Snopes | Social media labels | MBFC |
|---|---|---|---|---|
| Speed | **Under 15 seconds** | Days to weeks | Hours | Manual |
| Any article | **✓ Any URL** | ~50/day | Viral only | Outlet only |
| Bias detection | **✓** | ✗ | ✗ | ✓ partial |
| Manipulation | **✓** | ✗ | ✗ | ✗ |
| Live corroboration | **✓** | ✓ | ✗ | ✗ |
| Evidence cited | **✓ Clickable** | ✓ | ✗ | ✓ |
| Free | **✓** | ✓ | ✓ | ✓ |

---

## Contributing

```bash
git checkout -b feature/your-feature
git commit -m "feat: description"
git push origin feature/your-feature
```

---

## License

MIT

---

<div align="center">

Built for Social Impact AI Hackathon 2026

[truthlens-ecru.vercel.app](https://truthlens-ecru.vercel.app)

</div>