import httpx
from bs4 import BeautifulSoup
import re
from urllib.parse import urlparse

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Googlebot/2.1 (+http://www.google.com/bot.html)",
]

SECTION_PATTERNS = [
    r"^https?://[^/]+/?$",
    r"^https?://[^/]+/(news|world|politics|topics|tag|tags|category|section|hub|search)/?$",
    r"/topics/[^/]+/?$",
    r"/tag/[^/]+/?$",
    r"/category/[^/]+/?$",
    r"/hub/[^/]+/?$",
    r"/search[/?]",
    r"/page/\d+/?$",
]

BLOCKED_SITES = {
    "nytimes.com": "NYT blocks scraping. Try AP News, Guardian, or DW News.",
    "wsj.com": "WSJ is paywalled. Try Reuters or AP News.",
    "ft.com": "FT blocks scraping. Try Reuters or AP News.",
    "bloomberg.com": "Bloomberg blocks scraping. Try Reuters or AP News.",
}


def validate_url(url: str) -> None:
    parsed = urlparse(url)
    domain = parsed.netloc.replace("www.", "")
    for blocked, msg in BLOCKED_SITES.items():
        if blocked in domain:
            raise ValueError(msg)
    for pattern in SECTION_PATTERNS:
        if re.search(pattern, url, re.IGNORECASE):
            raise ValueError(
                "This looks like a section page, not a specific article. "
                "Please paste the URL of one individual news article."
            )


def _fetch_direct(url: str) -> str | None:
    """Try direct fetch with multiple user agents."""
    strategies = [
        {
            "User-Agent": USER_AGENTS[0],
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://www.google.com/",
            "Cache-Control": "max-age=0",
        },
        {
            "User-Agent": USER_AGENTS[2],  # Googlebot
            "Accept": "text/html,application/xhtml+xml",
        },
        {
            "User-Agent": USER_AGENTS[1],
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-GB,en;q=0.9",
            "Referer": f"https://{urlparse(url).netloc}/",
        },
    ]
    for headers in strategies:
        try:
            resp = httpx.get(url, headers=headers, timeout=20, follow_redirects=True)
            if resp.status_code == 200 and len(resp.text) > 500:
                return resp.text
        except Exception:
            continue
    return None


def _fetch_via_jina(url: str) -> str | None:
    """
    Use Jina Reader API (r.jina.ai) as fallback.
    Free, no API key needed. Returns clean article text.
    """
    try:
        jina_url = f"https://r.jina.ai/{url}"
        headers = {
            "User-Agent": USER_AGENTS[0],
            "Accept": "text/plain, text/html",
            "X-Return-Format": "text",
        }
        resp = httpx.get(jina_url, headers=headers, timeout=30, follow_redirects=True)
        if resp.status_code == 200 and len(resp.text) > 300:
            return resp.text
    except Exception:
        pass
    return None


def _fetch_via_webcache(url: str) -> str | None:
    """Try AllOrigins proxy as second fallback."""
    try:
        proxy_url = f"https://api.allorigins.win/get?url={url}"
        resp = httpx.get(proxy_url, timeout=20, follow_redirects=True)
        if resp.status_code == 200:
            data = resp.json()
            content = data.get("contents", "")
            if len(content) > 500:
                return content
    except Exception:
        pass
    return None


def extract_article(url: str) -> dict:
    validate_url(url)

    # Strategy 1: direct fetch
    html = _fetch_direct(url)
    jina_text = None

    # Strategy 2: Jina Reader API (best fallback — extracts clean text directly)
    if not html:
        jina_text = _fetch_via_jina(url)

    # Strategy 3: AllOrigins proxy
    if not html and not jina_text:
        html = _fetch_via_webcache(url)

    if not html and not jina_text:
        raise ValueError(
            "Could not access this article. The site may be blocking all automated access.\n"
            "Please try: apnews.com · theguardian.com · dw.com · reuters.com"
        )

    domain = urlparse(url).netloc.replace("www.", "")

    # If Jina gave us clean text, use it directly (already extracted)
    if jina_text and not html:
        return _parse_jina_text(jina_text, url, domain)

    # Parse HTML normally
    soup = BeautifulSoup(html, "lxml")

    for tag in soup(["script", "style", "nav", "footer", "header",
                     "aside", "iframe", "noscript"]):
        tag.decompose()

    # Title
    title = ""
    for attr, val in [("property", "og:title"), ("name", "twitter:title")]:
        m = soup.find("meta", {attr: val})
        if m and m.get("content"):
            title = m["content"]
            break
    if not title:
        h1 = soup.find("h1")
        title = h1.get_text(strip=True) if h1 else (soup.title.string if soup.title else "Unknown")

    description = ""
    for attr, val in [("property", "og:description"), ("name", "description")]:
        m = soup.find("meta", {attr: val})
        if m and m.get("content"):
            description = m["content"]
            break

    image = ""
    m = soup.find("meta", {"property": "og:image"})
    if m:
        image = m.get("content", "")

    pub_date = ""
    for selector in [
        {"property": "article:published_time"},
        {"name": "article:published_time"},
        {"itemprop": "datePublished"},
    ]:
        m = soup.find("meta", selector)
        if m and m.get("content"):
            pub_date = m["content"]
            break
    if not pub_date:
        t = soup.find("time")
        if t:
            pub_date = t.get("datetime", "")

    content = _extract_content(soup, url)

    # If HTML parsing got nothing, try Jina as content fallback
    if len(content) < 150:
        jina_text = jina_text or _fetch_via_jina(url)
        if jina_text:
            parsed = _parse_jina_text(jina_text, url, domain)
            if len(parsed.get("content", "")) > 150:
                parsed["title"] = parsed["title"] or title
                parsed["image"] = image
                parsed["description"] = description
                return parsed

    if len(content) < 150:
        raise ValueError(
            "Could not extract article text. The page may be a video or uses heavy JavaScript.\n"
            "Try: apnews.com · theguardian.com · dw.com · reuters.com"
        )

    return {
        "title": title.strip(),
        "description": description.strip(),
        "content": content.strip(),
        "url": url,
        "source": domain,
        "image": image,
        "published_at": pub_date,
        "word_count": len(content.split()),
    }


def _parse_jina_text(text: str, url: str, domain: str) -> dict:
    """Parse Jina Reader plain text output into article dict."""
    lines = text.strip().split("\n")

    # Jina format: first non-empty line is usually the title
    title = ""
    content_lines = []
    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped:
            continue
        if not title and len(stripped) > 10:
            # Skip Jina metadata lines
            if stripped.startswith("Title:"):
                title = stripped.replace("Title:", "").strip()
            elif stripped.startswith("URL Source:") or stripped.startswith("Markdown Content:"):
                continue
            elif not title:
                title = stripped
        else:
            content_lines.append(stripped)

    content = _clean_text(" ".join(content_lines))

    return {
        "title": title,
        "description": "",
        "content": content,
        "url": url,
        "source": domain,
        "image": "",
        "published_at": "",
        "word_count": len(content.split()),
    }


def _extract_content(soup: BeautifulSoup, url: str = "") -> str:
    domain = urlparse(url).netloc if url else ""

    site_selectors = []
    if "aljazeera" in domain:
        site_selectors = [".wysiwyg", ".article-p-wrapper", '[class*="article__body"]', "#article-body"]
    elif "bbc" in domain:
        site_selectors = ["[data-component='text-block']", '[class*="RichTextComponentWrapper"]', ".story-body__inner"]
    elif "reuters" in domain:
        site_selectors = ['[class*="article-body"]', '[class*="ArticleBody"]']
    elif "theguardian" in domain:
        site_selectors = [".article-body-commercial-selector", ".content__article-body", '[class*="ArticleBody"]']
    elif "apnews" in domain:
        site_selectors = [".Article", ".RichTextStoryBody", '[class*="Article-"]']
    elif "dw" in domain:
        site_selectors = [".longText", ".article-content", "#bodytext"]

    for sel in site_selectors:
        els = soup.select(sel)
        if els:
            text = _clean_text(" ".join(e.get_text(separator=" ", strip=True) for e in els))
            if len(text) > 150:
                return text

    for sel in [
        "[itemprop='articleBody']", "article",
        ".article-body", ".article__body", ".article-content",
        ".story-body", ".story__body", ".post-content",
        ".entry-content", ".content-body", ".news-body",
        ".ArticleBody", ".article-text", "main",
    ]:
        el = soup.select_one(sel)
        if el:
            text = _clean_text(el.get_text(separator=" ", strip=True))
            if len(text) > 150:
                return text

    paragraphs = soup.find_all("p")
    text = " ".join(p.get_text(strip=True) for p in paragraphs if len(p.get_text(strip=True)) > 40)
    return _clean_text(text)


def _clean_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[^\x20-\x7E\u00A0-\u024F\n]", "", text)
    return text.strip()