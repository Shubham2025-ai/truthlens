from fastapi import APIRouter, HTTPException
from services.database import get_recent_analyses, get_stats, get_analysis_by_id, delete_analysis

router = APIRouter()


@router.get("/history")
def get_history(limit: int = 20):
    return {"analyses": get_recent_analyses(limit)}


@router.get("/stats")
def get_stats_endpoint():
    return get_stats()


@router.get("/analysis/{analysis_id}")
def get_analysis(analysis_id: str):
    result = get_analysis_by_id(analysis_id)
    if not result:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return result


@router.delete("/analysis/{analysis_id}")
def delete_analysis_endpoint(analysis_id: str):
    success = delete_analysis(analysis_id)
    if not success:
        raise HTTPException(status_code=404, detail="Could not delete analysis")
    return {"deleted": True, "id": analysis_id}