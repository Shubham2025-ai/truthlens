import os
import httpx
from dotenv import load_dotenv

load_dotenv()

NEWS_API_KEY = os.getenv("NEWS_API_KEY")
BASE_URL = "https://newsapi.org/v2"


def search_same_story(query: str, exclude_domain: str = "", limit: int = 3) -> list[dict]:
    """Find same story from multiple sources."""
    if not NEWS_API_KEY:
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
        articles = data.get("articles", [])

        seen_domains = set()
        if exclude_domain:
            seen_domains.add(exclude_domain)

        results = []
        for a in articles:
            source = a.get("source", {}).get("name", "Unknown")
            if source in seen_domains:
                continue
            seen_domains.add(source)
            results.append({
                "title": a.get("title", ""),
                "url": a.get("url", ""),
                "source": source,
                "description": a.get("description", ""),
                "published_at": a.get("publishedAt", ""),
                "image": a.get("urlToImage", ""),
            })
            if len(results) >= limit:
                break

        return results
    except Exception as e:
        print(f"NewsAPI error: {e}")
        return _get_fallback_sources(query)


def _get_fallback_sources(query: str) -> list[dict]:
    """Fallback if no API key — return suggested major sources."""
    return [
        {"source": "BBC News", "title": f"Search for: {query}", "url": f"https://www.bbc.com/search?q={query.replace(' ', '+')}"},
        {"source": "Al Jazeera", "title": f"Search for: {query}", "url": f"https://www.aljazeera.com/search/{query.replace(' ', '+')}"},
        {"source": "Reuters", "title": f"Search for: {query}", "url": f"https://www.reuters.com/search/news?blob={query.replace(' ', '+')}"},
    ]
