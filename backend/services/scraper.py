import httpx
from bs4 import BeautifulSoup
import re
from urllib.parse import urlparse


HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}


def extract_article(url: str) -> dict:
    """Scrape and extract article content from a URL."""
    try:
        resp = httpx.get(url, headers=HEADERS, timeout=15, follow_redirects=True)
        resp.raise_for_status()
        html = resp.text
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
        title = h1.get_text(strip=True) if h1 else soup.title.string if soup.title else "Unknown"

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
    date_meta = soup.find("meta", {"name": "article:published_time"}) or \
                soup.find("meta", property="article:published_time") or \
                soup.find("time")
    if date_meta:
        pub_date = date_meta.get("content", "") or date_meta.get("datetime", "")

    # Content extraction
    content = _extract_content(soup)

    if len(content) < 100:
        raise ValueError("Could not extract meaningful article content from this URL.")

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
    """Extract main article text."""
    # Try article tag first
    article = soup.find("article")
    if article:
        return _clean_text(article.get_text(separator=" ", strip=True))

    # Try common content containers
    for selector in ["main", ".article-body", ".story-body", ".post-content",
                      ".entry-content", "#article-body", ".news-body", ".content-body"]:
        el = soup.select_one(selector)
        if el:
            text = _clean_text(el.get_text(separator=" ", strip=True))
            if len(text) > 200:
                return text

    # Fallback: gather all paragraphs
    paragraphs = soup.find_all("p")
    text = " ".join(p.get_text(strip=True) for p in paragraphs if len(p.get_text(strip=True)) > 40)
    return _clean_text(text)


def _clean_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[^\x20-\x7E\u00A0-\u024F\n]", "", text)
    return text.strip()
