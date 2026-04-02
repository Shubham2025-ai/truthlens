from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.scraper import extract_article
from services.groq_service import analyze_article_with_groq, simplify_text
from services.database import save_analysis, get_analysis_by_url
from services.news_service import search_same_story
from services.ml_service import run_ml_analysis

router = APIRouter()


class AnalyzeRequest(BaseModel):
    url: str
    use_cache: bool = True


class TextAnalyzeRequest(BaseModel):
    text: str
    title: str = "Pasted Text"
    source: str = "Unknown"


def _merge_ml_into_result(result: dict, ml: dict) -> dict:
    """
    Merge real ML model scores into the Groq result.
    ML scores are used to VALIDATE and ENHANCE Groq's output,
    not replace it entirely — best of both worlds.
    """
    if not ml.get("available"):
        result["ml_analysis"] = {"available": False}
        return result

    result["ml_analysis"] = ml

    # Override manipulation score with ML-computed value if available
    if ml.get("ml_manipulation_score") is not None:
        if "manipulation" in result and isinstance(result["manipulation"], dict):
            groq_score = result["manipulation"].get("score", 0)
            ml_score   = ml["ml_manipulation_score"]
            # Blend: 60% Groq (context-aware) + 40% ML (model-based)
            blended = round(groq_score * 0.6 + ml_score * 0.4)
            result["manipulation"]["score"] = blended
            result["manipulation"]["ml_score"] = ml_score

            # Update level based on blended score
            if blended >= 60:
                result["manipulation"]["level"] = "High"
            elif blended >= 35:
                result["manipulation"]["level"] = "Medium"
            else:
                result["manipulation"]["level"] = "Low"

    # Add ML political bias as a secondary signal alongside Groq bias
    if ml.get("political_bias"):
        if "bias" in result and isinstance(result["bias"], dict):
            result["bias"]["ml_political"] = ml["political_bias"]
            # If ML and Groq strongly agree on direction, boost confidence
            pb = ml["political_bias"]
            groq_label = result["bias"].get("label", "").lower()
            ml_dominant = pb.get("dominant", "center")
            if ("left" in groq_label and ml_dominant == "left") or \
               ("right" in groq_label and ml_dominant == "right") or \
               (groq_label in ("neutral", "center") and ml_dominant == "center"):
                result["bias"]["confidence"] = min(99, result["bias"].get("confidence", 70) + 10)
                result["bias"]["ml_validated"] = True

    # Add dominant emotion to manipulation panel
    if ml.get("emotions"):
        if "manipulation" in result and isinstance(result["manipulation"], dict):
            result["manipulation"]["dominant_emotion"] = ml["emotions"]["dominant"]
            result["manipulation"]["dominant_emotion_score"] = ml["emotions"]["dominant_score"]
            result["manipulation"]["emotion_scores"] = ml["emotions"]["scores"]

    return result


@router.post("/analyze")
async def analyze_url(req: AnalyzeRequest):
    # Check cache
    if req.use_cache:
        cached = get_analysis_by_url(req.url)
        if cached:
            cached["from_cache"] = True
            return cached

    # Scrape
    try:
        article = extract_article(req.url)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

    scrape_failed = article.get("scrape_failed", False)

    # Run Groq LLM analysis
    try:
        ai_result = analyze_article_with_groq(
            title=article["title"],
            content=article["content"],
            url=req.url,
            scrape_failed=scrape_failed,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

    result = {**article, **ai_result, "from_cache": False, "scrape_failed": scrape_failed}

    # Run real ML models if we have actual article text
    if not scrape_failed and len(article.get("content", "")) > 200:
        try:
            ml_result = run_ml_analysis(article["content"])
            result = _merge_ml_into_result(result, ml_result)
        except Exception as e:
            print(f"ML analysis error (non-fatal): {e}")
            result["ml_analysis"] = {"available": False, "error": str(e)}
    else:
        result["ml_analysis"] = {"available": False, "reason": "no_content"}

    # Related articles
    try:
        query_terms = " ".join(article["title"].split()[:6])
        related = search_same_story(query_terms, exclude_domain=article["source"], limit=3)
        result["related_sources"] = related
    except Exception:
        result["related_sources"] = []

    save_analysis(result)
    return result


@router.post("/analyze/text")
async def analyze_text(req: TextAnalyzeRequest):
    if len(req.text.strip()) < 100:
        raise HTTPException(status_code=422, detail="Text too short. Please paste at least 100 characters.")

    try:
        ai_result = analyze_article_with_groq(
            title=req.title,
            content=req.text,
            url="text-input",
            scrape_failed=False,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

    result = {
        "title": req.title, "source": req.source, "content": req.text,
        "url": "text-input", "word_count": len(req.text.split()),
        **ai_result, "from_cache": False, "scrape_failed": False,
    }

    # Run ML on pasted text too
    try:
        ml_result = run_ml_analysis(req.text)
        result = _merge_ml_into_result(result, ml_result)
    except Exception as e:
        result["ml_analysis"] = {"available": False}

    return result


@router.post("/simplify")
async def simplify(req: TextAnalyzeRequest):
    try:
        simplified = simplify_text(req.title, req.text)
        return {"simplified": simplified}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))