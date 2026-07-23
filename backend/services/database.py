import os
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(url, key) if url and key else None


def _slim_result(data: dict) -> dict:
    """
    Remove heavy fields before storing in Supabase.
    Keeps full analysis data but strips raw article content and 
    large corroboration descriptions to stay within row size limits.
    """
    import copy
    slim = copy.deepcopy(data)
    # Remove raw article text — can be 50KB+
    slim.pop("content", None)
    # Trim corroboration descriptions to save space
    try:
        claims = slim.get("fact_check", {}).get("verifiable_claims", [])
        for claim in claims:
            for s in claim.get("corroboration", []):
                s.pop("description", None)
    except Exception:
        pass
    # Trim related sources descriptions
    for rs in slim.get("related_sources", []):
        rs.pop("description", None)
    return slim


def save_analysis(data: dict) -> dict | None:
    if not supabase:
        print("Supabase not configured — history disabled")
        return None
    try:
        slim = _slim_result(data)
        row = {
            "url":               data.get("url", ""),
            "title":             (data.get("title") or "")[:500],
            "source":            (data.get("source") or "")[:200],
            "credibility_score": data.get("credibility_score"),
            "bias_label":        (data.get("bias", {}).get("label") or "")[:100],
            "bias_confidence":   data.get("bias", {}).get("confidence"),
            "manipulation_level":(data.get("manipulation", {}).get("level") or "")[:20],
            "manipulation_score":data.get("manipulation", {}).get("score"),
            "conflict_region":   (data.get("conflict_region") or "")[:200],
            "summary_eli15":     (data.get("summary_eli15") or "")[:1000],
            "full_result":       slim,
            "analyzed_at":       datetime.utcnow().isoformat(),
        }
        result = supabase.table("analyses").insert(row).execute()
        if result.data:
            print(f"Saved analysis: {data.get('title', '')[:50]}")
            return result.data[0]
        else:
            print(f"Supabase insert returned no data: {result}")
            return None
    except Exception as e:
        print(f"Supabase save error: {e}")
        return None


def get_recent_analyses(limit: int = 20) -> list:
    if not supabase:
        return []
    try:
        result = supabase.table("analyses") \
            .select("id, url, title, source, credibility_score, bias_label, manipulation_level, conflict_region, analyzed_at, summary_eli15") \
            .order("analyzed_at", desc=True) \
            .limit(limit) \
            .execute()
        return result.data or []
    except Exception as e:
        print(f"Supabase fetch error: {e}")
        return []


def get_analysis_by_id(analysis_id: str) -> dict | None:
    if not supabase:
        return None
    try:
        result = supabase.table("analyses") \
            .select("full_result") \
            .eq("id", analysis_id) \
            .single() \
            .execute()
        return result.data["full_result"] if result.data else None
    except Exception as e:
        print(f"Supabase get by id error: {e}")
        return None


def delete_analysis(analysis_id: str) -> bool:
    if not supabase:
        return False
    try:
        supabase.table("analyses").delete().eq("id", analysis_id).execute()
        return True
    except Exception as e:
        print(f"Supabase delete error: {e}")
        return False


def get_analysis_by_url(url: str) -> dict | None:
    if not supabase:
        return None
    try:
        result = supabase.table("analyses") \
            .select("full_result, analyzed_at") \
            .eq("url", url) \
            .order("analyzed_at", desc=True) \
            .limit(1) \
            .execute()
        if result.data:
            row = result.data[0]
            analyzed = datetime.fromisoformat(row["analyzed_at"].replace("Z", "+00:00"))
            diff = (datetime.utcnow().replace(tzinfo=analyzed.tzinfo) - analyzed).total_seconds()
            if diff < 3600:
                return row["full_result"]
    except Exception as e:
        print(f"Supabase cache check error: {e}")
    return None


def get_stats() -> dict:
    if not supabase:
        return {}
    try:
        total = supabase.table("analyses").select("id", count="exact").execute()
        return {"total_analyses": total.count or 0}
    except Exception as e:
        print(f"Stats error: {e}")
        return {}