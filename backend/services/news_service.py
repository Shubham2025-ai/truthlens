import os
import httpx
from dotenv import load_dotenv

load_dotenv()

NEWS_API_KEY = os.getenv("NEWS_API_KEY", "")
BASE_URL     = "https://newsapi.org/v2"

# High-credibility sources used for corroboration — always trusted
TRUSTED_SOURCES = [
    "reuters.com", "apnews.com", "bbc.com", "bbc.co.uk",
    "theguardian.com", "dw.com", "france24.com", "aljazeera.com",
    "ndtv.com", "thehindu.com", "dawn.com", "axios.com",
]

TRUSTED_SOURCE_NAMES = [
    "Reuters", "AP", "Associated Press", "BBC News", "BBC",
    "The Guardian", "DW News", "France 24", "Al Jazeera",
    "NDTV", "The Hindu", "Dawn", "Axios",
]


def _has_api_key() -> bool:
    return bool(NEWS_API_KEY and len(NEWS_API_KEY) > 10)


def search_same_story(query: str, exclude_domain: str = "", limit: int = 3) -> list[dict]:
    """Find same story from multiple sources."""
    if not _has_api_key():
        return _smart_search_links(query)

    try:
        params = {
            "q": query[:100],
            "language": "en",
            "sortBy": "relevancy",
            "pageSize": 15,
            "apiKey": NEWS_API_KEY,
        }
        resp = httpx.get(f"{BASE_URL}/everything", params=params, timeout=10)
        data = resp.json()
        articles = data.get("articles", [])

        seen = set()
        if exclude_domain:
            seen.add(exclude_domain)

        results = []
        for a in articles:
            source = a.get("source", {}).get("name", "Unknown")
            if source in seen:
                continue
            seen.add(source)
            results.append({
                "title":        a.get("title", ""),
                "url":          a.get("url", ""),
                "source":       source,
                "description":  a.get("description", ""),
                "published_at": a.get("publishedAt", ""),
                "image":        a.get("urlToImage", ""),
            })
            if len(results) >= limit:
                break

        return results if results else _smart_search_links(query)

    except Exception as e:
        print(f"NewsAPI error: {e}")
        return _smart_search_links(query)


def corroborate_claims(claims: list[dict], conflict_region: str = "") -> list[dict]:
    """
    For each verifiable claim, search for independent news sources
    that confirm or contradict it. This is the trust-building feature —
    showing users that the AI's fact-check is grounded in real-world reporting.

    Returns claims list with added 'corroboration' field on each claim.
    """
    if not claims:
        return claims

    enriched = []
    for claim in claims:
        claim_text = claim.get("claim", "")
        status     = claim.get("status", "Unverified")

        # Only search for Likely True and Disputed claims — these benefit most from corroboration
        if status in ("Likely True", "Disputed", "Likely False") and len(claim_text) > 15:
            corroboration = _search_claim_evidence(claim_text, conflict_region, status)
            claim["corroboration"] = corroboration
        else:
            claim["corroboration"] = []

        enriched.append(claim)

    return enriched


def _search_claim_evidence(claim: str, region: str, status: str) -> list[dict]:
    """
    Search NewsAPI for articles corroborating or contradicting a specific claim.
    Falls back to curated search links when API key is absent.
    """
    # Build a tight query — extract key nouns from the claim
    query = _build_claim_query(claim, region)

    if not _has_api_key():
        return _claim_search_links(query, claim, status)

    try:
        params = {
            "q": query,
            "language": "en",
            "sortBy": "relevancy",
            "pageSize": 10,
            "apiKey": NEWS_API_KEY,
        }
        resp = httpx.get(f"{BASE_URL}/everything", params=params, timeout=8)
        data = resp.json()
        articles = data.get("articles", [])

        results = []
        for a in articles:
            source_name = a.get("source", {}).get("name", "Unknown")
            url         = a.get("url", "")
            title       = a.get("title", "")

            # Prefer trusted high-credibility sources for corroboration
            is_trusted = any(t.lower() in source_name.lower() for t in TRUSTED_SOURCE_NAMES)

            if url and title and "[Removed]" not in title:
                results.append({
                    "title":       title,
                    "url":         url,
                    "source":      source_name,
                    "trusted":     is_trusted,
                    "published_at":a.get("publishedAt", ""),
                    "description": (a.get("description") or "")[:150],
                })

        # Sort: trusted sources first
        results.sort(key=lambda x: (0 if x["trusted"] else 1))

        return results[:3]  # Max 3 corroborating sources per claim

    except Exception as e:
        print(f"Claim corroboration error: {e}")
        return _claim_search_links(query, claim, status)


def _build_claim_query(claim: str, region: str) -> str:
    """Extract a clean 4-6 word search query from a claim."""
    # Remove common filler words
    stop = {
        "the","a","an","is","are","was","were","has","have","had",
        "that","this","these","those","and","or","but","of","in",
        "on","at","to","for","with","by","from","as","be","been",
        "will","would","could","should","may","might","it","its",
        "he","she","they","their","our","we","you","i","about",
        "according","said","says","told","report","reports",
    }

    words = claim.lower().split()
    keywords = [w.rstrip(".,;:!?") for w in words if w.rstrip(".,;:!?") not in stop and len(w) > 3]
    query_words = keywords[:5]

    if region and len(query_words) < 4:
        query_words.append(region.split()[0] if region else "")

    return " ".join(query_words[:6])


def _claim_search_links(query: str, claim: str, status: str) -> list[dict]:
    """Fallback: return curated search links when no NewsAPI key."""
    q = query.replace(" ", "+")
    return [
        {
            "title":       f"Search Reuters: {query}",
            "url":         f"https://www.reuters.com/search/news?blob={q}",
            "source":      "Reuters",
            "trusted":     True,
            "description": "Search Reuters for independent coverage of this claim.",
        },
        {
            "title":       f"Search AP News: {query}",
            "url":         f"https://apnews.com/search?query={q}",
            "source":      "AP News",
            "trusted":     True,
            "description": "Search Associated Press for corroborating reports.",
        },
    ]


def _smart_search_links(query: str) -> list[dict]:
    """Smart fallback search links based on topic."""
    q   = query.replace(" ", "+")
    enc = query.replace(" ", "%20")
    return [
        {
            "source":      "BBC News",
            "title":       f"BBC coverage: {query}",
            "url":         f"https://www.bbc.com/search?q={q}",
            "description": "Search BBC News for related coverage",
        },
        {
            "source":      "Al Jazeera",
            "title":       f"Al Jazeera coverage: {query}",
            "url":         f"https://www.aljazeera.com/search/{enc}",
            "description": "Search Al Jazeera for related coverage",
        },
        {
            "source":      "Reuters",
            "title":       f"Reuters coverage: {query}",
            "url":         f"https://www.reuters.com/search/news?blob={q}",
            "description": "Search Reuters for related coverage",
        },
    ]