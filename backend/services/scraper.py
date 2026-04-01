import httpx
from bs4 import BeautifulSoup
import re
from urllib.parse import urlparse

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Cache-Control": "max-age=0",
}

# Section/listing pages that are NOT articles
SECTION_PAGE_PATTERNS = [
    r"^https?://[^/]+/?$",                          # homepage
    r"/news/world-middle-east/?$",                   # BBC section pages
    r"/news/world/?$",
    r"/news/uk/?$",
    r"/topics/",
    r"/tag/",
    r"/category/",
    r"/section/",
    r"/search",
    r"google\.com/search",
    r"/page/\d+",
]


def validate_url(url: str) -> None:
    """Raise a helpful error if URL is a section/listing page not an article."""
    for pattern in SECTION_PAGE_PATTERNS:
        if re.search(pattern, url, re.IGNORECASE):
            raise ValueError(
                "This looks like a news section page, not a specific article. "
                "Please paste the URL of an individual news article. "
                "Example: https://www.bbc.com/news/articles/c1234abcd (not /news/world-middle-east)"
            )


def extract_article(url: str) -> dict:
    """Scrape and extract article content from a URL."""

    # Validate it's an article URL first
    validate_url(url)

    try:
        resp = httpx.get(url, headers=HEADERS, timeout=20, follow_redirects=True)
        resp.raise_for_status()
        html = resp.text
    except httpx.HTTPStatusError as e:
        status = e.response.status_code
        if status == 404:
            raise ValueError(
                f"Article not found (404). The URL may be broken or this is a section page, not an article. "
                f"Try copying the URL directly from a specific news article page."
            )
        elif status == 403:
            raise ValueError(
                f"Access denied (403). This site blocks automated access. "
                f"Try Al Jazeera, Reuters, or AP News instead."
            )
        elif status == 429:
            raise ValueError("Too many requests to this site. Please wait a moment and try again.")
        else:
            raise ValueError(f"Could not fetch article (HTTP {status}). Try a different URL.")
    except httpx.TimeoutException:
        raise ValueError("Request timed out. The site may be slow — please try again.")
    except Exception as e:
        raise ValueError(f"Could not fetch URL: {str(e)}")

    soup = BeautifulSoup(html, "lxml")

    # Remove noise
    for tag in soup(["script", "style", "nav", "footer", "header", "aside", "iframe", "noscript"]):
        tag.decompose()

    # Title
    title = ""
    og_title = soup.find("meta", property="og:title")
    if og_title:
        title = og_title.get("content", "")
    if not title:
        h1 = soup.find("h1")
        title = h1.get_text(strip=True) if h1 else (soup.title.string if soup.title else "Unknown")

    # Description
    description = ""
    og_desc = soup.find("meta", property="og:description")
    if og_desc:
        description = og_desc.get("content", "")

    # Image
    image = ""
    og_img = soup.find("meta", property="og:image")
    if og_img:
        image = og_img.get("content", "")

    # Source name
    domain = urlparse(url).netloc.replace("www.", "")

    # Published date
    pub_date = ""
    date_meta = (
        soup.find("meta", {"name": "article:published_time"}) or
        soup.find("meta", property="article:published_time") or
        soup.find("time")
    )
    if date_meta:
        pub_date = date_meta.get("content", "") or date_meta.get("datetime", "")

    # Content extraction
    content = _extract_content(soup)

    if len(content) < 100:
        raise ValueError(
            "Could not extract article text from this page. "
            "This may be a homepage, video page, or a site that blocks scraping. "
            "Try: Al Jazeera (aljazeera.com), Reuters (reuters.com), or AP News (apnews.com)."
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


def _extract_content(soup: BeautifulSoup) -> str:
    """Extract main article text with site-specific selectors."""

    # BBC specific
    for selector in ["[data-component='text-block']", ".ssrcss-uf6wea-RichTextComponentWrapper",
                     ".article__body-content", "#main-content article"]:
        els = soup.select(selector)
        if els:
            text = " ".join(el.get_text(separator=" ", strip=True) for el in els)
            if len(text) > 200:
                return _clean_text(text)

    # Generic article tag
    article = soup.find("article")
    if article:
        return _clean_text(article.get_text(separator=" ", strip=True))

    # Common content containers
    for selector in [
        "main", ".article-body", ".story-body", ".post-content",
        ".entry-content", "#article-body", ".news-body", ".content-body",
        ".article__body", ".story__body", ".body-text", ".post-body",
        "[itemprop='articleBody']", ".ArticleBody", ".article-content",
    ]:
        el = soup.select_one(selector)
        if el:
            text = _clean_text(el.get_text(separator=" ", strip=True))
            if len(text) > 200:
                return text

    # Fallback: all paragraphs
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