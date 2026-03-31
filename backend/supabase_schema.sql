-- TruthLens Database Schema
-- Run this in your Supabase SQL Editor

-- Main analyses table
CREATE TABLE IF NOT EXISTS analyses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    url TEXT NOT NULL,
    title TEXT,
    source TEXT,
    credibility_score INTEGER,
    bias_label TEXT,
    bias_confidence INTEGER,
    manipulation_level TEXT,
    manipulation_score INTEGER,
    conflict_region TEXT,
    summary_eli15 TEXT,
    full_result JSONB,
    analyzed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast URL lookup (cache)
CREATE INDEX IF NOT EXISTS idx_analyses_url ON analyses(url);
CREATE INDEX IF NOT EXISTS idx_analyses_analyzed_at ON analyses(analyzed_at DESC);

-- Row Level Security (enable for production)
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- Allow all reads (public feed)
CREATE POLICY "Allow public reads" ON analyses
    FOR SELECT USING (true);

-- Allow inserts from service (anon key)
CREATE POLICY "Allow service inserts" ON analyses
    FOR INSERT WITH CHECK (true);

-- Stats view
CREATE OR REPLACE VIEW analysis_stats AS
SELECT
    COUNT(*) AS total_analyses,
    COUNT(DISTINCT source) AS unique_sources,
    AVG(credibility_score) AS avg_credibility,
    COUNT(*) FILTER (WHERE manipulation_level = 'High') AS high_manipulation_count,
    MODE() WITHIN GROUP (ORDER BY bias_label) AS most_common_bias,
    DATE_TRUNC('day', analyzed_at) AS day,
    COUNT(*) AS daily_count
FROM analyses
GROUP BY DATE_TRUNC('day', analyzed_at)
ORDER BY day DESC;
