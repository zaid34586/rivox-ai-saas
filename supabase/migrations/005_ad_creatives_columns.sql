-- ============================================================
-- FIX: ad_creatives columns missing for code-generated variants
-- The API (src/app/api/ads) inserts cta / image_prompt / video_prompt
-- and omits type; migration 001 defined call_to_action and NOT NULL
-- type instead. Align schema with the code (code is source of truth:
-- compliance, dashboard ads and video-gen all read cta/image_prompt).
-- ============================================================

ALTER TABLE public.ad_creatives
    ADD COLUMN IF NOT EXISTS cta TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS image_prompt TEXT,
    ADD COLUMN IF NOT EXISTS video_prompt TEXT;

-- API variants do not send `type`; default to 'image'
ALTER TABLE public.ad_creatives ALTER COLUMN type SET DEFAULT 'image';

-- Keep legacy call_to_action populated for any old readers
UPDATE public.ad_creatives SET call_to_action = cta WHERE call_to_action = '' AND cta <> '';

SELECT column_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'ad_creatives'
  AND column_name IN ('type', 'cta', 'image_prompt', 'video_prompt');
