-- ============================================================
-- FIX: call_to_action is NOT NULL but the API sends `cta` instead.
-- Give it a default so inserts that only provide cta succeed.
-- ============================================================

ALTER TABLE public.ad_creatives ALTER COLUMN call_to_action SET DEFAULT '';

SELECT column_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'ad_creatives'
  AND column_name IN ('call_to_action', 'cta');
