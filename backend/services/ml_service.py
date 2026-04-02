"""
ML Service — uses HuggingFace Inference API (free tier, no GPU needed)
Real pre-trained models for sentiment, emotion, and bias detection.

Models used:
- cardiffnlp/twitter-roberta-base-sentiment-latest  → sentiment (positive/negative/neutral)
- j-hartmann/emotion-english-distilroberta-base     → emotion (anger/fear/disgust/joy/sadness/surprise/neutral)
- valurank/distilroberta-base-political-tweets       → political bias (left/center/right)
"""

import os
import httpx
import asyncio
from dotenv import load_dotenv

load_dotenv()

HF_API_KEY = os.getenv("HF_API_KEY", "")  # Optional — free tier works without key (rate limited)
HF_BASE = "https://api-inference.huggingface.co/models"

SENTIMENT_MODEL  = "cardiffnlp/twitter-roberta-base-sentiment-latest"
EMOTION_MODEL    = "j-hartmann/emotion-english-distilroberta-base"
BIAS_MODEL       = "valurank/distilroberta-base-political-tweets"

HEADERS = {"Authorization": f"Bearer {HF_API_KEY}"} if HF_API_KEY else {}


def _chunk_text(text: str, max_chars: int = 450) -> list[str]:
    """Split text into sentence-sized chunks that fit model token limits."""
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
    return chunks[:12]  # max 12 chunks to avoid rate limits


def _call_hf(model: str, text: str) -> list | None:
    """Call HuggingFace Inference API synchronously."""
    try:
        resp = httpx.post(
            f"{HF_BASE}/{model}",
            headers={**HEADERS, "Content-Type": "application/json"},
            json={"inputs": text[:512], "options": {"wait_for_model": True}},
            timeout=30,
        )
        if resp.status_code == 200:
            return resp.json()
        elif resp.status_code == 503:
            # Model loading — wait and retry once
            import time
            time.sleep(8)
            resp2 = httpx.post(
                f"{HF_BASE}/{model}",
                headers={**HEADERS, "Content-Type": "application/json"},
                json={"inputs": text[:512], "options": {"wait_for_model": True}},
                timeout=40,
            )
            if resp2.status_code == 200:
                return resp2.json()
    except Exception as e:
        print(f"HF API error ({model}): {e}")
    return None


def _aggregate_labels(results_per_chunk: list[list]) -> dict:
    """Average scores across chunks for each label."""
    totals = {}
    counts = {}
    for chunk_results in results_per_chunk:
        if not chunk_results or not isinstance(chunk_results, list):
            continue
        # HF returns [[{label, score}, ...]] or [{label, score}, ...]
        items = chunk_results[0] if isinstance(chunk_results[0], list) else chunk_results
        for item in items:
            label = item.get("label", "").lower()
            score = item.get("score", 0)
            totals[label] = totals.get(label, 0) + score
            counts[label] = counts.get(label, 0) + 1
    return {k: totals[k] / counts[k] for k in totals}


def analyze_sentiment(text: str) -> dict:
    """
    Returns real sentiment scores using RoBERTa trained on 124M tweets.
    Output: {positive: float, negative: float, neutral: float}
    """
    chunks = _chunk_text(text)
    results = []
    for chunk in chunks[:6]:  # limit API calls
        r = _call_hf(SENTIMENT_MODEL, chunk)
        if r:
            results.append(r)

    if not results:
        return {"positive": 0.33, "negative": 0.33, "neutral": 0.34, "model": "fallback"}

    aggregated = _aggregate_labels(results)

    # Normalize label names (model uses LABEL_0/1/2 or positive/negative/neutral)
    normalized = {}
    label_map = {
        "label_0": "negative", "label_1": "neutral", "label_2": "positive",
        "negative": "negative", "neutral": "neutral", "positive": "positive",
    }
    for k, v in aggregated.items():
        mapped = label_map.get(k.lower(), k)
        normalized[mapped] = round(v, 4)

    normalized["model"] = SENTIMENT_MODEL
    return normalized


def analyze_emotions(text: str) -> dict:
    """
    Detects 7 emotions using DistilRoBERTa trained on ~20k English texts.
    Output: {anger: float, fear: float, disgust: float, joy: float,
             sadness: float, surprise: float, neutral: float}
    """
    chunks = _chunk_text(text)
    results = []
    for chunk in chunks[:6]:
        r = _call_hf(EMOTION_MODEL, chunk)
        if r:
            results.append(r)

    if not results:
        return {"neutral": 1.0, "model": "fallback"}

    aggregated = _aggregate_labels(results)
    aggregated["model"] = EMOTION_MODEL

    # Round all scores
    return {k: round(v, 4) if k != "model" else v for k, v in aggregated.items()}


def analyze_political_bias(text: str) -> dict:
    """
    Detects political lean using DistilRoBERTa trained on political tweets.
    Output: {left: float, center: float, right: float}
    """
    chunks = _chunk_text(text)
    results = []
    for chunk in chunks[:6]:
        r = _call_hf(BIAS_MODEL, chunk)
        if r:
            results.append(r)

    if not results:
        return {"left": 0.33, "center": 0.34, "right": 0.33, "model": "fallback"}

    aggregated = _aggregate_labels(results)
    aggregated["model"] = BIAS_MODEL
    return {k: round(v, 4) if k != "model" else v for k, v in aggregated.items()}


def run_ml_analysis(text: str) -> dict:
    """
    Run all 3 ML models on article text.
    Returns combined results with model metadata.
    Falls back gracefully if HF API is unavailable.
    """
    if not text or len(text.strip()) < 100:
        return {"available": False, "reason": "insufficient_text"}

    # Run all 3 in sequence (HF free tier doesn't support parallel well)
    sentiment = analyze_sentiment(text)
    emotions  = analyze_emotions(text)
    political = analyze_political_bias(text)

    # Determine dominant emotion
    emotion_scores = {k: v for k, v in emotions.items() if k != "model"}
    dominant_emotion = max(emotion_scores, key=emotion_scores.get) if emotion_scores else "neutral"
    dominant_score   = round(emotion_scores.get(dominant_emotion, 0) * 100)

    # Map political bias to human label
    political_scores = {k: v for k, v in political.items() if k != "model"}
    dominant_political = max(political_scores, key=political_scores.get) if political_scores else "center"
    political_confidence = round(political_scores.get(dominant_political, 0) * 100)

    # Compute manipulation score from ML signals (not hardcoded regex)
    neg_sentiment = sentiment.get("negative", 0)
    anger_score   = emotions.get("anger", 0)
    fear_score    = emotions.get("fear", 0)
    disgust_score = emotions.get("disgust", 0)
    ml_manip_score = round((neg_sentiment * 0.3 + anger_score * 0.3 + fear_score * 0.25 + disgust_score * 0.15) * 100)

    return {
        "available": True,
        "sentiment": {
            "positive": round(sentiment.get("positive", 0) * 100),
            "negative": round(sentiment.get("negative", 0) * 100),
            "neutral":  round(sentiment.get("neutral", 0) * 100),
            "model": sentiment.get("model"),
        },
        "emotions": {
            "scores": {k: round(v * 100) for k, v in emotion_scores.items()},
            "dominant": dominant_emotion,
            "dominant_score": dominant_score,
            "model": emotions.get("model"),
        },
        "political_bias": {
            "left":       round(political_scores.get("left", 0) * 100),
            "center":     round(political_scores.get("center", 0) * 100),
            "right":      round(political_scores.get("right", 0) * 100),
            "dominant":   dominant_political,
            "confidence": political_confidence,
            "model": political.get("model"),
        },
        "ml_manipulation_score": ml_manip_score,
    }