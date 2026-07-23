"""
database.py — PostgreSQL via psycopg2 (Render internal DB or any Postgres URL)
No Supabase dependency. Uses DATABASE_URL environment variable.
"""
import os
import json
import copy
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")

_conn = None


def _get_conn():
    """Get or create a database connection."""
    global _conn
    try:
        import psycopg2
        # Test if existing connection is still alive
        if _conn and not _conn.closed:
            try:
                _conn.cursor().execute("SELECT 1")
                return _conn
            except Exception:
                pass
        if not DATABASE_URL:
            print("[DB] DATABASE_URL not set")
            return None
        _conn = psycopg2.connect(DATABASE_URL)
        _conn.autocommit = True
        print("[DB] Connected to PostgreSQL")
        return _conn
    except Exception as e:
        print(f"[DB] Connection error: {e}")
        return None


def init_db():
    """Create the analyses table if it doesn't exist."""
    conn = _get_conn()
    if not conn:
        return
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS analyses (
                    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    url              TEXT,
                    title            TEXT,
                    source           TEXT,
                    credibility_score INTEGER,
                    bias_label       TEXT,
                    manipulation_level TEXT,
                    conflict_region  TEXT,
                    summary_eli15    TEXT,
                    analyzed_at      TIMESTAMPTZ DEFAULT NOW(),
                    full_result      JSONB
                );
                CREATE INDEX IF NOT EXISTS analyses_url_idx
                    ON analyses(url);
                CREATE INDEX IF NOT EXISTS analyses_date_idx
                    ON analyses(analyzed_at DESC);
            """)
        print("[DB] Table ready")
    except Exception as e:
        print(f"[DB] init_db error: {e}")


def _slim(data: dict) -> dict:
    """Strip heavy fields before storing."""
    s = copy.deepcopy(data)
    s.pop("content", None)
    s.pop("html", None)
    s.pop("from_cache", None)
    try:
        for claim in s.get("fact_check", {}).get("verifiable_claims", []):
            for src in claim.get("corroboration", []):
                src.pop("description", None)
    except Exception:
        pass
    for rs in s.get("related_sources", []):
        rs.pop("description", None)
    return s


def _safe(val, max_len: int = 0):
    if val is None:
        return None
    s = str(val)
    return s[:max_len] if max_len else s


def save_analysis(data: dict) -> dict | None:
    conn = _get_conn()
    if not conn:
        return None
    try:
        slim = _slim(data)
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO analyses
                    (url, title, source, credibility_score, bias_label,
                     manipulation_level, conflict_region, summary_eli15,
                     analyzed_at, full_result)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                RETURNING id
            """, (
                _safe(data.get("url"), 2000),
                _safe(data.get("title"), 500),
                _safe(data.get("source"), 200),
                data.get("credibility_score"),
                _safe((data.get("bias") or {}).get("label"), 100),
                _safe((data.get("manipulation") or {}).get("level"), 20),
                _safe(data.get("conflict_region"), 200),
                _safe(data.get("summary_eli15"), 1000),
                datetime.now(timezone.utc).isoformat(),
                json.dumps(slim),
            ))
            row_id = cur.fetchone()[0]
            print(f"[DB] Saved: {(data.get('title') or '')[:60]} (id={row_id})")
            return {"id": str(row_id)}
    except Exception as e:
        print(f"[DB] save_analysis error: {e}")
        return None


def get_recent_analyses(limit: int = 50) -> list:
    conn = _get_conn()
    if not conn:
        return []
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, url, title, source, credibility_score,
                       bias_label, manipulation_level, conflict_region,
                       analyzed_at, summary_eli15
                FROM analyses
                ORDER BY analyzed_at DESC
                LIMIT %s
            """, (limit,))
            cols = [d[0] for d in cur.description]
            rows = cur.fetchall()
            result = []
            for row in rows:
                d = dict(zip(cols, row))
                # Convert UUID and datetime to string
                d["id"] = str(d["id"])
                if d.get("analyzed_at"):
                    d["analyzed_at"] = d["analyzed_at"].isoformat()
                result.append(d)
            return result
    except Exception as e:
        print(f"[DB] get_recent_analyses error: {e}")
        return []


def get_analysis_by_id(analysis_id: str) -> dict | None:
    conn = _get_conn()
    if not conn:
        return None
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT full_result FROM analyses WHERE id = %s",
                (analysis_id,)
            )
            row = cur.fetchone()
            if row and row[0]:
                return row[0]  # psycopg2 returns JSONB as dict automatically
        return None
    except Exception as e:
        print(f"[DB] get_analysis_by_id error: {e}")
        return None


def delete_analysis(analysis_id: str) -> bool:
    conn = _get_conn()
    if not conn:
        return False
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM analyses WHERE id = %s", (analysis_id,))
        return True
    except Exception as e:
        print(f"[DB] delete_analysis error: {e}")
        return False


def get_analysis_by_url(url: str) -> dict | None:
    """Return cached result if same URL analyzed within last hour."""
    if not url:
        return None
    conn = _get_conn()
    if not conn:
        return None
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT full_result, analyzed_at FROM analyses
                WHERE url = %s
                ORDER BY analyzed_at DESC
                LIMIT 1
            """, (url,))
            row = cur.fetchone()
            if not row:
                return None
            full_result, analyzed_at = row
            if analyzed_at:
                if analyzed_at.tzinfo is None:
                    analyzed_at = analyzed_at.replace(tzinfo=timezone.utc)
                age = (datetime.now(timezone.utc) - analyzed_at).total_seconds()
                if age < 3600 and full_result:
                    return full_result
    except Exception as e:
        print(f"[DB] get_analysis_by_url error: {e}")
    return None


def get_stats() -> dict:
    conn = _get_conn()
    if not conn:
        return {"total_analyses": 0}
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM analyses")
            count = cur.fetchone()[0]
            return {"total_analyses": count}
    except Exception as e:
        print(f"[DB] get_stats error: {e}")
        return {"total_analyses": 0}