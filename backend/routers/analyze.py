import re
from urllib.parse import urlparse
from services.news_service import search_same_story

def _normalize_domain(d: str) -> str:
    d = (d or "").lower().strip()
    if d.startswith("www."):
        d = d[4:]
    return d

def _tokenize(text: str) -> list[str]:
    stop = {
        "the","a","an","and","or","but","for","with","from","into","onto","about",
        "this","that","these","those","was","were","is","are","be","been","being",
        "have","has","had","will","would","could","should","may","might","not",
        "as","at","by","to","of","in","on","after","before","during","over","under",
        "amid","amidst","says","said","report","reports","update","live","breaking"
    }
    words = re.findall(r"[a-zA-Z0-9]+", (text or "").lower())
    return [w for w in words if len(w) > 2 and w not in stop]

def _keyword_set(text: str, max_terms: int = 10) -> set[str]:
    toks = _tokenize(text)
    # preserve order, unique
    seen, out = set(), []
    for t in toks:
        if t not in seen:
            seen.add(t)
            out.append(t)
        if len(out) >= max_terms:
            break
    return set(out)

def _is_non_article_url(url: str) -> bool:
    """
    Generic URL filter (not outlet-specific).
    """
    u = (url or "").lower()
    bad_fragments = [
        "/search", "search?", "/tag/", "/tags/", "/topic/", "/topics/",
        "/video", "/videos", "/live", "/author/", "/authors/", "/category/"
    ]
    return any(x in u for x in bad_fragments)

def _title_similarity(a: str, b: str) -> float:
    """
    Jaccard overlap over keyword sets.
    """
    A = _keyword_set(a, max_terms=12)
    B = _keyword_set(b, max_terms=12)
    if not A or not B:
        return 0.0
    inter = len(A & B)
    union = len(A | B)
    return inter / union if union else 0.0

def _build_query(title: str, conflict_region: str) -> str:
    """
    Query that generalizes across any article URL.
    """
    t = " ".join((title or "").split())
    r = " ".join((conflict_region or "").split())

    # Prefer title keywords; optionally append region
    title_kw = " ".join(list(_keyword_set(t, max_terms=8)))
    region_kw = " ".join(list(_keyword_set(r, max_terms=3)))

    query = title_kw or t[:90] or r[:90]
    if region_kw and region_kw not in query:
        query = f"{query} {region_kw}"

    return query[:120].strip()

def _get_related(title: str, conflict_region: str, source: str) -> list[dict]:
    """
    Return truly related coverage for ANY news URL:
    - no hardcoded news outlet/domain logic
    - generic scoring by title similarity + quality checks
    """
    src_domain = _normalize_domain(source)
    base_title = (title or "").strip()
    query = _build_query(base_title, conflict_region)

    # Pull more candidates, then rank
    candidates = search_same_story(query, exclude_domain=src_domain, limit=12) or []

    ranked = []
    seen_urls = set()

    for item in candidates:
        c_title = (item.get("title") or "").strip()
        c_url = (item.get("url") or "").strip()
        c_source = _normalize_domain(item.get("source") or urlparse(c_url).netloc)

        if not c_title or not c_url or not c_url.startswith("http"):
            continue
        if c_url in seen_urls:
            continue
        if c_title.startswith("Search for:"):
            continue
        if _is_non_article_url(c_url):
            continue
        if src_domain and c_source and src_domain in c_source:
            continue  # avoid same publisher echo

        sim = _title_similarity(base_title, c_title)

        # light quality bonus (trusted flag from news_service if present)
        trusted_bonus = 0.08 if item.get("trusted") else 0.0
        score = sim + trusted_bonus

        # keep only minimally related
        if sim >= 0.12:
            ranked.append((score, item))
            seen_urls.add(c_url)

    ranked.sort(key=lambda x: x[0], reverse=True)
    best = [x[1] for x in ranked[:3]]

    if best:
        return best

    # Generic fallback (not tied to specific story parser assumptions)
    topic = (query or base_title or conflict_region or "latest news").replace(" ", "+")
    return [
        {
            "source": "Google News",
            "title": f"Search coverage: {base_title[:60] or 'this topic'}",
            "url": f"https://news.google.com/search?q={topic}",
            "description": "Search broad news coverage for this topic.",
        },
        {
            "source": "Bing News",
            "title": f"Bing News coverage: {base_title[:60] or 'this topic'}",
            "url": f"https://www.bing.com/news/search?q={topic}",
            "description": "Alternative news search results for this topic.",
        },
        {
            "source": "DuckDuckGo News",
            "title": f"DuckDuckGo news: {base_title[:60] or 'this topic'}",
            "url": f"https://duckduckgo.com/?q={topic}&iar=news&ia=news",
            "description": "Independent news search for corroborating reports.",
        },
    ]