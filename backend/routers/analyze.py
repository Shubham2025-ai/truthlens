from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.scraper import extract_article, extract_from_html
from services.groq_service import analyze_article_with_groq, simplify_text
from services.database import save_analysis, get_analysis_by_url
from services.news_service import search_same_story
from services.ml_service import run_ml_analysis

router = APIRouter()


class AnalyzeRequest(BaseModel):
    url: str
    use_cache: bool = True


class AnalyzeHtmlRequest(BaseModel):
    url: str
    html: str       # Raw HTML sent from the user's browser
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

    if not scrape_failed and len(article.get("content", "")) > 200:
        try:
            ml = run_ml_analysis(article["content"])
            result = _merge_ml(result, ml)
        except Exception as e:
            print(f"ML error (non-fatal): {e}")
            result["ml_analysis"] = {"available": False}
    else:
        result["ml_analysis"] = {"available": False}

    try:
        query = " ".join(article["title"].split()[:6])
        result["related_sources"] = search_same_story(query, exclude_domain=article["source"], limit=3)
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
    """
    Called when the browser fetches the page itself and sends HTML here.
    This bypasses all server-side scraping restrictions completely.
    """
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

    try:
        ai_result = analyze_article_with_groq(
            title=req.title, content=req.text, url="text-input", scrape_failed=False,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

    result = {
        "title": req.title, "source": req.source, "content": req.text,
        "url": "text-input", "word_count": len(req.text.split()),
        **ai_result, "from_cache": False, "scrape_failed": False,
    }
    try:
        ml = run_ml_analysis(req.text)
        result = _merge_ml(result, ml)
    except Exception:
        result["ml_analysis"] = {"available": False}
    return result


@router.post("/simplify")
async def simplify(req: TextAnalyzeRequest):
    try:
        return {"simplified": simplify_text(req.title, req.text)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))