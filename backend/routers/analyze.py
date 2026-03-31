from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, HttpUrl
from services.scraper import extract_article
from services.groq_service import analyze_article_with_groq, simplify_text
from services.database import save_analysis, get_analysis_by_url
from services.news_service import search_same_story

router = APIRouter()


class AnalyzeRequest(BaseModel):
    url: str
    use_cache: bool = True


class TextAnalyzeRequest(BaseModel):
    text: str
    title: str = "Pasted Text"
    source: str = "Unknown"


@router.post("/analyze")
async def analyze_url(req: AnalyzeRequest):
    # Check cache first
    if req.use_cache:
        cached = get_analysis_by_url(req.url)
        if cached:
            cached["from_cache"] = True
            return cached

    # Scrape article
    try:
        article = extract_article(req.url)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch article: {str(e)}")

    # AI analysis via Groq
    try:
        ai_result = analyze_article_with_groq(
            title=article["title"],
            content=article["content"],
            url=req.url
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

    # Merge article metadata with AI result
    result = {
        **article,
        **ai_result,
        "from_cache": False,
    }

    # Search for related articles from other sources
    try:
        query_terms = " ".join(article["title"].split()[:6])
        related = search_same_story(query_terms, exclude_domain=article["source"], limit=3)
        result["related_sources"] = related
    except Exception:
        result["related_sources"] = []

    # Save to Supabase
    save_analysis(result)

    return result


@router.post("/analyze/text")
async def analyze_text(req: TextAnalyzeRequest):
    """Analyze raw pasted text instead of a URL."""
    if len(req.text.strip()) < 100:
        raise HTTPException(status_code=422, detail="Text too short. Please paste at least 100 characters.")

    try:
        ai_result = analyze_article_with_groq(
            title=req.title,
            content=req.text,
            url="text-input"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

    return {
        "title": req.title,
        "source": req.source,
        "content": req.text,
        "url": "text-input",
        "word_count": len(req.text.split()),
        **ai_result,
        "from_cache": False,
    }


@router.post("/simplify")
async def simplify(req: TextAnalyzeRequest):
    try:
        simplified = simplify_text(req.title, req.text)
        return {"simplified": simplified}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
