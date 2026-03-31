# TruthLens 🔍
**AI-powered war news verifier, bias detector & emotional manipulation analyzer**

Built with Groq (Llama 3 70B) · FastAPI · React · Supabase · Render · Vercel

---

## Stack
| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite, TailwindCSS, Framer Motion |
| Backend | FastAPI, Python 3.11 |
| AI | Groq API (Llama 3 70B — free tier) |
| Database | Supabase (PostgreSQL) |
| News | NewsAPI.org |
| Deploy (BE) | Render |
| Deploy (FE) | Vercel |

---

## Get API Keys (all free)

### 1. Groq API Key (AI brain)
1. Go to [console.groq.com](https://console.groq.com)
2. Sign up → API Keys → Create new key
3. Copy key → paste as `GROQ_API_KEY`

### 2. Supabase (database)
1. Go to [supabase.com](https://supabase.com) → New Project
2. Go to SQL Editor → paste contents of `backend/supabase_schema.sql` → Run
3. Go to Settings → API → copy `Project URL` and `anon public` key
4. Set as `SUPABASE_URL` and `SUPABASE_KEY`

### 3. NewsAPI (optional, for related articles)
1. Go to [newsapi.org](https://newsapi.org) → Get API Key (free)
2. Set as `NEWS_API_KEY`

---

## Local Development

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env from template
cp .env.example .env
# Fill in your keys in .env

uvicorn main:app --reload --port 8000
```
API docs available at: http://localhost:8000/docs

### Frontend
```bash
cd frontend
npm install

# Create .env.local
echo "VITE_API_URL=http://localhost:8000" > .env.local

npm run dev
```
App runs at: http://localhost:5173

---

## Deploy to Production

### Backend → Render
1. Push code to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your GitHub repo, set root directory to `backend/`
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Add environment variables:
   - `GROQ_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `NEWS_API_KEY`
7. Deploy → copy your Render URL (e.g. `https://truthlens-api.onrender.com`)

### Frontend → Vercel
1. Go to [vercel.com](https://vercel.com) → New Project
2. Import frontend folder from GitHub
3. Add environment variable:
   - `VITE_API_URL` = your Render backend URL
4. Deploy → done!

---

## Features
- **Bias Detection** — Spectrum scoring (Pro-Israel / Pro-Iran / Neutral etc.) with confidence %
- **Credibility Score** — 0–100 ring gauge powered by Groq Llama 3
- **Manipulation Detector** — Flags Fear, Anger, Urgency, Dehumanization phrases
- **Fact Check** — Claim-by-claim verification status
- **ELI15** — Simplify complex war news for anyone
- **Multi-Source Compare** — Side-by-side framing analysis of 2–4 articles
- **History** — All analyses saved to Supabase, queryable
- **Smart Cache** — Same URL within 1 hour returns cached result

---

## Demo Flow (Hackathon)
1. Paste a live BBC/Al Jazeera/Reuters URL about a conflict
2. Watch the scan animation + loading steps
3. Show bias meter animating to result
4. Click flagged manipulation phrases — explain why they're manipulative
5. Hit "Compare these sources" → show diverging word choices
6. Click ELI15 → "This is what your 15-year-old sibling needs to know"
7. Drop line: *"We're not telling people what to think. We're giving them the tools to think for themselves."*

---

## Project Structure
```
truthlens/
├── backend/
│   ├── main.py               # FastAPI app
│   ├── requirements.txt
│   ├── render.yaml           # Render deploy config
│   ├── supabase_schema.sql   # Run in Supabase SQL editor
│   ├── routers/
│   │   ├── analyze.py        # /api/v1/analyze
│   │   ├── compare.py        # /api/v1/compare
│   │   └── history.py        # /api/v1/history
│   └── services/
│       ├── groq_service.py   # Groq AI calls
│       ├── scraper.py        # Article extraction
│       ├── database.py       # Supabase CRUD
│       └── news_service.py   # NewsAPI
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── pages/
    │   │   ├── HomePage.jsx
    │   │   ├── ResultPage.jsx
    │   │   ├── ComparePage.jsx
    │   │   └── HistoryPage.jsx
    │   └── components/
    │       ├── Navbar.jsx
    │       ├── CredibilityRing.jsx
    │       ├── BiasMeter.jsx
    │       ├── ManipulationPanel.jsx
    │       ├── FactCheckPanel.jsx
    │       ├── ELI15Panel.jsx
    │       ├── RelatedSources.jsx
    │       └── LoadingAnalysis.jsx
    └── vercel.json
```
