-- ============================================================
-- FIX: ad_creatives missing hook_id + script columns
-- generateAdVariant (src/app/api/ads) returns hook_id (text like
-- 'curiosity_1') and script (generated copy object) in every insert.
-- ============================================================

ALTER TABLE public.ad_creatives
    ADD COLUMN IF NOT EXISTS hook_id TEXT,
    ADD COLUMN IF NOT EXISTS script JSONB;

CREATE INDEX IF NOT EXISTS idx_ad_creatives_hook_id ON public.ad_creatives(hook_id);

SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'ad_creatives'
  AND column_name IN ('hook_id', 'script');
