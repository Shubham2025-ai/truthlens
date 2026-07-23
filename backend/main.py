from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import analyze, compare, history
from services.database import init_db

app = FastAPI(title="TruthLens API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create table on startup if it doesn't exist
@app.on_event("startup")
def startup():
    init_db()

app.include_router(analyze.router, prefix="/api/v1")
app.include_router(compare.router, prefix="/api/v1")
app.include_router(history.router, prefix="/api/v1")

@app.get("/health")
def health():
    return {"status": "ok", "service": "TruthLens API"}