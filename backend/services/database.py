import os
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(url, key) if url and key else None


def save_analysis(data: dict) -> dict | None:
    if not supabase:
        return None
    try:
        result = supabase.table("analyses").insert({
            "url": data.get("url"),
            "title": data.get("title"),
            "source": data.get("source"),
            "credibility_score": data.get("credibility_score"),
            "bias_label": data.get("bias", {}).get("label"),
            "bias_confidence": data.get("bias", {}).get("confidence"),
            "manipulation_level": data.get("manipulation", {}).get("level"),
            "manipulation_score": data.get("manipulation", {}).get("score"),
            "conflict_region": data.get("conflict_region"),
            "summary_eli15": data.get("summary_eli15"),
            "full_result": data,
            "analyzed_at": datetime.utcnow().isoformat(),
        }).execute()
        return result.data[0] if result.data else None
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