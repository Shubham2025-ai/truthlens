import httpx
from bs4 import BeautifulSoup
import re
from urllib.parse import urlparse

# Rotate user agents to avoid blocks
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
]

def _get_headers(url: str) -> dict:
    domain = urlparse(url).netloc
    base = {
        "User-Agent": USER_AGENTS[hash(url) % len(USER_AGENTS)],
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Cache-Control": "max-age=0",
    }
    # Site-specific referer tricks
    if "aljazeera" in domain:
        base["Referer"] = "https://www.google.com/"
    elif "reuters" in domain:
        base["Referer"] = "https://www.google.com/"
    return base

# Patterns that indicate a section/listing page (not an article)
SECTION_PATTERNS = [
    r"^https?://[^/]+/?$",
    r"^https?://[^/]+/news/?$",
    r"^https?://[^/]+/news/world/?$",
    r"^https?://[^/]+/news/world-[a-z-]+/?$",
    r"^https?://[^/]+/world/?$",
    r"/topics/",
    r"/tag/",
    r"/tags/",
    r"/category/",
    r"/categories/",
    r"/section/",
    r"/search[/?]",
    r"/hub/[^/]+/?$",
    r"/page/\d+/?$",
    r"google\.com/search",
]

# Sites known to aggressively block scrapers
BLOCKED_SITES = {
    "nytimes.com": "The New York Times blocks automated access. Try Al Jazeera, AP News, or Reuters instead.",
    "wsj.com": "Wall Street Journal is behind a paywall and blocks scraping. Try AP News or Reuters.",
    "ft.com": "Financial Times blocks automated access. Try Reuters or AP News.",
    "washingtonpost.com": "Washington Post blocks scraping. Try AP News or Reuters.",
    "bloomberg.com": "Bloomberg blocks automated access. Try Reuters or AP News.",
}


def validate_url(url: str) -> None:
    """Raise a helpful error for section pages or known-blocked sites."""
    parsed = urlparse(url)
    domain = parsed.netloc.replace("www.", "")

    # Check blocked sites
    for blocked_domain, msg in BLOCKED_SITES.items():
        if blocked_domain in domain:
            raise ValueError(msg)

    # Check section/listing patterns
    for pattern in SECTION_PATTERNS:
        if re.search(pattern, url, re.IGNORECASE):
            raise ValueError(
                "This looks like a section or homepage, not a specific article.\n"
                "Please paste the URL of one individual news article.\n\n"
                "Good examples:\n"
                "• https://apnews.com/article/israel-iran-...\n"
                "• https://www.aljazeera.com/news/2024/10/15/some-article-title\n"
                "• https://www.reuters.com/world/middle-east/article-name-2024-10-15/"
            )


def extract_article(url: str) -> dict:
    """Scrape and extract article content from a URL."""

    validate_url(url)

    headers = _get_headers(url)

    try:
        resp = httpx.get(url, headers=headers, timeout=25, follow_redirects=True)
    except httpx.TimeoutException:
        raise ValueError("Request timed out. The site may be slow — please try again in a moment.")
    except Exception as e:
        raise ValueError(f"Could not reach this URL: {str(e)}")

    # Handle HTTP errors with helpful messages
    if resp.status_code == 404:
        raise ValueError(
            "Article not found (404). This URL doesn't exist or has been removed.\n"
            "Please check the URL and try again with a current article."
        )
    elif resp.status_code == 403:
        domain = urlparse(url).netloc
        raise ValueError(
            f"{domain} is blocking access to this article.\n"
            "Try one of these that work well:\n"
            "• apnews.com\n"
            "• www.reuters.com\n"
            "• www.theguardian.com\n"
            "• www.dw.com"
        )
    elif resp.status_code == 429:
        raise ValueError("Too many requests to this site. Wait 30 seconds and try again.")
    elif resp.status_code >= 400:
        raise ValueError(f"Could not fetch article (HTTP {resp.status_code}). Try a different URL.")

    html = resp.text
    soup = BeautifulSoup(html, "lxml")

    # Remove noise elements
    for tag in soup(["script", "style", "nav", "footer", "header",
                     "aside", "iframe", "noscript", "figure", "figcaption"]):
        tag.decompose()

    # Title
    title = ""
    for meta_attr in [("property", "og:title"), ("name", "twitter:title")]:
        m = soup.find("meta", {meta_attr[0]: meta_attr[1]})
        if m and m.get("content"):
            title = m["content"]
            break
    if not title:
        h1 = soup.find("h1")
        title = h1.get_text(strip=True) if h1 else (soup.title.string if soup.title else "Unknown")

    # Description
    description = ""
    m = soup.find("meta", {"property": "og:description"}) or soup.find("meta", {"name": "description"})
    if m:
        description = m.get("content", "")

    # Image
    image = ""
    m = soup.find("meta", {"property": "og:image"})
    if m:
        image = m.get("content", "")

    # Source
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

    # Content
    content = _extract_content(soup, url)

    if len(content) < 150:
        raise ValueError(
            "Could not extract article text from this page.\n"
            "This site may block scraping, or the page may be a video/gallery.\n\n"
            "Sites that work well:\n"
            "• apnews.com — paste any article URL\n"
            "• www.theguardian.com — paste any article URL\n"
            "• www.dw.com — paste any article URL\n"
            "• www.reuters.com — paste any article URL"
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
    """Extract main article text with site-specific and generic selectors."""
    domain = urlparse(url).netloc if url else ""

    # Al Jazeera specific
    if "aljazeera" in domain:
        for sel in [".wysiwyg", ".article-p-wrapper", '[class*="article__body"]',
                    ".main-article-body", "#article-body"]:
            el = soup.select_one(sel)
            if el:
                text = _clean_text(el.get_text(separator=" ", strip=True))
                if len(text) > 150:
                    return text

    # BBC specific
    if "bbc" in domain:
        els = soup.select("[data-component='text-block']")
        if els:
            text = " ".join(e.get_text(separator=" ", strip=True) for e in els)
            if len(text) > 150:
                return _clean_text(text)

    # Reuters specific
    if "reuters" in domain:
        for sel in ['[class*="article-body"]', '[class*="ArticleBody"]', ".StandardArticleBody_body"]:
            el = soup.select_one(sel)
            if el:
                text = _clean_text(el.get_text(separator=" ", strip=True))
                if len(text) > 150:
                    return text

    # Generic: article tag
    article = soup.find("article")
    if article:
        text = _clean_text(article.get_text(separator=" ", strip=True))
        if len(text) > 150:
            return text

    # Generic content containers
    for selector in [
        "[itemprop='articleBody']",
        ".article-body", ".article__body", ".article-content",
        ".story-body", ".story__body", ".story-content",
        ".post-content", ".post-body", ".entry-content",
        ".content-body", ".news-body", ".body-text",
        ".ArticleBody", ".article_body",
        "main article", "#article-body", "#story-body",
    ]:
        el = soup.select_one(selector)
        if el:
            text = _clean_text(el.get_text(separator=" ", strip=True))
            if len(text) > 150:
                return text

    # Last resort: all substantial paragraphs
    paragraphs = soup.find_all("p")
    text = " ".join(
        p.get_text(strip=True) for p in paragraphs
        if len(p.get_text(strip=True)) > 40
    )
    return _clean_text(text)


def _clean_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[^\x20-\x7E\u00A0-\u024F\n]", "", text)
    return text.strip()