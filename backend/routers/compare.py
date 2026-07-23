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
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.scraper import extract_article
from services.groq_service import compare_sources_with_groq, extract_title_from_text

router = APIRouter()


class CompareRequest(BaseModel):
    urls: list[str]


@router.post("/compare")
async def compare_articles(req: CompareRequest):
    if len(req.urls) < 2:
        raise HTTPException(status_code=422, detail="Need at least 2 URLs to compare.")
    if len(req.urls) > 4:
        raise HTTPException(status_code=422, detail="Maximum 4 URLs at a time.")

    articles = []
    for url in req.urls:
        url = url.strip()
        if not url:
            continue
        try:
            # Use the same 4-layer extraction as the main analyze route
            extracted = extract_article(url)

            title   = extracted.get("title", "")
            content = extracted.get("content", "")

            # If title is still a URL slug (junk), use Groq to extract real title
            if (not title or len(title) < 10 or
                title.replace(" ", "").isalnum() and len(title.split()) <= 2):
                if content and len(content) > 100:
                    try:
                        title = extract_title_from_text(content)
                    except Exception:
                        pass

            articles.append({
                "url":     url,
                "source":  extracted.get("source", _domain(url)),
                "title":   title or extracted.get("source", _domain(url)),
                "content": content[:3000] if content else f"Article from {_domain(url)}",
                "word_count": extracted.get("word_count", 0),
                "scrape_failed": extracted.get("scrape_failed", False),
            })
        except Exception as e:
            # Don't fail the whole comparison — add stub entry
            articles.append({
                "url":     url,
                "source":  _domain(url),
                "title":   _domain(url),
                "content": f"Could not extract content from {url}. Analysis based on source reputation.",
                "word_count": 0,
                "scrape_failed": True,
            })

    if len(articles) < 2:
        raise HTTPException(status_code=422, detail="Could not extract content from enough URLs.")

    try:
        comparison = compare_sources_with_groq(articles)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")

    return {
        "articles":   articles,
        "comparison": comparison,
    }


def _domain(url: str) -> str:
    try:
        from urllib.parse import urlparse
        return urlparse(url).netloc.replace("www.", "")
    except Exception:
        return url