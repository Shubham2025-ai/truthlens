from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.scraper import extract_article
from services.groq_service import compare_sources_with_groq, analyze_article_with_groq

router = APIRouter()


class CompareRequest(BaseModel):
    urls: list[str]


@router.post("/compare")
async def compare_articles(req: CompareRequest):
    if len(req.urls) < 2:
        raise HTTPException(status_code=422, detail="Provide at least 2 URLs to compare.")
    if len(req.urls) > 4:
        raise HTTPException(status_code=422, detail="Maximum 4 URLs allowed.")

    articles = []
    errors = []

    for url in req.urls:
        try:
            article = extract_article(url)
            articles.append(article)
        except Exception as e:
            errors.append({"url": url, "error": str(e)})

    if len(articles) < 2:
        raise HTTPException(status_code=422, detail=f"Could not fetch enough articles. Errors: {errors}")

    # Run individual bias analysis on each
    individual_analyses = []
    for art in articles:
        try:
            ai = analyze_article_with_groq(art["title"], art["content"], art["url"])
            individual_analyses.append({
                "title": art["title"],
                "source": art["source"],
                "url": art["url"],
                "image": art.get("image", ""),
                "credibility_score": ai.get("credibility_score"),
                "bias": ai.get("bias"),
                "manipulation": ai.get("manipulation"),
                "fact_check": ai.get("fact_check"),
            })
        except Exception as e:
            individual_analyses.append({
                "source": art["source"],
                "url": art["url"],
                "error": str(e)
            })

    # Cross-source comparison
    try:
        comparison = compare_sources_with_groq(articles)
    except Exception as e:
        comparison = {"error": str(e)}

    return {
        "articles": individual_analyses,
        "comparison": comparison,
        "fetch_errors": errors,
    }
