from fastapi import APIRouter
from services.database import get_recent_analyses, get_stats

router = APIRouter()


@router.get("/history")
def get_history(limit: int = 20):
    return {"analyses": get_recent_analyses(limit)}


@router.get("/stats")
def get_stats_endpoint():
    return get_stats()
