import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL = "llama3-70b-8192"


def analyze_article_with_groq(title: str, content: str, url: str) -> dict:
    prompt = f"""You are TruthLens, an expert AI journalist and media bias analyst. Analyze this news article and return a strict JSON response.

Article Title: {title}
Article URL: {url}
Article Content (first 3000 chars): {content[:3000]}

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
    "level": "<one of: Low, Medium, High>",
    "score": <integer 0-100>,
    "flagged_phrases": [
      {{"phrase": "<exact phrase from article>", "reason": "<why it's manipulative>", "type": "<Fear|Anger|Disgust|Urgency|Dehumanization>"}}
    ],
    "emotional_tone": "<overall emotional tone: Neutral/Alarmist/Empathetic/Hostile/Fearful>"
  }},
  "fact_check": {{
    "verifiable_claims": [
      {{"claim": "<specific factual claim>", "status": "<Likely True|Unverified|Disputed|Likely False>", "note": "<brief context>"}}
    ],
    "overall_accuracy": "<High|Medium|Low|Very Low>"
  }},
  "summary_eli15": "<explain this article in 3 sentences as if to a 15 year old, using simple neutral language>",
  "key_missing_context": "<what important context or other side of story is missing from this article, 1-2 sentences>",
  "source_reliability": "<Established Media|Independent|State-affiliated|Unknown|Tabloid>",
  "conflict_region": "<main conflict/region this article is about>"
}}"""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=2000,
    )

    raw = response.choices[0].message.content.strip()

    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    return json.loads(raw)


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
    {{"topic": "<topic of disagreement>", "source_positions": [{{"source": "<name>", "position": "<their take>"}}]}}
  ],
  "framing_differences": [
    {{"aspect": "<framing aspect>", "analysis": "<how sources differ in framing>"}}
  ],
  "most_neutral_source": "<source name>",
  "most_biased_source": "<source name>",
  "overall_consensus": "<brief summary of what all agree on>",
  "key_word_differences": [
    {{"concept": "<same concept>", "variations": [{{"source": "<name>", "word_used": "<their word>"}}]}}
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
    raw = raw.strip()

    return json.loads(raw)
