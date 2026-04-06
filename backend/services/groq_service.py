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


def urlparse_source(url: str) -> str:
    try:
        from urllib.parse import urlparse
        return urlparse(url).netloc.replace("www.", "")
    except Exception:
        return url


# ─── Source credibility database ──────────────────────────────────────────────
# Based on AllSides, Ad Fontes Media, Media Bias/Fact Check (MBFC), Reuters Institute
# These are real published ratings from established media research organizations

SOURCE_DATABASE = {
    # Wire agencies
    "reuters.com":       {"score": 88, "bias": "Neutral",       "mbfc": "High", "allsides": "Center",       "adfont": "Reliable"},
    "apnews.com":        {"score": 90, "bias": "Neutral",       "mbfc": "High", "allsides": "Center",       "adfont": "Reliable"},
    "afp.com":           {"score": 86, "bias": "Neutral",       "mbfc": "High", "allsides": "Center",       "adfont": "Reliable"},

    # International
    "bbc.com":           {"score": 82, "bias": "Center",        "mbfc": "High", "allsides": "Center",       "adfont": "Reliable"},
    "bbc.co.uk":         {"score": 82, "bias": "Center",        "mbfc": "High", "allsides": "Center",       "adfont": "Reliable"},
    "theguardian.com":   {"score": 76, "bias": "Left-leaning",  "mbfc": "High", "allsides": "Left-Center",  "adfont": "Reliable"},
    "economist.com":     {"score": 85, "bias": "Center",        "mbfc": "High", "allsides": "Center",       "adfont": "Reliable"},
    "dw.com":            {"score": 83, "bias": "Center",        "mbfc": "High", "allsides": "Center",       "adfont": "Reliable"},
    "france24.com":      {"score": 79, "bias": "Center",        "mbfc": "High", "allsides": "Center",       "adfont": "Reliable"},
    "aljazeera.com":     {"score": 63, "bias": "Pro-Palestine", "mbfc": "Mostly Factual", "allsides": "Left-Center", "adfont": "Mixed"},
    "rt.com":            {"score": 22, "bias": "Pro-Russia",    "mbfc": "Low",  "allsides": "Right",        "adfont": "Hyper-Partisan"},
    "tass.com":          {"score": 18, "bias": "Pro-Russia",    "mbfc": "Low",  "allsides": "Right",        "adfont": "State Media"},
    "xinhuanet.com":     {"score": 20, "bias": "Pro-China",     "mbfc": "Low",  "allsides": "Right",        "adfont": "State Media"},
    "cgtn.com":          {"score": 19, "bias": "Pro-China",     "mbfc": "Low",  "allsides": "Right",        "adfont": "State Media"},
    "presstv.ir":        {"score": 15, "bias": "Pro-Iran",      "mbfc": "Low",  "allsides": "Right",        "adfont": "State Media"},
    "timesofisrael.com": {"score": 61, "bias": "Pro-Israel",    "mbfc": "Mostly Factual", "allsides": "Right-Center", "adfont": "Mixed"},
    "haaretz.com":       {"score": 72, "bias": "Left-leaning",  "mbfc": "High", "allsides": "Left-Center",  "adfont": "Reliable"},
    "arabnews.com":      {"score": 52, "bias": "Pro-Saudi",     "mbfc": "Mostly Factual", "allsides": "Right", "adfont": "Mixed"},
    "middleeasteye.net": {"score": 55, "bias": "Pro-Palestine", "mbfc": "Mostly Factual", "allsides": "Left-Center", "adfont": "Mixed"},
    "dawn.com":          {"score": 68, "bias": "Center",        "mbfc": "Mostly Factual", "allsides": "Center", "adfont": "Reliable"},

    # US outlets
    "nytimes.com":       {"score": 78, "bias": "Left-leaning",  "mbfc": "High", "allsides": "Left-Center",  "adfont": "Reliable"},
    "washingtonpost.com":{"score": 76, "bias": "Left-leaning",  "mbfc": "High", "allsides": "Left-Center",  "adfont": "Reliable"},
    "wsj.com":           {"score": 79, "bias": "Right-leaning", "mbfc": "High", "allsides": "Right-Center", "adfont": "Reliable"},
    "foxnews.com":       {"score": 42, "bias": "Right-leaning", "mbfc": "Mixed","allsides": "Right",        "adfont": "Hyper-Partisan"},
    "cnn.com":           {"score": 65, "bias": "Left-leaning",  "mbfc": "Mostly Factual", "allsides": "Left-Center", "adfont": "Mixed"},
    "nbcnews.com":       {"score": 70, "bias": "Left-leaning",  "mbfc": "High", "allsides": "Left-Center",  "adfont": "Reliable"},
    "abcnews.go.com":    {"score": 72, "bias": "Left-leaning",  "mbfc": "High", "allsides": "Left-Center",  "adfont": "Reliable"},
    "cbsnews.com":       {"score": 71, "bias": "Left-leaning",  "mbfc": "High", "allsides": "Left-Center",  "adfont": "Reliable"},
    "msnbc.com":         {"score": 55, "bias": "Left-leaning",  "mbfc": "Mostly Factual", "allsides": "Left", "adfont": "Hyper-Partisan"},
    "thehill.com":       {"score": 68, "bias": "Center",        "mbfc": "High", "allsides": "Center",       "adfont": "Reliable"},
    "politico.com":      {"score": 74, "bias": "Center",        "mbfc": "High", "allsides": "Left-Center",  "adfont": "Reliable"},
    "axios.com":         {"score": 76, "bias": "Center",        "mbfc": "High", "allsides": "Center",       "adfont": "Reliable"},
    "npr.org":           {"score": 80, "bias": "Left-leaning",  "mbfc": "High", "allsides": "Left-Center",  "adfont": "Reliable"},
    "breitbart.com":     {"score": 18, "bias": "Right-leaning", "mbfc": "Low",  "allsides": "Right",        "adfont": "Hyper-Partisan"},
    "dailykos.com":      {"score": 25, "bias": "Left-leaning",  "mbfc": "Mixed","allsides": "Left",         "adfont": "Hyper-Partisan"},

    # India
    "ndtv.com":          {"score": 62, "bias": "Center",        "mbfc": "Mostly Factual", "allsides": "Center", "adfont": "Mixed"},
    "thehindu.com":      {"score": 72, "bias": "Left-leaning",  "mbfc": "High", "allsides": "Left-Center",  "adfont": "Reliable"},
    "hindustantimes.com":{"score": 60, "bias": "Center",        "mbfc": "Mostly Factual", "allsides": "Center", "adfont": "Mixed"},
    "timesofindia.com":  {"score": 58, "bias": "Center",        "mbfc": "Mostly Factual", "allsides": "Center", "adfont": "Mixed"},

    # UK
    "telegraph.co.uk":   {"score": 72, "bias": "Right-leaning", "mbfc": "High", "allsides": "Right-Center", "adfont": "Reliable"},
    "independent.co.uk": {"score": 68, "bias": "Left-leaning",  "mbfc": "High", "allsides": "Left-Center",  "adfont": "Reliable"},
    "dailymail.co.uk":   {"score": 30, "bias": "Right-leaning", "mbfc": "Mixed","allsides": "Right",        "adfont": "Mixed"},
    "thesun.co.uk":      {"score": 28, "bias": "Right-leaning", "mbfc": "Mixed","allsides": "Right",        "adfont": "Mixed"},
    "mirror.co.uk":      {"score": 40, "bias": "Left-leaning",  "mbfc": "Mixed","allsides": "Left-Center",  "adfont": "Mixed"},
    "sky.com":           {"score": 74, "bias": "Center",        "mbfc": "High", "allsides": "Center",       "adfont": "Reliable"},
}


def get_source_context(source: str) -> dict | None:
    """Look up known bias ratings for a source domain."""
    for domain, data in SOURCE_DATABASE.items():
        if domain in source:
            return {**data, "domain": domain}
    return None


def analyze_article_with_groq(
    title: str, content: str, url: str, scrape_failed: bool = False
) -> dict:
    source = urlparse_source(url)
    source_ctx = get_source_context(source)

    if scrape_failed:
        prompt = _build_reputation_prompt(title, url, source, source_ctx)
    else:
        prompt = _build_full_prompt(title, content, url, source, source_ctx)

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an expert media analyst. STRICT RULES YOU MUST FOLLOW:\n"
                    "1. NEVER return empty verifiable_claims array — extract at least 2-3 claims from the article\n"
                    "2. NEVER return empty flagged_phrases if manipulation score > 20 — find actual emotional words\n"
                    "3. NEVER say emotional_tone is Neutral unless the article is a dry wire report with zero emotion\n"
                    "4. NEVER set manipulation level to Low with score < 15 for conflict/war/political articles\n"
                    "5. Always find SPECIFIC bias evidence — quote exact phrases from the article\n"
                    "6. If article is about conflict, politics, or society — there IS bias and manipulation, find it\n"
                    "7. credibility scores: tabloids 15-40, partisan blogs 20-45, state media 15-40, quality press 70-90\n"
                    "Your assessments must be BOLD, SPECIFIC, and backed by exact quotes from the text."
                )
            },
            {"role": "user", "content": prompt}
        ],
        temperature=0.55,
        max_tokens=2800,
    )

    raw = response.choices[0].message.content.strip()
    result = _parse_json(raw)

    # Attach source database context to result for frontend display
    if source_ctx:
        result["source_database"] = source_ctx

    return result


def _build_full_prompt(
    title: str, content: str, url: str, source: str, source_ctx: dict | None
) -> str:

    # Build source anchor section
    if source_ctx:
        anchor = f"""
SOURCE DATABASE ENTRY (from AllSides + Ad Fontes Media + MBFC research):
  Domain:       {source_ctx['domain']}
  Known bias:   {source_ctx['bias']}
  MBFC rating:  {source_ctx['mbfc']}
  AllSides:     {source_ctx['allsides']}
  Ad Fontes:    {source_ctx['adfont']}
  Base score:   {source_ctx['score']}/100

Use this as your ANCHOR. Your credibility_score should be within ±15 of {source_ctx['score']} 
unless this specific article is unusually better or worse than typical for this source.
Your bias label should align with "{source_ctx['bias']}" unless this specific article 
strongly contradicts it — if it does, explain exactly why in the explanation field.
"""
    else:
        anchor = f"""
SOURCE DATABASE ENTRY: No entry found for "{source}".
Assess purely from article content and your knowledge of this source.
"""

    return f"""Analyze this news article. Return SHARP, SPECIFIC, EVIDENCE-BASED scores.

{anchor}

CRITICAL RULES — VIOLATIONS WILL CAUSE FAILURE:
1. credibility_score: Use FULL 0-100 range. NOT everything is 75-85. Anchor to source database ±15.
2. bias.label: NEVER say "Neutral" for opinion, analysis, or advocacy pieces. Be specific.
3. bias.evidence: REQUIRED — copy 2-3 EXACT phrases from the article that show bias.
4. manipulation.flagged_phrases: REQUIRED if score > 20 — find emotional/loaded words in the text.
5. manipulation.emotional_tone: NEVER "Neutral" for conflict/political articles. Pick Alarmist/Hostile/Fearful/etc.
6. fact_check.verifiable_claims: REQUIRED — extract at least 2 specific factual claims from the article.
7. If article mentions deaths, attacks, politics, elections, conflict — manipulation score must be > 30.
8. trust_indicators and trust_concerns: REQUIRED — list at least 2 each.

Article Title: {title}
Article URL:   {url}
Source:        {source}
Content (first 4000 chars):
{content[:4000]}

Return ONLY valid JSON:
{{
  "credibility_score": <integer 0-100>,
  "bias": {{
    "label": "<Pro-Israel|Pro-Iran|Pro-Palestine|Pro-Russia|Pro-Ukraine|Pro-US|Pro-China|Pro-India|Nationalist|Left-leaning|Right-leaning|Center|Neutral>",
    "confidence": <integer 55-98>,
    "pro_side_pct": <integer>,
    "against_side_pct": <integer>,
    "neutral_pct": <integer>,
    "explanation": "<2 sentences citing SPECIFIC phrases or framing choices from this article>",
    "evidence": [
      "<exact quote or framing choice from article that shows bias>",
      "<another specific example>"
    ],
    "reference_sources": [
      "<e.g. AllSides rates {source} as Left-Center>",
      "<e.g. Ad Fontes Media classifies this source as Reliable>",
      "<e.g. MBFC rates this outlet as High Factual Reporting>"
    ]
  }},
  "manipulation": {{
    "level": "<Low|Medium|High>",
    "score": <integer 0-100>,
    "flagged_phrases": [
      {{"phrase": "<exact phrase from article>", "reason": "<why manipulative>", "type": "<Fear|Anger|Urgency|Disgust|Dehumanization|Propaganda>"}}
    ],
    "emotional_tone": "<Neutral|Alarmist|Empathetic|Hostile|Fearful|Triumphant|Victimizing>"
  }},
  "fact_check": {{
    "verifiable_claims": [
      {{"claim": "<specific claim from article>", "status": "<Likely True|Unverified|Disputed|Likely False>", "note": "<evidence or reason>", "source": "<if you can name a corroborating source>"}}
    ],
    "overall_accuracy": "<High|Medium|Low|Very Low>"
  }},
  "trust_indicators": [
    "<specific thing that increases trust: e.g. 'Names 3 on-record sources', 'Includes official statement', 'Cites government data'>"
  ],
  "trust_concerns": [
    "<specific thing that decreases trust: e.g. 'Uses anonymous sources', 'No opposing view given', 'Emotional headline vs neutral body'>"
  ],
  "summary_eli15": "<3 plain sentences: what happened, who is involved, what angle does this article take>",
  "key_missing_context": "<specific perspective or facts not in this article>",
  "source_reliability": "<Established Media|Independent|State-affiliated|Partisan|Tabloid|Unknown>",
  "conflict_region": "<specific region/topic>"
}}"""


def _build_reputation_prompt(
    title: str, url: str, source: str, source_ctx: dict | None
) -> str:
    if source_ctx:
        anchor = f"""
SOURCE DATABASE (AllSides + Ad Fontes + MBFC):
  Known bias:  {source_ctx['bias']}
  MBFC:        {source_ctx['mbfc']}
  AllSides:    {source_ctx['allsides']}
  Base score:  {source_ctx['score']}/100
"""
    else:
        anchor = f"No database entry for {source} — use your knowledge."

    ref1 = f"AllSides rates this source as {source_ctx['allsides']}" if source_ctx else "Based on source domain knowledge"
    ref2 = f"MBFC rates factual reporting as {source_ctx['mbfc']}" if source_ctx else "No database entry found"

    return f"""Analyze this source and article topic. Article text unavailable.
{anchor}

Title: {title}
URL: {url}
Source: {source}

Return ONLY valid JSON:
{{
  "credibility_score": <integer 0-100 — anchor to database score ±10>,
  "bias": {{
    "label": "<specific label>",
    "confidence": <integer>,
    "pro_side_pct": <integer>,
    "against_side_pct": <integer>,
    "neutral_pct": <integer>,
    "explanation": "<2 sentences on this source's known editorial stance>",
    "evidence": ["<known editorial pattern>", "<ownership/funding context>"],
    "reference_sources": [
      "{ref1}",
      "{ref2}"
    ]
  }},
  "manipulation": {{
    "level": "<typical for this source>",
    "score": <integer 0-100>,
    "flagged_phrases": [{{"phrase": "<typical phrase style>", "reason": "<why>", "type": "<type>"}}],
    "emotional_tone": "<typical tone>"
  }},
  "fact_check": {{
    "verifiable_claims": [
      {{"claim": "<claim from title/URL topic>", "status": "<status>", "note": "<context>", "source": "<corroboration>"}}
    ],
    "overall_accuracy": "<High|Medium|Low|Very Low>"
  }},
  "trust_indicators": ["<what this source does well>"],
  "trust_concerns": ["<known issues with this source>"],
  "summary_eli15": "<3 sentences based on title and source>",
  "key_missing_context": "<what this source typically omits>",
  "source_reliability": "<Established Media|Independent|State-affiliated|Partisan|Tabloid|Unknown>",
  "conflict_region": "<topic>",
  "note": "Analysis based on source reputation — article text unavailable."
}}"""




def extract_title_from_text(text: str) -> str:
    """Extract a real headline from pasted text instead of returning 'Pasted Text'."""
    try:
        lines_preview = text[:800].replace(chr(10), " ").strip()
        prompt = (
            "Extract a concise, specific news headline (maximum 12 words) for this article text. "
            "Return ONLY the headline with no quotes, no punctuation at the end, no explanation.\n\n"
            "Article text: " + lines_preview
        )
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=60,
        )
        title = response.choices[0].message.content.strip()
        title = title.strip(chr(34)).strip(chr(39))
        if len(title) > 10:
            return title
    except Exception:
        pass
    # Fallback: first meaningful sentence
    parts = [s.strip() for s in text[:300].split(".") if len(s.strip()) > 20]
    return parts[0][:100] if parts else text[:80].strip()


def simplify_text(title: str, content: str) -> str:
    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": f"""Explain this to a 15-year-old in plain English. 4-5 sentences. Be specific about what happened, who is involved, why it matters.

Title: {title}
Content: {content[:2000]}

Reply with ONLY the explanation."""}],
        temperature=0.5,
        max_tokens=300,
    )
    return response.choices[0].message.content.strip()


def compare_sources_with_groq(articles: list[dict]) -> dict:
    articles_text = ""
    for i, a in enumerate(articles, 1):
        articles_text += f"\n--- Source {i}: {a['source']} ---\nTitle: {a['title']}\nContent: {a['content'][:1500]}\n"

    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": f"""Compare how these {len(articles)} sources cover the same story. Be SPECIFIC — quote exact phrases, name exact differences.

{articles_text}

Return ONLY valid JSON:
{{
  "common_facts": ["<fact all sources agree on>"],
  "diverging_claims": [{{"topic": "<topic>", "source_positions": [{{"source": "<n>", "position": "<exact stance>"}}]}}],
  "framing_differences": [{{"aspect": "<element>", "analysis": "<specific analysis with examples>"}}],
  "most_neutral_source": "<name>",
  "most_biased_source": "<name>",
  "overall_consensus": "<what all agree on>",
  "key_word_differences": [{{"concept": "<concept>", "variations": [{{"source": "<n>", "word_used": "<word and why it matters>"}}]}}]
}}"""}],
        temperature=0.5,
        max_tokens=2000,
    )
    raw = response.choices[0].message.content.strip()
    return _parse_json(raw)