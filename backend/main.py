from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import analyze, compare, history
import os

app = FastAPI(
    title="TruthLens API",
    description="AI-powered war news verifier & bias detector",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router, prefix="/api/v1", tags=["analyze"])
app.include_router(compare.router, prefix="/api/v1", tags=["compare"])
app.include_router(history.router, prefix="/api/v1", tags=["history"])

@app.get("/")
def root():
    return {"status": "TruthLens API is live", "version": "1.0.0"}

@app.get("/health")
def health():
    return {"status": "healthy"}
