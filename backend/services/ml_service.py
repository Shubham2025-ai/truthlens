"""
ML Service — HuggingFace Inference API + Groq fallback
When HF_API_KEY is set: uses real transformer models
When no key: uses Groq LLM to compute equivalent scores (much better than 33/33/33)
"""

import os
import json
import httpx
import time
from dotenv import load_dotenv

load_dotenv()

HF_API_KEY = os.getenv("HF_API_KEY", "")
HF_BASE    = "https://api-inference.huggingface.co/models"

SENTIMENT_MODEL = "cardiffnlp/twitter-roberta-base-sentiment-latest"
EMOTION_MODEL   = "j-hartmann/emotion-english-distilroberta-base"
BIAS_MODEL      = "valurank/distilroberta-base-political-tweets"


def _has_hf_key() -> bool:
    return bool(HF_API_KEY and HF_API_KEY.startswith("hf_") and len(HF_API_KEY) > 10)


def _chunk_text(text: str, max_chars: int = 450) -> list[str]:
    sentences = [s.strip() for s in text.replace('\n', ' ').split('.') if len(s.strip()) > 20]
    chunks, current = [], ""
    for s in sentences:
        if len(current) + len(s) < max_chars:
            current += s + ". "
        else:
            if current:
                chunks.append(current.strip())
            current = s + ". "
    if current:
        chunks.append(current.strip())
    return chunks[:8]


def _call_hf(model: str, text: str) -> list | None:
    if not _has_hf_key():
        return None
    try:
        headers = {
            "Authorization": f"Bearer {HF_API_KEY}",
            "Content-Type": "application/json"
        }
        resp = httpx.post(
            f"{HF_BASE}/{model}",
            headers=headers,
            json={"inputs": text[:512], "options": {"wait_for_model": True}},
            timeout=30,
        )
        if resp.status_code == 200:
            return resp.json()
        elif resp.status_code == 503:
            time.sleep(8)
            resp2 = httpx.post(
                f"{HF_BASE}/{model}",
                headers=headers,
                json={"inputs": text[:512], "options": {"wait_for_model": True}},
                timeout=40,
            )
            if resp2.status_code == 200:
                return resp2.json()
    except Exception as e:
        print(f"HF API error ({model}): {e}")
    return None


def _aggregate_labels(results: list[list]) -> dict:
    totals, counts = {}, {}
    for chunk_result in results:
        if not chunk_result or not isinstance(chunk_result, list):
            continue
        items = chunk_result[0] if isinstance(chunk_result[0], list) else chunk_result
        for item in items:
            label = item.get("label", "").lower()
            score = item.get("score", 0)
            totals[label] = totals.get(label, 0) + score
            counts[label] = counts.get(label, 0) + 1
    return {k: totals[k] / counts[k] for k in totals}


# ─── Groq-based ML fallback ──────────────────────────────────────────────────

def _groq_ml_analysis(text: str) -> dict:
    """
    When no HF key, use Groq to compute real sentiment/emotion/political scores.
    Returns same structure as HuggingFace models.
    Much better than returning fake 33/33/33 fallback scores.
    """
    try:
        from groq import Groq
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))

        prompt = f"""Analyze this news article text and return PRECISE percentage scores.
Be a rigorous media analyst — do NOT return equal 33/33/33 scores unless the text is truly perfectly balanced.
Most news articles have a dominant sentiment, emotion, and political lean.

Text (first 1500 chars):
{text[:1500]}

Return ONLY valid JSON (no markdown):
{{
  "sentiment": {{
    "positive": <integer 0-100, how positive/optimistic is the language>,
    "negative": <integer 0-100, how negative/alarming/critical is the language>,
    "neutral": <integer 0-100, how dry/factual/unemotional is the language>,
    "note": "These must sum to 100"
  }},
  "emotions": {{
    "anger": <integer 0-100>,
    "fear": <integer 0-100>,
    "disgust": <integer 0-100>,
    "sadness": <integer 0-100>,
    "surprise": <integer 0-100>,
    "joy": <integer 0-100>,
    "neutral": <integer 0-100>,
    "note": "Dominant emotion should score highest. War/conflict articles usually show fear/anger."
  }},
  "political_bias": {{
    "left": <integer 0-100, pro-liberal/progressive/left-wing framing>,
    "center": <integer 0-100, balanced/centrist framing>,
    "right": <integer 0-100, pro-conservative/nationalist/right-wing framing>,
    "note": "These must sum to 100"
  }},
  "manipulation_score": <integer 0-100, how emotionally manipulative is this text>
}}

CALIBRATION EXAMPLES:
- War/conflict article with fear language → fear: 45, anger: 30, negative: 60, manipulation: 65
- Dry financial news → neutral: 75, joy: 10, positive: 40, manipulation: 8  
- Pro-government propaganda → right: 70, anger: 25, negative: 40, manipulation: 70
- Progressive advocacy piece → left: 65, sadness: 30, negative: 35, manipulation: 45"""

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            max_tokens=600,
        )

        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw.strip())

    except Exception as e:
        print(f"Groq ML fallback error: {e}")
        return None


# ─── Main entry point ─────────────────────────────────────────────────────────

def run_ml_analysis(text: str) -> dict:
    if not text or len(text.strip()) < 100:
        return {"available": False, "reason": "insufficient_text"}

    using_hf = _has_hf_key()

    if using_hf:
        # Use real HuggingFace transformer models
        return _run_hf_analysis(text)
    else:
        # Use Groq LLM as ML proxy — real scores, not fake 33/33/33
        return _run_groq_ml_analysis(text)


def _run_hf_analysis(text: str) -> dict:
    chunks = _chunk_text(text)

    # Sentiment
    sent_results = [r for chunk in chunks[:5] if (r := _call_hf(SENTIMENT_MODEL, chunk))]
    sent_agg = _aggregate_labels(sent_results) if sent_results else {}
    label_map = {"label_0": "negative", "label_1": "neutral", "label_2": "positive"}
    sentiment = {label_map.get(k, k): round(v * 100) for k, v in sent_agg.items() if k != "model"}

    # Emotions
    emo_results = [r for chunk in chunks[:5] if (r := _call_hf(EMOTION_MODEL, chunk))]
    emo_agg = _aggregate_labels(emo_results) if emo_results else {}
    emotions = {k: round(v * 100) for k, v in emo_agg.items()}

    # Political
    pol_results = [r for chunk in chunks[:5] if (r := _call_hf(BIAS_MODEL, chunk))]
    pol_agg = _aggregate_labels(pol_results) if pol_results else {}
    political = {k: round(v * 100) for k, v in pol_agg.items()}

    if not sentiment or not emotions:
        # HF failed despite having key — fall back to Groq
        return _run_groq_ml_analysis(text)

    dominant_emo = max(emotions, key=emotions.get) if emotions else "neutral"
    dominant_pol = max(political, key=political.get) if political else "center"
    neg = sentiment.get("negative", 0) / 100
    ang = emotions.get("anger", 0) / 100
    fea = emotions.get("fear", 0) / 100
    dis = emotions.get("disgust", 0) / 100
    manip = round((neg * 0.3 + ang * 0.3 + fea * 0.25 + dis * 0.15) * 100)

    return {
        "available": True,
        "source": "huggingface",
        "sentiment": {
            "positive": sentiment.get("positive", 0),
            "negative": sentiment.get("negative", 0),
            "neutral":  sentiment.get("neutral", 0),
            "model": SENTIMENT_MODEL,
        },
        "emotions": {
            "scores": emotions,
            "dominant": dominant_emo,
            "dominant_score": emotions.get(dominant_emo, 0),
            "model": EMOTION_MODEL,
        },
        "political_bias": {
            "left":       political.get("left", 0),
            "center":     political.get("center", 0),
            "right":      political.get("right", 0),
            "dominant":   dominant_pol,
            "confidence": political.get(dominant_pol, 0),
            "model": BIAS_MODEL,
        },
        "ml_manipulation_score": manip,
    }


def _run_groq_ml_analysis(text: str) -> dict:
    """Use Groq LLM to produce real sentiment/emotion/political scores."""
    groq_result = _groq_ml_analysis(text)

    if not groq_result:
        return {"available": False, "reason": "groq_ml_failed"}

    sent  = groq_result.get("sentiment", {})
    emos  = groq_result.get("emotions", {})
    pol   = groq_result.get("political_bias", {})
    manip = groq_result.get("manipulation_score", 0)

    # Remove 'note' keys
    emo_scores = {k: v for k, v in emos.items() if k != "note" and isinstance(v, (int, float))}
    pol_scores = {k: v for k, v in pol.items() if k != "note" and isinstance(v, (int, float))}

    dominant_emo = max(emo_scores, key=emo_scores.get) if emo_scores else "neutral"
    dominant_pol = max(pol_scores, key=pol_scores.get) if pol_scores else "center"

    return {
        "available": True,
        "source": "groq_llm",   # shown in UI so judges know which model
        "sentiment": {
            "positive": sent.get("positive", 0),
            "negative": sent.get("negative", 0),
            "neutral":  sent.get("neutral",  0),
            "model": "Groq Llama 3.3 70B (sentiment)",
        },
        "emotions": {
            "scores": emo_scores,
            "dominant": dominant_emo,
            "dominant_score": emo_scores.get(dominant_emo, 0),
            "model": "Groq Llama 3.3 70B (emotion)",
        },
        "political_bias": {
            "left":       pol_scores.get("left",   0),
            "center":     pol_scores.get("center", 0),
            "right":      pol_scores.get("right",  0),
            "dominant":   dominant_pol,
            "confidence": pol_scores.get(dominant_pol, 0),
            "model": "Groq Llama 3.3 70B (political)",
        },
        "ml_manipulation_score": manip,
    }