import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL = "llama-3.3-70b-versatile"

FULL_PROMPT = """You are TruthLens, an expert AI journalist and media bias analyst. Analyze this news article and return a strict JSON response.

Article Title: {title}
Article URL: {url}
Article Content: {content}

Return ONLY valid JSON with this exact structure (no markdown, no preamble):
{{
  "credibility_score": <integer 0-100>,
  "bias": {{
    "label": "<one of: Pro-Israel, Pro-Iran, Pro-Palestine, Pro-Russia, Pro-Ukraine, Pro-US, Pro-China, Nationalist, Left-leaning, Right-leaning, Center, Neutral>",
    "confidence": <integer 0-100>,
    "pro_side_pct": <integer 0-100>,
    "against_side_pct": <integer 0-100>,
    "neutral_pct": <integer 0-100>,
    "explanation": "<2 sentence explanation of detected bias>"
  }},
  "manipulation": {{
    "level": "<Low|Medium|High>",
    "score": <integer 0-100>,
    "flagged_phrases": [
      {{"phrase": "<exact phrase>", "reason": "<why manipulative>", "type": "<Fear|Anger|Disgust|Urgency|Dehumanization>"}}
    ],
    "emotional_tone": "<Neutral|Alarmist|Empathetic|Hostile|Fearful>"
  }},
  "fact_check": {{
    "verifiable_claims": [
      {{"claim": "<specific factual claim>", "status": "<Likely True|Unverified|Disputed|Likely False>", "note": "<brief context>"}}
    ],
    "overall_accuracy": "<High|Medium|Low|Very Low>"
  }},
  "summary_eli15": "<explain in 3 sentences as if to a 15 year old>",
  "key_missing_context": "<what important context is missing, 1-2 sentences>",
  "source_reliability": "<Established Media|Independent|State-affiliated|Unknown|Tabloid>",
  "conflict_region": "<main conflict/region/topic>"
}}"""

# Used when scraping failed — forces Groq to use its knowledge of the topic
REPUTATION_PROMPT = """You are TruthLens, an expert AI journalist and media bias analyst.

The article content could not be retrieved. Use the article title, URL, and your knowledge of this topic and news source to provide a COMPLETE analysis.

IMPORTANT RULES:
- fact_check.verifiable_claims MUST have at least 2-3 claims based on what you know about this topic from the title/URL
- manipulation.flagged_phrases should reflect typical language patterns for this topic/source
- Do NOT return empty arrays for verifiable_claims
- Base your analysis on: (1) the source's known reputation, (2) the topic in the URL/title, (3) your knowledge of current events

Article Title: {title}
Article URL: {url}
Source: {source}

Return ONLY valid JSON (no markdown, no preamble):
{{
  "credibility_score": <integer 0-100>,
  "bias": {{
    "label": "<one of: Pro-Israel, Pro-Iran, Pro-Palestine, Pro-Russia, Pro-Ukraine, Pro-US, Pro-China, Nationalist, Left-leaning, Right-leaning, Center, Neutral>",
    "confidence": <integer 0-100>,
    "pro_side_pct": <integer 0-100>,
    "against_side_pct": <integer 0-100>,
    "neutral_pct": <integer 0-100>,
    "explanation": "<2 sentence explanation based on source reputation and topic>"
  }},
  "manipulation": {{
    "level": "<Low|Medium|High>",
    "score": <integer 0-100>,
    "flagged_phrases": [
      {{"phrase": "<phrase typically used in reporting on this topic>", "reason": "<why it can be emotionally charged>", "type": "<Fear|Anger|Urgency|Disgust|Dehumanization>"}}
    ],
    "emotional_tone": "<Neutral|Alarmist|Empathetic|Hostile|Fearful>"
  }},
  "fact_check": {{
    "verifiable_claims": [
      {{"claim": "<key factual claim about this topic from your knowledge>", "status": "<Likely True|Unverified|Disputed|Likely False>", "note": "<brief context>"}}
    ],
    "overall_accuracy": "<High|Medium|Low|Very Low>"
  }},
  "summary_eli15": "<3 sentence plain English explanation of what this article is about based on title/URL>",
  "key_missing_context": "<what perspective or context is typically missing when this source covers this topic>",
  "source_reliability": "<Established Media|Independent|State-affiliated|Unknown|Tabloid>",
  "conflict_region": "<main region/topic based on URL and title>",
  "note": "Analysis based on source reputation and topic knowledge — full article text was unavailable."
}}"""


def _call_groq(prompt: str) -> dict:
    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=2000,
    )
    raw = response.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


def analyze_article_with_groq(title: str, content: str, url: str, scrape_failed: bool = False) -> dict:
    if scrape_failed:
        source = urlparse_source(url)
        prompt = REPUTATION_PROMPT.format(title=title, url=url, source=source)
    else:
        prompt = FULL_PROMPT.format(
            title=title,
            url=url,
            content=content[:3000],
        )
    return _call_groq(prompt)


def urlparse_source(url: str) -> str:
    try:
        from urllib.parse import urlparse
        return urlparse(url).netloc.replace("www.", "")
    except Exception:
        return url


def simplify_text(title: str, content: str) -> str:
    prompt = f"""Explain this news article to a 15-year-old in simple, neutral language. No jargon, no taking sides. Max 5 sentences.

Title: {title}
Content: {content[:2000]}

Reply with ONLY the simplified explanation, no preamble."""
    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.4,
        max_tokens=300,
    )
    return response.choices[0].message.content.strip()


def compare_sources_with_groq(articles: list[dict]) -> dict:
    articles_text = ""
    for i, a in enumerate(articles, 1):
        articles_text += f"\n--- Source {i}: {a['source']} ---\nTitle: {a['title']}\nContent: {a['content'][:1500]}\n"

    prompt = f"""You are TruthLens. Compare how these {len(articles)} news sources cover the same story. Return ONLY valid JSON:

{articles_text}

{{
  "common_facts": ["<fact all sources agree on>"],
  "diverging_claims": [
    {{"topic": "<topic>", "source_positions": [{{"source": "<name>", "position": "<their take>"}}]}}
  ],
  "framing_differences": [
    {{"aspect": "<aspect>", "analysis": "<how sources differ>"}}
  ],
  "most_neutral_source": "<source name>",
  "most_biased_source": "<source name>",
  "overall_consensus": "<brief summary>",
  "key_word_differences": [
    {{"concept": "<concept>", "variations": [{{"source": "<name>", "word_used": "<word>"}}]}}
  ]
}}"""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=2000,
    )
    raw = response.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())