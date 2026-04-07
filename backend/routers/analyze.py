from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.scraper import extract_article, extract_from_html
from services.groq_service import analyze_article_with_groq, simplify_text, extract_title_from_text
from services.database import save_analysis, get_analysis_by_url
from services.news_service import search_same_story
from services.ml_service import run_ml_analysis

router = APIRouter()


class AnalyzeRequest(BaseModel):
    url: str
    use_cache: bool = True


class AnalyzeHtmlRequest(BaseModel):
    url: str
    html: str
    use_cache: bool = True


class TextAnalyzeRequest(BaseModel):
    text: str
    title: str = "Pasted Text"
    source: str = "Unknown"


def _merge_ml(result: dict, ml: dict) -> dict:
    if not ml.get("available"):
        result["ml_analysis"] = {"available": False}
        return result
    result["ml_analysis"] = ml
    if ml.get("ml_manipulation_score") is not None and "manipulation" in result:
        gs = result["manipulation"].get("score", 0)
        ms = ml["ml_manipulation_score"]
        blended = round(gs * 0.6 + ms * 0.4)
        result["manipulation"]["score"] = blended
        result["manipulation"]["ml_score"] = ms
        result["manipulation"]["level"] = "High" if blended >= 60 else "Medium" if blended >= 35 else "Low"
    if ml.get("political_bias") and "bias" in result:
        result["bias"]["ml_political"] = ml["political_bias"]
    if ml.get("emotions") and "manipulation" in result:
        result["manipulation"]["dominant_emotion"] = ml["emotions"]["dominant"]
        result["manipulation"]["emotion_scores"] = ml["emotions"]["scores"]
    return result


def _get_related(title: str, conflict_region: str, source: str) -> list[dict]:
    """
    Search for related coverage. Falls back to smart curated links
    when NewsAPI key is missing or returns nothing useful.
    """
    # Use conflict_region if available for better query
    query_base = conflict_region or " ".join(title.split()[:6])
    query = query_base[:80]

    results = search_same_story(query, exclude_domain=source, limit=3)

    # Filter out the generic "Search for: X" fallback entries — they look bad
    real_results = [r for r in results if not r.get("title", "").startswith("Search for:")]

    if real_results:
        return real_results

    # Build smart curated links based on the topic
    topic = (conflict_region or query).replace(" ", "+")
    return [
        {
            "source": "BBC News",
            "title": f"BBC coverage: {conflict_region or title[:60]}",
            "url": f"https://www.bbc.com/search?q={topic}",
            "description": "Search BBC News for related coverage",
        },
        {
            "source": "Al Jazeera",
            "title": f"Al Jazeera coverage: {conflict_region or title[:60]}",
            "url": f"https://www.aljazeera.com/search/{topic}",
            "description": "Search Al Jazeera for related coverage",
        },
        {
            "source": "Reuters",
            "title": f"Reuters coverage: {conflict_region or title[:60]}",
            "url": f"https://www.reuters.com/search/news?blob={topic}",
            "description": "Search Reuters for related coverage",
        },
    ]


async def _run_analysis(article: dict, url: str) -> dict:
    scrape_failed = article.get("scrape_failed", False)

    try:
        ai_result = analyze_article_with_groq(
            title=article["title"],
            content=article["content"],
            url=url,
            scrape_failed=scrape_failed,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

    result = {**article, **ai_result, "from_cache": False, "scrape_failed": scrape_failed}

    # ML analysis — always run; ml_service uses Groq fallback when HF unavailable
    content_for_ml = article.get("content", "")
    if not content_for_ml and scrape_failed:
        # Build a proxy text from title + AI result summary for ML
        content_for_ml = result.get("title", "") + " " + result.get("summary_eli15", "")
    try:
        ml = run_ml_analysis(content_for_ml if len(content_for_ml) > 50 else result.get("title", "news article"))
        result = _merge_ml(result, ml)
    except Exception as e:
        print(f"ML error (non-fatal): {e}")
        result["ml_analysis"] = {"available": False}

    # Related coverage — always try, never leave empty
    try:
        result["related_sources"] = _get_related(
            title=result.get("title", ""),
            conflict_region=result.get("conflict_region", ""),
            source=article.get("source", ""),
        )
    except Exception:
        result["related_sources"] = []

    save_analysis(result)
    return result


@router.post("/analyze")
async def analyze_url(req: AnalyzeRequest):
    if req.use_cache:
        cached = get_analysis_by_url(req.url)
        if cached:
            cached["from_cache"] = True
            return cached

    try:
        article = extract_article(req.url)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return await _run_analysis(article, req.url)


@router.post("/analyze/html")
async def analyze_html(req: AnalyzeHtmlRequest):
    if req.use_cache:
        cached = get_analysis_by_url(req.url)
        if cached:
            cached["from_cache"] = True
            return cached

    if not req.html or len(req.html) < 500:
        raise HTTPException(status_code=422, detail="HTML content too short or empty.")

    try:
        article = extract_from_html(req.html, req.url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return await _run_analysis(article, req.url)


@router.post("/analyze/text")
async def analyze_text(req: TextAnalyzeRequest):
    if len(req.text.strip()) < 100:
        raise HTTPException(status_code=422, detail="Text too short. Please paste at least 100 characters.")

    # Step 1: Extract a real title from the pasted text using Groq
    real_title = req.title
    if req.title == "Pasted Text" or req.title == "Unknown":
        try:
            real_title = extract_title_from_text(req.text)
        except Exception:
            real_title = req.text[:80].strip().rstrip('.') + "..."

    try:
        ai_result = analyze_article_with_groq(
            title=real_title,
            content=req.text,
            url="text-input",
            scrape_failed=False,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

    # Use AI-derived title if Groq returned a better one
    final_title = ai_result.pop("extracted_title", None) or real_title

    result = {
        "title": final_title,
        "source": req.source if req.source != "Unknown" else "Pasted Article",
        "content": req.text,
        "url": "text-input",
        "word_count": len(req.text.split()),
        **ai_result,
        "from_cache": False,
        "scrape_failed": False,
    }

    # ML analysis
    try:
        ml = run_ml_analysis(req.text)
        result = _merge_ml(result, ml)
    except Exception:
        result["ml_analysis"] = {"available": False}

    # Related coverage based on AI-detected region/topic
    try:
        result["related_sources"] = _get_related(
            title=result["title"],
            conflict_region=result.get("conflict_region", ""),
            source="",
        )
    except Exception:
        result["related_sources"] = []

    # Save to history — was missing before!
    save_analysis(result)

    return result


@router.post("/simplify")
async def simplify(req: TextAnalyzeRequest):
    try:
        return {"simplified": simplify_text(req.title, req.text)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))