-- ============================================================
-- AI GENERATED COLUMNS for ad_creatives
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE public.ad_creatives
ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS voice_url TEXT,
ADD COLUMN IF NOT EXISTS ai_metadata JSONB;

-- Index for filtering AI-generated ads
CREATE INDEX IF NOT EXISTS idx_ad_creatives_ai_generated ON public.ad_creatives(ai_generated);