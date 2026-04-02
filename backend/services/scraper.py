import httpx
from bs4 import BeautifulSoup
import re
import json
from urllib.parse import urlparse, quote
import time

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
]

SECTION_PATTERNS = [
    r"^https?://[^/]+/?$",
    r"^https?://[^/]+/(news|world|politics|topics|tag|tags|category|section|hub|search|business|technology)/?$",
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
    }


def _try_jina(url: str) -> str | None:
    """Jina Reader API — free, no key, bypasses most paywalls."""
    try:
        jina_url = f"https://r.jina.ai/{url}"
        resp = httpx.get(
            jina_url,
            headers={
                "User-Agent": USER_AGENTS[0],
                "Accept": "text/plain",
                "X-Return-Format": "text",
                "X-No-Cache": "true",
            },
            timeout=30,
            follow_redirects=True,
        )
        if resp.status_code == 200:
            text = resp.text.strip()
            # Jina returns markdown — strip the header metadata lines
            lines = text.split("\n")
            content_lines = []
            skip_header = True
            for line in lines:
                if skip_header:
                    if line.startswith("Title:") or line.startswith("URL Source:") or \
                       line.startswith("Published Time:") or line.startswith("Markdown Content:"):
                        continue
                    if line.strip() == "" and not content_lines:
                        continue
                    skip_header = False
                content_lines.append(line)
            content = "\n".join(content_lines).strip()
            # Remove markdown formatting
            content = re.sub(r"#{1,6}\s+", "", content)
            content = re.sub(r"\*\*(.+?)\*\*", r"\1", content)
            content = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", content)
            content = re.sub(r"\n{3,}", "\n\n", content)
            content = _clean_text(content)
            if len(content) > 300:
                return content
    except Exception:
        pass
    return None


def _try_allorigins(url: str) -> str | None:
    """AllOrigins proxy — free CORS proxy."""
    try:
        proxy = f"https://api.allorigins.win/get?url={quote(url)}"
        resp = httpx.get(proxy, timeout=20, follow_redirects=True)
        if resp.status_code == 200:
            data = resp.json()
            html = data.get("contents", "")
            if len(html) > 500:
                return html
    except Exception:
        pass
    return None


def _try_direct(url: str) -> str | None:
    """Direct fetch with multiple user agents."""
    domain = urlparse(url).netloc

    attempts = [
        _headers(USER_AGENTS[0]),
        _headers(USER_AGENTS[1], referer=f"https://{domain}/"),
        _headers(USER_AGENTS[2]),
        {
            "User-Agent": USER_AGENTS[0],
            "Accept": "text/html,*/*",
            "Referer": "https://www.google.com/",
        },
    ]

    for i, hdrs in enumerate(attempts):
        if i > 0:
            time.sleep(0.3)
        try:
            resp = httpx.get(url, headers=hdrs, timeout=20, follow_redirects=True)
            if resp.status_code == 200 and len(resp.text) > 500:
                return resp.text
        except Exception:
            continue
    return None


def _extract_from_html(html: str, url: str) -> tuple[str, str, str, str, str]:
    """Extract title, description, image, pub_date, content from HTML."""
    soup = BeautifulSoup(html, "lxml")

    for tag in soup(["script", "style", "nav", "footer", "header", "aside", "iframe", "noscript"]):
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
            soup.title.string.strip() if soup.title else "")

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

    # Date
    pub_date = ""
    for sel in [{"property": "article:published_time"}, {"name": "article:published_time"}, {"itemprop": "datePublished"}]:
        m = soup.find("meta", sel)
        if m and m.get("content"):
            pub_date = m["content"]
            break
    if not pub_date:
        t = soup.find("time")
        if t:
            pub_date = t.get("datetime", "")

    # Content
    content = _extract_content(soup, url)

    return title, description, image, pub_date, content


def extract_article(url: str) -> dict:
    validate_url(url)
    domain = urlparse(url).netloc.replace("www.", "")

    title = ""
    description = ""
    image = ""
    pub_date = ""
    content = ""

    # Strategy 1: Direct fetch
    html = _try_direct(url)
    if html:
        title, description, image, pub_date, content = _extract_from_html(html, url)

    # Strategy 2: Jina Reader (best for blocked sites like Reuters)
    if len(content) < 300:
        jina_content = _try_jina(url)
        if jina_content and len(jina_content) > len(content):
            content = jina_content
            # If we didn't get title from HTML, try to extract from Jina output
            if not title:
                title = _title_from_url(url)

    # Strategy 3: AllOrigins proxy
    if len(content) < 300:
        proxy_html = _try_allorigins(url)
        if proxy_html:
            pt, pd, pi, pp, pc = _extract_from_html(proxy_html, url)
            if len(pc) > len(content):
                content = pc
                title = title or pt
                description = description or pd
                image = image or pi
                pub_date = pub_date or pp

    # If still no title, derive from URL
    if not title:
        title = _title_from_url(url)

    # Final fallback — stub for Groq source-reputation
    scrape_failed = len(content) < 200
    if scrape_failed:
        content = f"URL: {url}\nSource: {domain}\nTitle: {title}\nDescription: {description}"

    return {
        "title": title.strip(),
        "description": description.strip(),
        "content": content.strip(),
        "url": url,
        "source": domain,
        "image": image,
        "published_at": pub_date,
        "word_count": len(content.split()) if not scrape_failed else 0,
        "scrape_failed": scrape_failed,
    }


def _title_from_url(url: str) -> str:
    path = urlparse(url).path
    slug = path.rstrip("/").split("/")[-1]
    slug = re.sub(r"-\d{4}-\d{2}-\d{2}$", "", slug)
    slug = re.sub(r"-[a-z0-9]{8,}$", "", slug)
    return slug.replace("-", " ").title() if slug else "Article"


def _extract_content(soup: BeautifulSoup, url: str = "") -> str:
    domain = urlparse(url).netloc if url else ""

    # Try JSON-LD structured data first (works for Reuters, AP, Guardian)
    for script in soup.find_all("script", {"type": "application/ld+json"}):
        try:
            data = json.loads(script.string or "")
            items = data if isinstance(data, list) else [data]
            for item in items:
                if item.get("@type") in ("NewsArticle", "Article", "ReportageNewsArticle"):
                    body = item.get("articleBody", "")
                    if len(body) > 300:
                        return _clean_text(body)
        except Exception:
            pass

    # Try Next.js __NEXT_DATA__
    next_data = soup.find("script", {"id": "__NEXT_DATA__"})
    if next_data:
        try:
            nd = json.loads(next_data.string or "")
            story = (nd.get("props", {}).get("pageProps", {}).get("story", {}))
            elements = story.get("content_elements", []) or story.get("items", [])
            texts = []
            for el in elements:
                if isinstance(el, dict):
                    t = el.get("content") or el.get("text") or ""
                    if t:
                        texts.append(t)
            text = _clean_text(" ".join(texts))
            if len(text) > 300:
                return text
        except Exception:
            pass

    # Site-specific selectors
    if "reuters" in domain:
        for sel in ['[class*="article-body"]', '[class*="ArticleBody"]',
                    '[class*="Body__content"]', '[data-testid*="paragraph"]']:
            els = soup.select(sel)
            if els:
                text = _clean_text(" ".join(e.get_text(" ", strip=True) for e in els))
                if len(text) > 200:
                    return text

    if "aljazeera" in domain:
        for sel in [".wysiwyg", ".article-p-wrapper", '[class*="article__body"]', "#article-body"]:
            el = soup.select_one(sel)
            if el:
                text = _clean_text(el.get_text(" ", strip=True))
                if len(text) > 200:
                    return text

    if "bbc" in domain:
        els = soup.select("[data-component='text-block']")
        if els:
            text = _clean_text(" ".join(e.get_text(" ", strip=True) for e in els))
            if len(text) > 200:
                return text

    if "theguardian" in domain:
        for sel in [".article-body-commercial-selector", ".content__article-body", '[data-gu-name="body"]']:
            el = soup.select_one(sel)
            if el:
                text = _clean_text(el.get_text(" ", strip=True))
                if len(text) > 200:
                    return text

    if "apnews" in domain:
        for sel in [".Article", ".RichTextStoryBody", '[class*="Article-"]', '[data-key="article"]']:
            el = soup.select_one(sel)
            if el:
                text = _clean_text(el.get_text(" ", strip=True))
                if len(text) > 200:
                    return text

    if "dw" in domain:
        for sel in [".longText", ".article-content", "#bodytext"]:
            el = soup.select_one(sel)
            if el:
                text = _clean_text(el.get_text(" ", strip=True))
                if len(text) > 200:
                    return text

    # Generic
    for sel in ["[itemprop='articleBody']", "article", ".article-body",
                ".article__body", ".story-body", ".post-content",
                ".entry-content", ".content-body", "main"]:
        el = soup.select_one(sel)
        if el:
            text = _clean_text(el.get_text(" ", strip=True))
            if len(text) > 200:
                return text

    # Last resort: paragraphs
    paras = soup.find_all("p")
    text = " ".join(p.get_text(strip=True) for p in paras if len(p.get_text(strip=True)) > 40)
    return _clean_text(text)


def _clean_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[^\x20-\x7E\u00A0-\u024F\n]", "", text)
    return text.strip()