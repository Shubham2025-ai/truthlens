import httpx
from bs4 import BeautifulSoup
import re
import json
from urllib.parse import urlparse
import time

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
]

SECTION_PATTERNS = [
    r"^https?://[^/]+/?$",
    r"^https?://[^/]+/(news|world|politics|topics|tag|tags|category|section|hub|search|business|technology|science|health|entertainment)/?$",
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
    domain = urlparse(url).netloc.replace("www.", "")
    for blocked, msg in BLOCKED_SITES.items():
        if blocked in domain:
            raise ValueError(msg)
    for pattern in SECTION_PATTERNS:
        if re.search(pattern, url, re.IGNORECASE):
            raise ValueError(
                "This looks like a section page, not a specific article. "
                "Please paste the URL of one individual news article."
            )


def _headers(ua: str, referer: str = "https://www.google.com/") -> dict:
    return {
        "User-Agent": ua,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": referer,
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
    }


def _try_reuters_json(url: str) -> str | None:
    """
    Reuters embeds article JSON-LD in the page.
    Try fetching the page and extracting structured data directly.
    Also try Reuters' internal API pattern.
    """
    domain = urlparse(url).netloc
    if "reuters" not in domain:
        return None

    # Reuters specific headers that mimic a real browser better
    reuters_headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "max-age=0",
        "Referer": "https://www.google.com/search?q=reuters+news",
        "Sec-Ch-Ua": '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "cross-site",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
    }

    try:
        resp = httpx.get(url, headers=reuters_headers, timeout=25,
                         follow_redirects=True)
        if resp.status_code == 200 and len(resp.text) > 500:
            html = resp.text
            soup = BeautifulSoup(html, "lxml")

            # Try JSON-LD structured data first (most reliable for Reuters)
            for script in soup.find_all("script", {"type": "application/ld+json"}):
                try:
                    data = json.loads(script.string or "")
                    # Handle both single object and list
                    items = data if isinstance(data, list) else [data]
                    for item in items:
                        if item.get("@type") in ("NewsArticle", "Article", "ReportageNewsArticle"):
                            body = item.get("articleBody", "")
                            if len(body) > 200:
                                return body
                except Exception:
                    continue

            # Try Next.js __NEXT_DATA__ embedded JSON
            next_data = soup.find("script", {"id": "__NEXT_DATA__"})
            if next_data:
                try:
                    nd = json.loads(next_data.string or "")
                    # Traverse the Next.js data structure for article content
                    story = (nd.get("props", {})
                               .get("pageProps", {})
                               .get("story", {}))
                    if not story:
                        # Try alternate path
                        story = (nd.get("props", {})
                                   .get("initialState", {})
                                   .get("story", {})
                                   .get("story", {}))

                    # Extract body from content_elements
                    elements = story.get("content_elements", [])
                    if not elements:
                        elements = story.get("items", [])

                    texts = []
                    for el in elements:
                        if isinstance(el, dict):
                            if el.get("type") == "text":
                                texts.append(el.get("content", ""))
                            elif el.get("type") == "paragraph":
                                texts.append(el.get("text", "") or el.get("content", ""))
                    text = " ".join(t for t in texts if t)
                    if len(text) > 200:
                        return _clean_text(text)
                except Exception:
                    pass

            # Return full HTML for normal parsing fallback
            return html
    except Exception:
        pass
    return None


def _fetch_html(url: str) -> str:
    """Multi-strategy fetch with site-specific handling."""
    domain = urlparse(url).netloc

    # Reuters: use dedicated handler
    if "reuters" in domain:
        result = _try_reuters_json(url)
        if result:
            return result

    strategies = [
        _headers(USER_AGENTS[0]),
        _headers(USER_AGENTS[1], referer=f"https://{domain}/"),
        _headers(USER_AGENTS[2]),
        _headers(USER_AGENTS[3], referer="https://news.google.com/"),
        # Minimal headers — sometimes less is more
        {"User-Agent": USER_AGENTS[0], "Accept": "text/html,*/*"},
    ]

    last_status = None
    for i, hdrs in enumerate(strategies):
        if i > 0:
            time.sleep(0.4)
        try:
            resp = httpx.get(url, headers=hdrs, timeout=25, follow_redirects=True)
            if resp.status_code == 200 and len(resp.text) > 500:
                return resp.text
            last_status = resp.status_code
            if resp.status_code in (401, 410, 451):
                break
        except httpx.TimeoutException:
            raise ValueError("Request timed out. Please try again.")
        except Exception as e:
            if i == len(strategies) - 1:
                raise ValueError(f"Could not reach URL: {str(e)}")

    # All failed — return stub for Groq source-reputation fallback
    return ""


def extract_article(url: str) -> dict:
    validate_url(url)

    domain = urlparse(url).netloc.replace("www.", "")

    html_or_text = _fetch_html(url)

    # If we got clean article text back directly (e.g. from Reuters JSON-LD)
    # and it's not HTML, use it directly
    if html_or_text and not html_or_text.strip().startswith("<"):
        content = _clean_text(html_or_text)
        title = _title_from_url(url)
        return {
            "title": title,
            "description": "",
            "content": content,
            "url": url,
            "source": domain,
            "image": "",
            "published_at": "",
            "word_count": len(content.split()),
            "scrape_failed": False,
        }

    if not html_or_text:
        # Graceful fallback — let Groq analyze from source reputation
        return _stub_result(url, domain)

    soup = BeautifulSoup(html_or_text, "lxml")

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
            soup.title.string.strip() if soup.title else _title_from_url(url))

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

    # If content too short, use description as fallback
    if len(content) < 150 and description:
        content = f"{title}. {description}"

    if len(content) < 100:
        return _stub_result(url, domain, title=title, image=image)

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


def _stub_result(url: str, domain: str, title: str = "", image: str = "") -> dict:
    """Graceful fallback — Groq will analyze from source reputation."""
    return {
        "title": title or _title_from_url(url),
        "description": "",
        "content": f"URL: {url}\nSource: {domain}\nTitle: {title}",
        "url": url,
        "source": domain,
        "image": image,
        "published_at": "",
        "word_count": 0,
        "scrape_failed": True,
    }


def _title_from_url(url: str) -> str:
    """Extract a readable title from the URL slug."""
    path = urlparse(url).path
    slug = path.rstrip("/").split("/")[-1]
    # Remove date patterns and IDs
    slug = re.sub(r"-\d{4}-\d{2}-\d{2}$", "", slug)
    slug = re.sub(r"-[a-z0-9]{8,}$", "", slug)
    return slug.replace("-", " ").title() if slug else "Article"


def _extract_content(soup: BeautifulSoup, url: str = "") -> str:
    domain = urlparse(url).netloc if url else ""

    # Reuters specific
    if "reuters" in domain:
        # Try JSON-LD first
        for script in soup.find_all("script", {"type": "application/ld+json"}):
            try:
                data = json.loads(script.string or "")
                items = data if isinstance(data, list) else [data]
                for item in items:
                    body = item.get("articleBody", "")
                    if len(body) > 200:
                        return _clean_text(body)
            except Exception:
                pass
        # Reuters HTML selectors
        for sel in ['[class*="article-body"]', '[class*="ArticleBody"]',
                    '[class*="Body__content"]', '[class*="StandardArticleBody"]',
                    '[data-testid="paragraph-0"]', '.article-body__content']:
            els = soup.select(sel)
            if els:
                text = _clean_text(" ".join(e.get_text(" ", strip=True) for e in els))
                if len(text) > 150:
                    return text

    # Al Jazeera
    if "aljazeera" in domain:
        for sel in [".wysiwyg", ".article-p-wrapper", '[class*="article__body"]',
                    "#article-body", ".main-article-body"]:
            el = soup.select_one(sel)
            if el:
                text = _clean_text(el.get_text(" ", strip=True))
                if len(text) > 150:
                    return text

    # BBC
    if "bbc" in domain:
        els = soup.select("[data-component='text-block']")
        if els:
            text = _clean_text(" ".join(e.get_text(" ", strip=True) for e in els))
            if len(text) > 150:
                return text

    # Guardian
    if "theguardian" in domain:
        for sel in [".article-body-commercial-selector", ".content__article-body",
                    '[class*="ArticleBody"]', '[data-gu-name="body"]']:
            el = soup.select_one(sel)
            if el:
                text = _clean_text(el.get_text(" ", strip=True))
                if len(text) > 150:
                    return text

    # AP News
    if "apnews" in domain:
        for sel in [".Article", ".RichTextStoryBody", '[class*="Article-"]',
                    ".article-body", '[data-key="article"]']:
            el = soup.select_one(sel)
            if el:
                text = _clean_text(el.get_text(" ", strip=True))
                if len(text) > 150:
                    return text

    # DW
    if "dw" in domain:
        for sel in [".longText", ".article-content", "#bodytext", ".content-area"]:
            el = soup.select_one(sel)
            if el:
                text = _clean_text(el.get_text(" ", strip=True))
                if len(text) > 150:
                    return text

    # Generic fallbacks
    for sel in [
        "[itemprop='articleBody']", "article",
        ".article-body", ".article__body", ".article-content",
        ".story-body", ".story__body", ".post-content",
        ".entry-content", ".content-body", ".news-body",
        ".ArticleBody", ".article-text", "#content", "main",
    ]:
        el = soup.select_one(sel)
        if el:
            text = _clean_text(el.get_text(" ", strip=True))
            if len(text) > 150:
                return text

    # Last resort: all paragraphs
    paras = soup.find_all("p")
    text = " ".join(p.get_text(strip=True) for p in paras if len(p.get_text(strip=True)) > 40)
    return _clean_text(text)


def _clean_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[^\x20-\x7E\u00A0-\u024F\n]", "", text)
    return text.strip()