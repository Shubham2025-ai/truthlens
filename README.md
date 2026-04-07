# TruthLens 🔍  
**AI-powered war news verifier, bias detector, and emotional manipulation analyzer**

> In an era of information warfare, TruthLens helps people analyze conflict reporting critically — by revealing bias framing, emotional manipulation tactics, credibility gaps, and claim-level fact-check signals.

![Status](https://img.shields.io/badge/status-active-success)
![Frontend](https://img.shields.io/badge/frontend-React%20%2B%20Vite-61DAFB)
![Backend](https://img.shields.io/badge/backend-FastAPI-009688)
![AI](https://img.shields.io/badge/AI-Groq%20Llama%203%2070B-orange)
![DB](https://img.shields.io/badge/database-Supabase-3ECF8E)
![Extension](https://img.shields.io/badge/chrome-extension-blue)

---

## 🚀 What We Built (So Far)

TruthLens is a multi-platform misinformation analysis system with:

- **Web App** (React + Vite) for full analysis workflows
- **FastAPI Backend** for scraping, AI analysis, comparison, and history
- **Chrome Extension** for instant “analyze current article” UX
- **Supabase Persistence** for analysis history and reuse
- **Smart Caching** to avoid duplicate re-analysis for recent URLs

This is not just a classifier — it is a **reasoning-first assistant** that explains *why* an article may be biased, manipulative, or weakly credible.

---

## 🧠 Core Features

### 1) Bias Detection
- Detects narrative framing direction (e.g., Pro-side A / Pro-side B / Neutral)
- Provides confidence score and framing explanation

### 2) Credibility Scoring
- Outputs a 0–100 credibility score
- Designed for quick trust triage before deep reading

### 3) Manipulation Detector
- Flags emotionally loaded tactics such as:
  - Fear amplification
  - Anger triggers
  - Urgency pressure
  - Dehumanizing language
- Gives understandable explanation for each flag

### 4) Claim-level Fact Check Signals
- Breaks down article into key claims
- Surfaces verification status patterns where possible

### 5) ELI15 Summarization
- Converts dense geopolitical reporting into plain language

### 6) Multi-source Comparison
- Side-by-side framing analysis across 2–4 related sources
- Highlights wording and angle divergence

### 7) Analysis History
- Stores previous scans in Supabase
- Makes demo + user journey persistent

### 8) Smart Cache
- Reuses recent analysis for same URL (1-hour freshness window)
- Improves latency and API efficiency

---

## 🏗️ Architecture

```text
User/Web or Chrome Extension
        │
        ▼
Frontend (React/Vite) or Extension Popup
        │
        ▼
FastAPI Backend (routers + services)
   ├─ Scraper service (article extraction)
   ├─ Groq service (Llama 3 70B analysis)
   ├─ News service (related articles)
   └─ Database service (Supabase CRUD + history/cache)
        │
        ▼
Supabase (PostgreSQL)
```

---

## 🧩 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TailwindCSS, Framer Motion |
| Backend | FastAPI, Python 3.11 |
| AI | Groq API (Llama 3 70B) |
| Database | Supabase (PostgreSQL) |
| News Data | NewsAPI.org |
| Backend Deploy | Render |
| Frontend Deploy | Vercel |
| Browser UX | Chrome Extension (Manifest V3) |

---

## 📁 Project Structure

```text
truthlens/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── render.yaml
│   ├── supabase_schema.sql
│   ├── routers/
│   │   ├── analyze.py
│   │   ├── compare.py
│   │   └── history.py
│   └── services/
│       ├── groq_service.py
│       ├── scraper.py
│       ├── database.py
│       └── news_service.py
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── .env.example
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── vercel.json
└── chrome-extension/
    ├── manifest.json
    ├── popup.html
    ├── popup.js
    ├── content.js
    └── README.md
```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
- `GROQ_API_KEY=...`
- `SUPABASE_URL=...`
- `SUPABASE_KEY=...`
- `NEWS_API_KEY=...` *(optional but recommended)*

### Frontend (`frontend/.env.local`)
- `VITE_API_URL=http://localhost:8000` *(or deployed backend URL)*

### Chrome Extension
- Update `popup.js` API constant to your deployed backend URL if needed.

---

## 🛠️ Local Development

### 1) Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# fill all keys in .env
uvicorn main:app --reload --port 8000
```

Backend docs: `http://localhost:8000/docs`

---

### 2) Frontend

```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:8000" > .env.local
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

### 3) Chrome Extension (Unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select `chrome-extension/`
5. Pin TruthLens and use on any open news article

---

## 🌐 Deployment

### Backend → Render
- Root directory: `backend/`
- Build: `pip install -r requirements.txt`
- Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Add env vars: `GROQ_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`, `NEWS_API_KEY`

### Frontend → Vercel
- Import `frontend/`
- Set `VITE_API_URL=<your render backend url>`
- Deploy

---

## 🎬 Hackathon Demo Script (Winning Pitch Flow)

1. Open a live conflict news URL (Reuters/BBC/Al Jazeera/etc.)
2. Paste into TruthLens and run analysis
3. Show:
   - Credibility score ring
   - Bias direction meter
   - Manipulation phrase highlights
4. Switch to **Compare Sources** and show framing divergence
5. Use **ELI15** for clarity and accessibility
6. Open Chrome extension and run in-page quick analysis
7. Close with:

> “TruthLens doesn’t tell people what to think — it gives them the tools to think critically under information pressure.”

---

## 🧪 Suggested Judging Angles

- **Innovation:** Combines bias + manipulation + fact-check signals + explainability
- **Impact:** Media literacy in high-stakes conflict narratives
- **Technical Depth:** Multi-surface product (web + extension + backend + AI + DB)
- **Scalability:** Can expand to elections, climate, finance, health misinformation
- **UX Clarity:** Fast, visual, and understandable outputs for non-experts

---

## 🗺️ Roadmap

- [ ] Multilingual analysis (Arabic/Hindi/Spanish first)
- [ ] Source-level reliability history charts
- [ ] Citation-level evidence linking
- [ ] User accounts + personalized dashboard
- [ ] Real-time “live narrative drift” monitor
- [ ] Mobile app version

---

## 🤝 Contributing

1. Fork the repo
2. Create your feature branch
3. Commit clearly
4. Open a PR with screenshots/demo notes

---

## 📜 License

Add your preferred license (MIT recommended for hackathons).

---

## 👥 Team

Built by the TruthLens team at hackathon speed ⚡  
If this project helped you, star the repo and share feedback.