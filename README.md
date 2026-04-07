<div align="center">

# TruthLens

**AI-powered news bias detector, credibility scorer & manipulation analyzer**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-truthlens.vercel.app-c0392b?style=for-the-badge)](https://truthlens.vercel.app)
[![API](https://img.shields.io/badge/API-truthlens--api.onrender.com-2c3e50?style=for-the-badge)](https://truthlens-api.onrender.com/docs)
[![License](https://img.shields.io/badge/License-MIT-27ae60?style=for-the-badge)](#)

Paste any news article URL. Get bias score, credibility rating, manipulation alerts, and fact checks — in under 15 seconds. Backed by AllSides, Ad Fontes Media & Media Bias/Fact Check published research.

</div>

---

## What TruthLens Does

74% of people who share misinformation do so unknowingly. TruthLens gives everyone the tool to be in the other 26% — free, no signup, any article, anywhere.

| Feature | What it shows |
|---|---|
| **Bias Detection** | Left / Right / Pro-X label with confidence %, evidence quotes from the article |
| **Credibility Score** | 0–100 ring gauge anchored to AllSides + MBFC + Ad Fontes database |
| **Manipulation Analysis** | Flagged phrases by type (Fear / Anger / Urgency / Dehumanization) + emotion scores |
| **Claim vs Evidence** | Expandable fact-check cards — article claim vs AI assessment side by side |
| **AI Summary** | 3-sentence plain English explanation + what context is missing |
| **Evidence & References** | Clickable AllSides / MBFC / Ad Fontes links proving every score |
| **Legal Compliance** | Maps findings to Indian IT Act §66, §69A, IT Rules 2021, CPA 2019 |
| **ML Model Analysis** | Sentiment, 7 emotions, political lean from HuggingFace transformer models |
| **Media Fingerprint** | 6-dimension radar chart derived entirely from analysis data |
| **Multi-Source Compare** | Same story, 2–4 sources, side-by-side bias and word choice differences |
| **PDF Export** | Professional branded report with all analysis data |
| **Share Link** | Unique URL per analysis stored in Supabase |
| **Chrome Extension** | Analyze any article without leaving the page |
| **History** | All past analyses with search, filter, view, delete |

---

## Tech Stack

```
Frontend          React 18 + Vite + TailwindCSS + Framer Motion  →  Vercel
Backend           FastAPI Python 3.11 + Uvicorn                  →  Render
Primary AI        Groq API — Llama 3.3 70B Versatile
ML Models         HuggingFace Inference API (3 transformer models)
Database          Supabase (PostgreSQL + JSONB)
Scraping          BeautifulSoup4 + Jina Reader API + CORS proxy
News              NewsAPI.org (optional)
```

### HuggingFace Models

| Model | Purpose | Training data |
|---|---|---|
| `cardiffnlp/twitter-roberta-base-sentiment-latest` | Sentiment (positive / negative / neutral) | 124M tweets |
| `j-hartmann/emotion-english-distilroberta-base` | 7 emotions (anger, fear, disgust, sadness, surprise, joy, neutral) | 20,000+ texts |
| `valurank/distilroberta-base-political-tweets` | Political lean (left / center / right) | Political tweet dataset |

### Source Credibility Database

50+ outlets rated by three independent research organisations:

- **[AllSides](https://www.allsides.com/media-bias/ratings)** — Left / Lean Left / Center / Lean Right / Right spectrum
- **[Ad Fontes Media](https://adfontesmedia.com)** — 2D reliability vs bias chart
- **[Media Bias/Fact Check](https://mediabiasfactcheck.com)** — Factual reporting rated Very High to Very Low

Groq scores are anchored to this database ±15 points. RT cannot score above 37. AP News cannot score below 73.

---

## Article Extraction — 4-Layer Fallback

| Layer | Method | Coverage |
|---|---|---|
| 1 | Direct fetch with 6 user agents + 30 site-specific CSS selectors | ~60% of sites |
| 2 | [Jina Reader API](https://r.jina.ai) — renders JavaScript, bypasses bot detection | ~25% more |
| 3 | Browser-side fetch via CORS proxy (server never blocked) | ~10% more |
| 4 | Groq source-reputation analysis from URL + title | Always works |

---

## API Endpoints

Base URL: `https://truthlens-api.onrender.com`  
Interactive docs: `/docs`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/analyze` | Analyze article by URL |
| `POST` | `/api/v1/analyze/html` | Analyze by raw HTML (browser-sent) |
| `POST` | `/api/v1/analyze/text` | Analyze pasted article text |
| `POST` | `/api/v1/compare` | Compare 2–4 article URLs |
| `GET`  | `/api/v1/history` | Recent analyses from Supabase |
| `GET`  | `/api/v1/analysis/{id}` | Get analysis by ID |
| `DELETE` | `/api/v1/analysis/{id}` | Delete from history |
| `GET`  | `/api/v1/stats` | Total analysis count |
| `GET`  | `/health` | Health check |

---

## Local Setup

### Prerequisites

- Node.js 18+
- Python 3.11+
- [Groq API key](https://console.groq.com) — free
- [Supabase account](https://supabase.com) — free
- [HuggingFace token](https://huggingface.co/settings/tokens) — optional, enables real ML models
- [NewsAPI key](https://newsapi.org) — optional, for related articles

### 1. Clone & configure backend

```bash
git clone https://github.com/your-username/truthlens.git
cd truthlens/backend

python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
```

Edit `.env`:

```env
GROQ_API_KEY=your_groq_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key
HF_API_KEY=hf_your_token_here        # optional
NEWS_API_KEY=your_newsapi_key         # optional
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) → New Project
2. SQL Editor → paste contents of `backend/supabase_schema.sql` → Run
3. Settings → API → copy Project URL and anon public key

### 3. Run backend

```bash
uvicorn main:app --reload --port 8000
```

API docs at: http://localhost:8000/docs

### 4. Run frontend

```bash
cd ../frontend
npm install
echo "VITE_API_URL=http://localhost:8000" > .env.local
npm run dev
```

App at: http://localhost:5173

---

## Deploy to Production

### Backend → Render

1. Push code to GitHub
2. [render.com](https://render.com) → New Web Service → connect repo
3. **Root Directory:** `backend`
4. **Runtime:** Python 3.11
5. **Build command:** `pip install -r requirements.txt`
6. **Start command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
7. **Environment variables:** `GROQ_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`, `HF_API_KEY`, `NEWS_API_KEY`
8. **Python version:** set `PYTHON_VERSION=3.11.9` in env vars

### Frontend → Vercel

1. [vercel.com](https://vercel.com) → New Project → import frontend folder
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
│   ├── main.py                   # FastAPI app entry point
│   ├── requirements.txt
│   ├── render.yaml               # Render deployment config
│   ├── supabase_schema.sql       # Run once in Supabase SQL editor
│   ├── .python-version           # 3.11.9
│   ├── routers/
│   │   ├── analyze.py            # /analyze, /analyze/html, /analyze/text
│   │   ├── compare.py            # /compare
│   │   └── history.py            # /history, /stats, /analysis/{id}
│   └── services/
│       ├── groq_service.py       # Groq LLM + source database + title extraction
│       ├── ml_service.py         # HuggingFace models + Groq ML fallback
│       ├── scraper.py            # 4-layer article extraction
│       ├── database.py           # Supabase CRUD + cache
│       └── news_service.py       # NewsAPI + smart fallback links
│
├── frontend/
│   └── src/
│       ├── App.jsx               # Routes
│       ├── utils/api.js          # smartAnalyze, analyzeText, deleteAnalysis
│       ├── styles/global.css
│       ├── pages/
│       │   ├── HomePage.jsx      # Landing + analysis input
│       │   ├── ResultPage.jsx    # 10-section analysis result
│       │   ├── ComparePage.jsx   # Multi-source comparison
│       │   ├── HistoryPage.jsx   # Past analyses + search
│       │   └── SharedResultPage.jsx  # /result/:id shareable links
│       └── components/
│           ├── Navbar.jsx
│           ├── LoadingAnalysis.jsx     # 8-step progress animation
│           ├── CredibilityRing.jsx     # Animated ring + DB baseline
│           ├── BiasMeter.jsx           # Spectrum bar + evidence quotes
│           ├── ManipulationPanel.jsx   # Flagged phrases + emotions
│           ├── ClaimEvidencePanel.jsx  # Claim vs evidence side-by-side
│           ├── ELI15Panel.jsx          # AI Summary + missing context
│           ├── TrustEvidence.jsx       # AllSides/MBFC refs + evidence
│           ├── CompliancePanel.jsx     # IT Act + Consumer Protection
│           ├── MLInsights.jsx          # Sentiment + emotion + political bars
│           ├── MediaFingerprint.jsx    # 6-dimension radar chart
│           ├── ShareCard.jsx           # Tweet/WhatsApp/SVG download
│           ├── RelatedSources.jsx      # Related articles + search fallback
│           ├── Skeletons.jsx           # Loading skeleton components
│           └── ErrorBoundary.jsx
│
└── chrome-extension/
    ├── manifest.json
    ├── popup.html
    ├── popup.js
    └── content.js
```

---

## Score Reference

### Credibility (0–100)

| Range | Label | Examples |
|---|---|---|
| 80–100 | High Credibility | AP News (90), Reuters (88), AFP (86) |
| 60–79 | Moderate | BBC (82), Guardian (76), NYT (78) |
| 40–59 | Low | Al Jazeera (63), Times of Israel (61) |
| 20–39 | Very Low | Fox News opinion (42), Daily Mail (30) |
| 0–19 | Unreliable | RT (22), CGTN (19), PressTV (15) |

### Bias Labels

`Neutral` · `Center` · `Left-leaning` · `Right-leaning` · `Pro-Israel` · `Pro-Palestine` · `Pro-Russia` · `Pro-Ukraine` · `Pro-China` · `Pro-India` · `Pro-US` · `Pro-Iran` · `Nationalist` · `Partisan`

### Manipulation (0–100)

| Range | Level |
|---|---|
| 0–20 | Low — dry factual language |
| 21–45 | Low-Medium — some emotional framing |
| 46–65 | Medium — advocacy journalism |
| 66–100 | High — propaganda-level manipulation |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | ✅ Yes | [console.groq.com](https://console.groq.com) |
| `SUPABASE_URL` | ✅ Yes | Supabase project URL |
| `SUPABASE_KEY` | ✅ Yes | Supabase anon public key |
| `HF_API_KEY` | Optional | HuggingFace token — enables real ML models |
| `NEWS_API_KEY` | Optional | [newsapi.org](https://newsapi.org) — related articles |
| `VITE_API_URL` | Frontend | Your Render backend URL |

---

## Legal Compliance (India)

TruthLens automatically maps analysis findings to Indian law:

| Law | When flagged |
|---|---|
| **IT Act §66** | Disputed claims detected, very low credibility, or state media source |
| **IT Act §69A** | High manipulation (70+/100), 5+ emotional phrases, high ML fear score |
| **IT Rules 2021** | Medium/High manipulation + strong bias (70%+ confidence) |
| **CPA 2019** | False claims + score below 50 + biased framing without opposing view |

Under IT Rules 2021, platforms must act within **36 hours** of content being flagged. TruthLens provides the automated detection layer that makes this enforcement possible.

---

## Why TruthLens vs Existing Tools

| | TruthLens | Snopes / FactCheck.org | Social media labels | MBFC |
|---|---|---|---|---|
| Speed | Under 15 seconds | Days to weeks | Hours to days | Manual |
| Coverage | Any article, any URL | ~50 claims/day | Only viral posts | Outlet ratings only |
| Bias detection | ✅ Yes | ❌ No | ❌ No | ✅ Partial |
| Manipulation | ✅ Yes | ❌ No | ❌ No | ❌ No |
| Evidence cited | ✅ Clickable refs | ✅ Yes | ❌ No | ✅ Partial |
| Free | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| Real-time | ✅ Yes | ❌ No | ❌ No | ❌ No |

---

## Contributing

Pull requests are welcome. For major changes, open an issue first.

```bash
git checkout -b feature/your-feature
git commit -m "feat: description"
git push origin feature/your-feature
```

---

## License

MIT — see [LICENSE](LICENSE)

---

<div align="center">

Built for the Social Impact AI Hackathon 2026

**"We don't tell you what to think. We give you the tools to think for yourself."**

[truthlens.vercel.app](https://truthlens.vercel.app)

</div>