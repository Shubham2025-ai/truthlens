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
    r"/tags/[^/]+/?$",
    r"/category/[^/]+/?$",
    r"/hub/[^/]+/?$",
    r"/search[/?]",
    r"/page/\d+/?$",
]

BLOCKED_SITES = {
    "nytimes.com":      "NYT blocks scraping. Try AP News, Guardian, or DW News.",
    "wsj.com":          "WSJ is paywalled. Try Reuters or AP News.",
    "ft.com":           "FT blocks scraping. Try Reuters or AP News.",
    "washingtonpost.com": "WaPo blocks scraping. Try AP News or Guardian.",
    "bloomberg.com":    "Bloomberg blocks scraping. Try Reuters or AP News.",
}

GOOD_SITES = "apnews.com · theguardian.com · dw.com · reuters.com · bbc.com"


def validate_url(url: str) -> None:
    parsed = urlparse(url)
    domain = parsed.netloc.replace("www.", "")
    for blocked, msg in BLOCKED_SITES.items():
        if blocked in domain:
            raise ValueError(msg)
    for pattern in SECTION_PATTERNS:
        if re.search(pattern, url, re.IGNORECASE):
            raise ValueError(
                f"This looks like a section/homepage, not a specific article. "
                f"Please paste the URL of an individual article.\n"
                f"Good sources: {GOOD_SITES}"
            )


def _fetch_html(url: str) -> str:
    """Try multiple strategies to fetch the page."""
    domain = urlparse(url).netloc

    strategies = [
        # Strategy 1: Chrome browser with referer
        {
            "User-Agent": USER_AGENTS[0],
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Referer": "https://www.google.com/",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Cache-Control": "max-age=0",
        },
        # Strategy 2: Googlebot (many sites allow this)
        {
            "User-Agent": USER_AGENTS[2],
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.5",
        },
        # Strategy 3: Mac Chrome
        {
            "User-Agent": USER_AGENTS[1],
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-GB,en;q=0.9",
            "Referer": f"https://{domain}/",
        },
    ]

    last_status = None
    for i, headers in enumerate(strategies):
        try:
            resp = httpx.get(url, headers=headers, timeout=25, follow_redirects=True)
            if resp.status_code == 200:
                return resp.text
            last_status = resp.status_code
            # Don't retry on these — they won't change with different headers
            if resp.status_code in (401, 410, 451):
                break
        except httpx.TimeoutException:
            raise ValueError("Request timed out. Please try again.")
        except Exception as e:
            if i == len(strategies) - 1:
                raise ValueError(f"Could not reach this URL: {str(e)}")
            continue

    # All strategies failed — give helpful message based on status
    if last_status == 404:
        raise ValueError(
            "This article URL returned 404. It may have been removed or the URL is incorrect.\n"
            "Tip: Copy the URL directly from your browser address bar while viewing the article."
        )
    elif last_status == 403:
        domain_name = urlparse(url).netloc
        raise ValueError(
            f"{domain_name} is blocking access.\n"
            f"Try these sites that work well: {GOOD_SITES}"
        )
    elif last_status == 429:
        raise ValueError("Too many requests to this site. Wait 30 seconds and try again.")
    else:
        raise ValueError(
            f"Could not fetch article (HTTP {last_status}).\n"
            f"Try these sites: {GOOD_SITES}"
        )


def extract_article(url: str) -> dict:
    validate_url(url)

    html = _fetch_html(url)
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

    # Domain
    domain = urlparse(url).netloc.replace("www.", "")

    # Published date
    pub_date = ""
    for selector in [
        {"property": "article:published_time"},
        {"name": "article:published_time"},
        {"name": "publishdate"},
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

    if len(content) < 150:
        raise ValueError(
            "Could not extract article text. The page may be a video, gallery, or uses JavaScript rendering.\n"
            f"Try these reliable sources: {GOOD_SITES}"
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


def _extract_content(soup: BeautifulSoup, url: str = "") -> str:
    domain = urlparse(url).netloc if url else ""

    # Site-specific selectors first
    site_selectors = []
    if "aljazeera" in domain:
        site_selectors = [".wysiwyg", ".article-p-wrapper", '[class*="article__body"]', "#article-body", ".main-article-body"]
    elif "bbc" in domain:
        site_selectors = ["[data-component='text-block']", '[class*="RichTextComponentWrapper"]', ".story-body__inner"]
    elif "reuters" in domain:
        site_selectors = ['[class*="article-body"]', '[class*="ArticleBody"]', ".StandardArticleBody_body"]
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

    # Generic selectors
    generic_selectors = [
        "[itemprop='articleBody']",
        "article",
        ".article-body", ".article__body", ".article-content", ".article_body",
        ".story-body", ".story__body", ".story-content",
        ".post-content", ".post-body", ".entry-content",
        ".content-body", ".news-body", ".body-text",
        ".ArticleBody", ".article-text",
        "main",
    ]

    for sel in generic_selectors:
        el = soup.select_one(sel)
        if el:
            text = _clean_text(el.get_text(separator=" ", strip=True))
            if len(text) > 150:
                return text

    # Last resort: all substantial paragraphs
    paragraphs = soup.find_all("p")
    text = " ".join(p.get_text(strip=True) for p in paragraphs if len(p.get_text(strip=True)) > 40)
    return _clean_text(text)


def _clean_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[^\x20-\x7E\u00A0-\u024F\n]", "", text)
    return text.strip()