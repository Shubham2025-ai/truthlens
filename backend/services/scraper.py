"""
Scraper with 4-layer fallback:
1. Direct fetch (multiple user agents + headers)
2. Jina Reader API r.jina.ai (free, no key, bypasses most blocks)
3. HTML passed from browser (client-side fetch — bypasses server blocks entirely)
4. Stub for Groq source-reputation fallback
"""

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
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
]

# Only block pure section/listing pages — be permissive for article URLs
SECTION_PATTERNS = [
    r"^https?://[^/]+/?$",  # pure homepage
    r"/search[/?]",
    r"google\.com",
    r"twitter\.com/?$",
    r"facebook\.com/?$",
]

# Sites that are definitely paywalled — no point trying
HARD_PAYWALLED = {
    "wsj.com": "Wall Street Journal is paywalled. Try Reuters, AP News, or Guardian.",
    "ft.com": "Financial Times is paywalled. Try Reuters or AP News.",
    "barrons.com": "Barron's is paywalled. Try Reuters or AP News.",
}


def validate_url(url: str) -> None:
    domain = urlparse(url).netloc.replace("www.", "")
    for blocked, msg in HARD_PAYWALLED.items():
        if blocked in domain:
            raise ValueError(msg)
    for pattern in SECTION_PATTERNS:
        if re.search(pattern, url, re.IGNORECASE):
            raise ValueError(
                "This looks like a homepage or search page, not a specific article. "
                "Please paste the URL of one individual news article."
            )


def _make_headers(ua: str, referer: str = "https://www.google.com/") -> dict:
    return {
        "User-Agent": ua,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": referer,
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Ch-Ua": '"Google Chrome";v="123", "Not:A-Brand";v="8"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "cross-site",
        "Cache-Control": "no-cache",
    }


# ─── Layer 1: Direct fetch ────────────────────────────────────────────────────

def _try_direct(url: str) -> str | None:
    domain = urlparse(url).netloc
    attempts = [
        _make_headers(USER_AGENTS[0]),
        _make_headers(USER_AGENTS[1], referer=f"https://{domain}/"),
        _make_headers(USER_AGENTS[2]),
        _make_headers(USER_AGENTS[4]),  # mobile UA
        {"User-Agent": USER_AGENTS[0], "Accept": "text/html,*/*", "Cache-Control": "no-cache"},
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


# ─── Layer 2: Jina Reader API ─────────────────────────────────────────────────

def _try_jina(url: str) -> str | None:
    """
    Jina Reader — free, no key needed.
    Prepend r.jina.ai/ to any URL and get clean article text back.
    Bypasses Cloudflare, bot detection, and most paywalls.
    """
    try:
        jina_url = f"https://r.jina.ai/{url}"
        hdrs = {
            "User-Agent": USER_AGENTS[0],
            "Accept": "text/plain, text/html",
            "X-Return-Format": "text",
            "X-No-Cache": "true",
        }
        resp = httpx.get(jina_url, headers=hdrs, timeout=35, follow_redirects=True)
        if resp.status_code == 200:
            text = resp.text.strip()
            # Strip Jina metadata header lines
            lines = text.split("\n")
            body_lines = []
            in_body = False
            for line in lines:
                if line.startswith("Markdown Content:") or (in_body and line.strip()):
                    in_body = True
                    if line.startswith("Markdown Content:"):
                        continue
                if in_body:
                    body_lines.append(line)
                elif not any(line.startswith(p) for p in ("Title:", "URL Source:", "Published Time:", "Description:")):
                    if line.strip() and not in_body:
                        in_body = True
                        body_lines.append(line)

            # Clean markdown
            content = "\n".join(body_lines)
            content = re.sub(r"#{1,6}\s+", "", content)
            content = re.sub(r"\*\*(.+?)\*\*", r"\1", content)
            content = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", content)
            content = re.sub(r"\n{3,}", "\n\n", content)
            content = _clean_text(content)
            if len(content) > 300:
                return content
    except Exception as e:
        print(f"Jina error: {e}")
    return None


# ─── Layer 3: Browser-sent HTML ──────────────────────────────────────────────
# This is handled in analyze.py — browser fetches the page itself and sends
# the raw HTML to the /analyze/html endpoint. No server-side fetch needed.

def extract_from_html(html: str, url: str) -> dict:
    """
    Parse HTML that was fetched by the user's browser.
    Called from the /analyze/html endpoint.
    """
    domain = urlparse(url).netloc.replace("www.", "")
    soup = BeautifulSoup(html, "lxml")

    for tag in soup(["script", "style", "nav", "footer", "header", "aside", "iframe", "noscript"]):
        tag.decompose()

    title = _get_meta(soup, [("property", "og:title"), ("name", "twitter:title")])
    if not title:
        h1 = soup.find("h1")
        title = h1.get_text(strip=True) if h1 else (soup.title.string.strip() if soup.title else _title_from_url(url))

    description = _get_meta(soup, [("property", "og:description"), ("name", "description")])
    image = _get_meta(soup, [("property", "og:image")])
    pub_date = _get_meta(soup, [
        ("property", "article:published_time"),
        ("name", "article:published_time"),
        ("itemprop", "datePublished"),
    ])
    if not pub_date:
        t = soup.find("time")
        if t: pub_date = t.get("datetime", "")

    content = _extract_content(soup, url)

    return {
        "title": title.strip(),
        "description": description.strip(),
        "content": content.strip(),
        "url": url,
        "source": domain,
        "image": image,
        "published_at": pub_date,
        "word_count": len(content.split()),
        "scrape_failed": len(content) < 150,
        "method": "browser",
    }


# ─── Main entry point ─────────────────────────────────────────────────────────

def extract_article(url: str) -> dict:
    validate_url(url)
    domain = urlparse(url).netloc.replace("www.", "")

    # Layer 1: Direct fetch
    html = _try_direct(url)
    if html:
        result = _parse_html(html, url)
        if len(result.get("content", "")) >= 300:
            result["method"] = "direct"
            return result

    # Layer 2: Jina Reader
    jina_text = _try_jina(url)
    if jina_text and len(jina_text) >= 300:
        title = _title_from_url(url)
        # Try to get better title from direct HTML even if content was bad
        if html:
            soup = BeautifulSoup(html, "lxml")
            og = soup.find("meta", {"property": "og:title"})
            if og and og.get("content"):
                title = og["content"]
            img_meta = soup.find("meta", {"property": "og:image"})
            image = img_meta.get("content", "") if img_meta else ""
        else:
            image = ""
        return {
            "title": title,
            "description": "",
            "content": jina_text,
            "url": url,
            "source": domain,
            "image": image,
            "published_at": "",
            "word_count": len(jina_text.split()),
            "scrape_failed": False,
            "method": "jina",
        }

    # Layer 3: Return partial result — browser-side fetch will be triggered
    # by the frontend if scrape_failed=True and method="needs_browser"
    if html:
        result = _parse_html(html, url)
        result["method"] = "partial"
        result["scrape_failed"] = True
        return result

    # Layer 4: Stub — Groq will analyze from source+title knowledge
    return {
        "title": _title_from_url(url),
        "description": "",
        "content": f"URL: {url}\nSource: {domain}",
        "url": url,
        "source": domain,
        "image": "",
        "published_at": "",
        "word_count": 0,
        "scrape_failed": True,
        "method": "stub",
    }


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _parse_html(html: str, url: str) -> dict:
    domain = urlparse(url).netloc.replace("www.", "")
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script","style","nav","footer","header","aside","iframe","noscript"]):
        tag.decompose()

    title = _get_meta(soup, [("property","og:title"),("name","twitter:title")])
    if not title:
        h1 = soup.find("h1")
        title = h1.get_text(strip=True) if h1 else (soup.title.string.strip() if soup.title else _title_from_url(url))

    description = _get_meta(soup, [("property","og:description"),("name","description")])
    image = _get_meta(soup, [("property","og:image")])
    pub_date = _get_meta(soup, [
        ("property","article:published_time"),
        ("name","article:published_time"),
        ("itemprop","datePublished"),
    ])
    if not pub_date:
        t = soup.find("time")
        if t: pub_date = t.get("datetime","")

    content = _extract_content(soup, url)

    return {
        "title": title.strip(),
        "description": description.strip(),
        "content": content.strip(),
        "url": url,
        "source": domain,
        "image": image,
        "published_at": pub_date,
        "word_count": len(content.split()),
        "scrape_failed": len(content) < 150,
    }


def _get_meta(soup, attrs_list: list) -> str:
    for attr, val in attrs_list:
        m = soup.find("meta", {attr: val})
        if m and m.get("content"):
            return m["content"]
    return ""


def _extract_content(soup: BeautifulSoup, url: str = "") -> str:
    domain = urlparse(url).netloc if url else ""

    # JSON-LD structured data (works for Reuters, AP, Guardian, BBC, etc.)
    for script in soup.find_all("script", {"type": "application/ld+json"}):
        try:
            data = json.loads(script.string or "")
            items = data if isinstance(data, list) else [data]
            for item in items:
                if item.get("@type") in ("NewsArticle","Article","ReportageNewsArticle"):
                    body = item.get("articleBody","")
                    if len(body) > 300:
                        return _clean_text(body)
        except Exception:
            pass

    # Next.js __NEXT_DATA__
    nd = soup.find("script", {"id": "__NEXT_DATA__"})
    if nd:
        try:
            data = json.loads(nd.string or "")
            story = data.get("props",{}).get("pageProps",{}).get("story",{})
            els = story.get("content_elements",[]) or story.get("items",[])
            texts = [e.get("content","") or e.get("text","") for e in els if isinstance(e,dict)]
            text = _clean_text(" ".join(t for t in texts if t))
            if len(text) > 300:
                return text
        except Exception:
            pass

    # Site-specific selectors
    site_map = {
        "reuters":      ['[class*="article-body"]','[class*="ArticleBody"]','[class*="Body__content"]'],
        "aljazeera":    [".wysiwyg",".article-p-wrapper",'[class*="article__body"]',"#article-body"],
        "bbc":          ["[data-component='text-block']",'[class*="RichTextComponentWrapper"]'],
        "theguardian":  [".article-body-commercial-selector",".content__article-body",'[data-gu-name="body"]'],
        "apnews":       [".Article",".RichTextStoryBody",'[class*="Article-"]','[data-key="article"]'],
        "dw":           [".longText",".article-content","#bodytext"],
        "nytimes":      ['[class*="StoryBodyCompanionColumn"]','[data-testid="article-body"]','section[name="articleBody"]'],
        "washingtonpost": ['[data-qa="article-body"]','[class*="article-body"]'],
        "cnn":          [".article__content",".zn-body__paragraph",'[class*="article-body"]'],
        "foxnews":      [".article-body",".article-content",'[class*="article-content"]'],
        "nbcnews":      ['[class*="article-body"]',".article-body__content"],
        "abcnews":      [".Article__Content",'[class*="article-body"]'],
        "cbsnews":      [".content__body",'[class*="article-body"]'],
        "thehill":      [".article__text",'[class*="article-content"]'],
        "politico":     [".story-text",'[class*="article-content"]'],
        "axios":        ['[class*="gtm-story-text"]',"._3_Jq4"],
        "bloomberg":    ['[class*="body-content"]','[class*="article-body"]'],
        "time":         [".article-content",'[class*="article-body"]'],
        "newsweek":     [".article-body",'[class*="article__body"]'],
        "independent":  [".sc-iBPRYJ",".article-body-components"],
        "telegraph":    ['[class*="article-body"]'],
        "sky":          [".sdc-article-body",'[class*="article-body"]'],
        "france24":     [".t-content__body",'[class*="article-body"]'],
        "dw":           [".longText",".article-content","#bodytext"],
        "hindustantimes": [".storyDetail",'[class*="article-body"]'],
        "thehindu":     [".article-section",'[class*="article-body"]'],
        "ndtv":         [".sp-cn",'[class*="article-body"]'],
        "dawn":         [".story__content",'[class*="story-content"]'],
        "arabnews":     [".article-body",'[class*="field-body"]'],
        "haaretz":      ['[class*="article-body"]'],
        "timesofisrael": [".the-content",'[class*="article-body"]'],
        "middleeasteye": [".article-text",'[class*="article-body"]'],
    }

    for key, selectors in site_map.items():
        if key in domain:
            for sel in selectors:
                els = soup.select(sel)
                if els:
                    text = _clean_text(" ".join(e.get_text(" ",strip=True) for e in els))
                    if len(text) > 200:
                        return text

    # Generic fallbacks
    for sel in [
        "[itemprop='articleBody']", "article",
        ".article-body",".article__body",".article-content",
        ".story-body",".story__body",".post-content",
        ".entry-content",".content-body",".news-body",
        ".ArticleBody",".article-text","#content","main",
    ]:
        el = soup.select_one(sel)
        if el:
            text = _clean_text(el.get_text(" ",strip=True))
            if len(text) > 200:
                return text

    # Last resort: all paragraphs
    paras = soup.find_all("p")
    text = " ".join(p.get_text(strip=True) for p in paras if len(p.get_text(strip=True)) > 40)
    return _clean_text(text)


def _title_from_url(url: str) -> str:
    path = urlparse(url).path
    slug = path.rstrip("/").split("/")[-1]
    slug = re.sub(r"-\d{4}-\d{2}-\d{2}$","",slug)
    slug = re.sub(r"-[a-z0-9]{8,}$","",slug)
    return slug.replace("-"," ").title() if slug else "Article"


def _clean_text(text: str) -> str:
    text = re.sub(r"\s+"," ",text)
    text = re.sub(r"[^\x20-\x7E\u00A0-\u024F\n]","",text)
    return text.strip()