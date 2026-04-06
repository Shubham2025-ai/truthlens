import os
import httpx
from dotenv import load_dotenv

load_dotenv()

NEWS_API_KEY = os.getenv("NEWS_API_KEY")
BASE_URL = "https://newsapi.org/v2"


def search_same_story(query: str, exclude_domain: str = "", limit: int = 3) -> list[dict]:
    """Find same story from multiple sources."""
    if not NEWS_API_KEY:
        print("NEWS_API_KEY not set — using fallback search links")
        return _get_fallback_sources(query)

    try:
        params = {
            "q": query[:100],
            "language": "en",
            "sortBy": "relevancy",
            "pageSize": 10,
            "apiKey": NEWS_API_KEY,
        }
        resp = httpx.get(f"{BASE_URL}/everything", params=params, timeout=10)
        data = resp.json()

        # Surface API errors clearly instead of silently falling back
        status = data.get("status")
        if status != "ok":
            code = data.get("code", "unknown")
            msg = data.get("message", "")
            print(f"NewsAPI error [{code}]: {msg} — using fallback")
            return _get_fallback_sources(query)

        articles = data.get("articles", [])
        if not articles:
            print(f"NewsAPI returned 0 results for query: '{query}' — using fallback")
            return _get_fallback_sources(query)

        seen_domains = set()
        if exclude_domain:
            seen_domains.add(exclude_domain)

        results = []
        for a in articles:
            source = a.get("source", {}).get("name", "Unknown")
            url = a.get("url", "")
            if not url or source in seen_domains:
                continue
            seen_domains.add(source)
            results.append({
                "title": a.get("title", ""),
                "url": url,
                "source": source,
                "description": a.get("description", ""),
                "published_at": a.get("publishedAt", ""),
                "image": a.get("urlToImage", ""),
            })
            if len(results) >= limit:
                break

        # If API worked but returned nothing useful, still give fallback links
        if not results:
            return _get_fallback_sources(query)

        return results

    except httpx.TimeoutException:
        print(f"NewsAPI timeout for query: '{query}' — using fallback")
        return _get_fallback_sources(query)
    except Exception as e:
        print(f"NewsAPI error: {e} — using fallback")
        return _get_fallback_sources(query)


def _get_fallback_sources(query: str) -> list[dict]:
    """Fallback: search links to major sources so the section always shows something."""
    q = query.replace(" ", "+")
    q_encoded = query.replace(" ", "%20")
    return [
        {
            "source": "BBC News",
            "title": f'Search BBC for: "{query}"',
            "url": f"https://www.bbc.com/search?q={q}",
            "description": "Search BBC News for related coverage",
            "published_at": "",
            "image": "",
        },
        {
            "source": "Reuters",
            "title": f'Search Reuters for: "{query}"',
            "url": f"https://www.reuters.com/search/news?blob={q}",
            "description": "Search Reuters for related coverage",
            "published_at": "",
            "image": "",
        },
        {
            "source": "Al Jazeera",
            "title": f'Search Al Jazeera for: "{query}"',
            "url": f"https://www.aljazeera.com/search/{q_encoded}",
            "description": "Search Al Jazeera for related coverage",
            "published_at": "",
            "image": "",
        },
    ]