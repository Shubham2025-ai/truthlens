import httpx
from bs4 import BeautifulSoup
import re
from urllib.parse import urlparse
import random
import time

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
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


def validate_url(url: str) -> None:
    for pattern in SECTION_PATTERNS:
        if re.search(pattern, url, re.IGNORECASE):
            raise ValueError(
                "This looks like a section page, not a specific article. "
                "Please paste the URL of one individual news article."
            )


def _try_fetch(url: str, headers: dict, timeout: int = 20) -> httpx.Response | None:
    try:
        resp = httpx.get(url, headers=headers, timeout=timeout,
                         follow_redirects=True)
        if resp.status_code == 200 and len(resp.text) > 500:
            return resp
    except Exception:
        pass
    return None


def _build_headers(ua: str, referer: str = "https://www.google.com/") -> dict:
    return {
        "User-Agent": ua,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": referer,
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "cross-site",
        "Cache-Control": "max-age=0",
    }


def fetch_html(url: str) -> str:
    """
    Multi-strategy fetch — tries 6 different approaches before giving up.
    """
    domain = urlparse(url).netloc

    attempts = [
        # 1. Chrome on Windows with Google referer
        _build_headers(USER_AGENTS[0]),
        # 2. Safari on Mac
        _build_headers(USER_AGENTS[1], referer=f"https://{domain}/"),
        # 3. Firefox
        _build_headers(USER_AGENTS[2]),
        # 4. Chrome Linux
        _build_headers(USER_AGENTS[3], referer="https://news.google.com/"),
        # 5. Mobile Safari (some sites serve lighter pages to mobile)
        _build_headers(USER_AGENTS[4], referer="https://www.google.com/"),
        # 6. Minimal headers (sometimes less is more)
        {
            "User-Agent": USER_AGENTS[0],
            "Accept": "text/html,*/*",
        },
    ]

    for i, headers in enumerate(attempts):
        if i > 0:
            time.sleep(0.3)
        resp = _try_fetch(url, headers)
        if resp:
            return resp.text

    # All direct attempts failed — raise with clear message
    raise ValueError("FETCH_FAILED")


def extract_article(url: str) -> dict:
    validate_url(url)

    try:
        html = fetch_html(url)
    except ValueError as e:
        if "FETCH_FAILED" in str(e):
            # Return a stub so Groq can still analyze based on the URL alone
            domain = urlparse(url).netloc.replace("www.", "")
            return {
                "title": f"Article from {domain}",
                "description": "",
                "content": f"URL: {url}\n\nNote: Direct scraping was blocked by {domain}. Analyze this article based on the URL, domain reputation, and any context you have about this source.",
                "url": url,
                "source": domain,
                "image": "",
                "published_at": "",
                "word_count": 0,
                "scrape_failed": True,
            }
        raise

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
        title = h1.get_text(strip=True) if h1 else (
            soup.title.string.strip() if soup.title else "Unknown")

    # Description
    description = ""
    for attr, val in [("property", "og:description"), ("name", "description")]:
        m = soup.find("meta", {attr: val})
        if m and m.get("content"):
            description = m["content"]
            break

    # Image
    image = ""
    m = soup.find("meta", {"property": "og:image"})
    if m:
        image = m.get("content", "")

    domain = urlparse(url).netloc.replace("www.", "")

    # Published date
    pub_date = ""
    for selector in [
        {"property": "article:published_time"},
        {"name": "article:published_time"},
        {"itemprop": "datePublished"},
        {"name": "publishdate"},
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

    # If content too short, use description + title as minimal content
    if len(content) < 150:
        fallback = f"{title}. {description}".strip()
        if len(fallback) > 50:
            content = fallback
        else:
            # Last resort: dump all text from body
            body = soup.find("body")
            if body:
                content = _clean_text(body.get_text(separator=" ", strip=True))[:5000]

    if len(content) < 50:
        return {
            "title": title or f"Article from {domain}",
            "description": description,
            "content": f"URL: {url}\nSource: {domain}\nTitle: {title}\nDescription: {description}",
            "url": url,
            "source": domain,
            "image": image,
            "published_at": pub_date,
            "word_count": 0,
            "scrape_failed": True,
        }

    return {
        "title": title.strip(),
        "description": description.strip(),
        "content": content.strip(),
        "url": url,
        "source": domain,
        "image": image,
        "published_at": pub_date,
        "word_count": len(content.split()),
        "scrape_failed": False,
    }


def _extract_content(soup: BeautifulSoup, url: str = "") -> str:
    domain = urlparse(url).netloc if url else ""

    site_selectors = []
    if "aljazeera" in domain:
        site_selectors = [
            ".wysiwyg", ".article-p-wrapper",
            '[class*="article__body"]', "#article-body",
            ".main-article-body", ".article-body",
        ]
    elif "bbc" in domain:
        site_selectors = [
            "[data-component='text-block']",
            '[class*="RichTextComponentWrapper"]',
            ".story-body__inner", '[class*="ArticleWrapper"]',
        ]
    elif "reuters" in domain:
        site_selectors = [
            '[class*="article-body"]', '[class*="ArticleBody"]',
            ".StandardArticleBody_body", '[class*="Body__content"]',
        ]
    elif "theguardian" in domain:
        site_selectors = [
            ".article-body-commercial-selector",
            ".content__article-body",
            '[class*="ArticleBody"]',
            '[data-gu-name="body"]',
        ]
    elif "apnews" in domain:
        site_selectors = [
            ".Article", ".RichTextStoryBody",
            '[class*="Article-"]', ".article-body",
        ]
    elif "dw" in domain:
        site_selectors = [".longText", ".article-content", "#bodytext"]

    for sel in site_selectors:
        els = soup.select(sel)
        if els:
            text = _clean_text(" ".join(
                e.get_text(separator=" ", strip=True) for e in els))
            if len(text) > 150:
                return text

    for sel in [
        "[itemprop='articleBody']",
        "article",
        ".article-body", ".article__body", ".article-content",
        ".story-body", ".story__body", ".post-content",
        ".entry-content", ".content-body", ".news-body",
        ".ArticleBody", ".article-text",
        "#content", ".content", "main",
    ]:
        el = soup.select_one(sel)
        if el:
            text = _clean_text(el.get_text(separator=" ", strip=True))
            if len(text) > 150:
                return text

    # Fallback: all paragraphs
    paragraphs = soup.find_all("p")
    text = " ".join(
        p.get_text(strip=True) for p in paragraphs
        if len(p.get_text(strip=True)) > 30
    )
    return _clean_text(text)


def _clean_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[^\x20-\x7E\u00A0-\u024F\n]", "", text)
    return text.strip()