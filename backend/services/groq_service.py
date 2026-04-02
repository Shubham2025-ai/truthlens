import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL = "llama-3.3-70b-versatile"


def _parse_json(raw: str) -> dict:
    raw = raw.strip()
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1] if len(parts) > 1 else raw
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


def analyze_article_with_groq(title: str, content: str, url: str, scrape_failed: bool = False) -> dict:

    source = urlparse_source(url)

    if scrape_failed:
        prompt = _build_reputation_prompt(title, url, source)
    else:
        prompt = _build_full_prompt(title, content, url, source)

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an expert media analyst with 20 years of experience in journalism, "
                    "fact-checking, and political science. You are known for BOLD, SPECIFIC, "
                    "CALIBRATED assessments — not vague, middle-of-the-road scores. "
                    "You NEVER default to 'Neutral' or '80' just to be safe. "
                    "You call out bias when you see it. You give low scores when warranted. "
                    "Your job is to give journalists and readers an HONEST, SHARP analysis."
                )
            },
            {"role": "user", "content": prompt}
        ],
        temperature=0.6,   # higher = more decisive, less wishy-washy
        max_tokens=2500,
    )

    raw = response.choices[0].message.content.strip()
    return _parse_json(raw)


def _build_full_prompt(title: str, content: str, url: str, source: str) -> str:
    return f"""Analyze this news article with SHARP, SPECIFIC, CALIBRATED scores.

CRITICAL RULES — READ CAREFULLY:
1. credibility_score: Use the FULL range 0-100. A tabloid gets 20-40. State media gets 30-55. 
   BBC/Reuters/AP gets 75-90. Partisan blogs get 15-40. Do NOT cluster around 75-85.
2. bias label: Be SPECIFIC. "Left-leaning" and "Right-leaning" are valid. "Pro-Israel" vs "Pro-Palestine" are valid.
   Only use "Neutral" if the article is genuinely a dry factual wire report with zero framing.
   Most opinion pieces, analysis, and feature articles are NOT neutral.
3. pro_side_pct / against_side_pct / neutral_pct: These MUST add up to 100. Be bold — 
   a biased article might be 70% pro-side, 10% against, 20% neutral.
4. manipulation score: 0-100. Emotional war coverage = 50-80. Dry financial news = 5-20.
   flagged_phrases: Find ACTUAL phrases from the text that are emotionally loaded.
5. confidence: How sure are you? Be honest — 60-95% range is normal.

CALIBRATION EXAMPLES:
- Fox News opinion piece on immigration → credibility: 45, bias: Right-leaning, confidence: 88
- Al Jazeera Gaza coverage → credibility: 62, bias: Pro-Palestine, confidence: 79
- AP News wire report on ceasefire → credibility: 88, bias: Neutral, confidence: 91
- RT (Russia Today) Ukraine article → credibility: 28, bias: Pro-Russia, confidence: 94
- NYT editorial on Trump → credibility: 71, bias: Left-leaning, confidence: 82
- Times of Israel settler story → credibility: 58, bias: Pro-Israel, confidence: 76

Article Title: {title}
Article URL: {url}
Source Domain: {source}
Article Content (first 4000 chars):
{content[:4000]}

Return ONLY valid JSON, no markdown, no explanation outside the JSON:
{{
  "credibility_score": <integer 0-100 — USE FULL RANGE, not just 70-85>,
  "bias": {{
    "label": "<SPECIFIC label: Pro-Israel|Pro-Iran|Pro-Palestine|Pro-Russia|Pro-Ukraine|Pro-US|Pro-China|Pro-India|Nationalist|Left-leaning|Right-leaning|Center|Neutral>",
    "confidence": <integer 60-98>,
    "pro_side_pct": <integer — what % of content favors the dominant perspective>,
    "against_side_pct": <integer — what % represents the opposing view>,
    "neutral_pct": <integer — pure factual reporting %>,
    "explanation": "<2 specific sentences citing ACTUAL evidence from this article — quote phrases, name the framing choices>"
  }},
  "manipulation": {{
    "level": "<Low|Medium|High>",
    "score": <integer 0-100>,
    "flagged_phrases": [
      {{"phrase": "<copy exact phrase from article text>", "reason": "<specific why this is manipulative>", "type": "<Fear|Anger|Urgency|Disgust|Dehumanization|Propaganda>"}}
    ],
    "emotional_tone": "<Neutral|Alarmist|Empathetic|Hostile|Fearful|Triumphant|Victimizing>"
  }},
  "fact_check": {{
    "verifiable_claims": [
      {{"claim": "<specific factual claim from article>", "status": "<Likely True|Unverified|Disputed|Likely False>", "note": "<why — cite evidence or explain uncertainty>"}}
    ],
    "overall_accuracy": "<High|Medium|Low|Very Low>"
  }},
  "summary_eli15": "<3 plain-English sentences explaining what this article says and what angle it takes>",
  "key_missing_context": "<what important perspective or facts does this article NOT include? Be specific>",
  "source_reliability": "<Established Media|Independent|State-affiliated|Partisan|Tabloid|Unknown>",
  "conflict_region": "<specific region or topic: e.g. Gaza Strip, Ukraine-Russia border, Kashmir, South China Sea, US Elections>"
}}"""


def _build_reputation_prompt(title: str, url: str, source: str) -> str:
    return f"""Analyze this news source and article topic with SHARP, SPECIFIC scores.
Article text was unavailable, but use your deep knowledge of this source's known biases.

CRITICAL: Do NOT default to safe/neutral scores. Be bold and specific based on what you know.
- Known partisan sources get low credibility (20-55) and strong bias labels
- State media gets 25-50 credibility  
- Quality independent journalism gets 70-88
- Most sources lean SOMEWHERE — only wire agencies like AP/Reuters are truly neutral

Article Title: {title}
Article URL: {url}
Source Domain: {source}

Return ONLY valid JSON:
{{
  "credibility_score": <integer 0-100 — based on this source's known reputation>,
  "bias": {{
    "label": "<SPECIFIC label based on source's known editorial stance>",
    "confidence": <integer 60-95>,
    "pro_side_pct": <integer>,
    "against_side_pct": <integer>,
    "neutral_pct": <integer>,
    "explanation": "<2 sentences citing this source's known editorial history and ownership>"
  }},
  "manipulation": {{
    "level": "<typical level for this source's style>",
    "score": <integer 0-100>,
    "flagged_phrases": [
      {{"phrase": "<typical phrase style used by this source>", "reason": "<why it's manipulative>", "type": "<Fear|Anger|Urgency|Disgust|Propaganda>"}}
    ],
    "emotional_tone": "<typical tone for this source on this topic>"
  }},
  "fact_check": {{
    "verifiable_claims": [
      {{"claim": "<key claim from the title/URL topic>", "status": "<Likely True|Unverified|Disputed|Likely False>", "note": "<context>"}}
    ],
    "overall_accuracy": "<High|Medium|Low|Very Low>"
  }},
  "summary_eli15": "<3 sentences explaining what this article is about based on title and source>",
  "key_missing_context": "<what perspective does this source typically omit on this topic>",
  "source_reliability": "<Established Media|Independent|State-affiliated|Partisan|Tabloid|Unknown>",
  "conflict_region": "<region or topic based on URL>",
  "note": "Analysis based on source reputation — article text unavailable."
}}"""


def urlparse_source(url: str) -> str:
    try:
        from urllib.parse import urlparse
        return urlparse(url).netloc.replace("www.", "")
    except Exception:
        return url


def simplify_text(title: str, content: str) -> str:
    prompt = f"""Explain this news article to a curious 15-year-old. Be specific about what happened, who is involved, and why it matters. No jargon. 4-5 sentences max.

Title: {title}
Content: {content[:2000]}

Reply with ONLY the explanation."""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.5,
        max_tokens=300,
    )
    return response.choices[0].message.content.strip()


def compare_sources_with_groq(articles: list[dict]) -> dict:
    articles_text = ""
    for i, a in enumerate(articles, 1):
        articles_text += f"\n--- Source {i}: {a['source']} ---\nTitle: {a['title']}\nContent: {a['content'][:1500]}\n"

    prompt = f"""Compare how these {len(articles)} news sources cover the same story. Be SPECIFIC and BOLD — don't say "slightly different framing", say exactly how and why they differ.

{articles_text}

Return ONLY valid JSON:
{{
  "common_facts": ["<fact all sources state>"],
  "diverging_claims": [
    {{"topic": "<topic>", "source_positions": [{{"source": "<name>", "position": "<exact stance>"}}]}}
  ],
  "framing_differences": [
    {{"aspect": "<framing element>", "analysis": "<specific analysis of how framing differs and what agenda it serves>"}}
  ],
  "most_neutral_source": "<source name>",
  "most_biased_source": "<source name>",
  "overall_consensus": "<what all agree on>",
  "key_word_differences": [
    {{"concept": "<concept>", "variations": [{{"source": "<name>", "word_used": "<word and why it matters>"}}]}}
  ]
}}"""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.5,
        max_tokens=2000,
    )
    raw = response.choices[0].message.content.strip()
    return _parse_json(raw)