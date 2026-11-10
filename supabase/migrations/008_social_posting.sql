-- ============================================================
-- SOCIAL POSTING AUTOPILOT — Additional DB Functions
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- Increment posts_today for a social account
CREATE OR REPLACE FUNCTION public.increment_posts_today(account_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.social_accounts
    SET posts_today = posts_today + 1,
        last_post_at = NOW(),
        updated_at = NOW()
    WHERE id = account_id;
END $$;

-- Reset daily post counts (run daily at midnight via cron)
CREATE OR REPLACE FUNCTION public.reset_daily_post_counts()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.social_accounts
    SET posts_today = 0,
        updated_at = NOW()
    WHERE is_active = TRUE;
END $$;

-- Check if account can post (rate limiting)
CREATE OR REPLACE FUNCTION public.can_post(account_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    acc RECORD;
BEGIN
    SELECT * INTO acc FROM public.social_accounts WHERE id = account_id;
    IF NOT FOUND THEN RETURN FALSE; END IF;
    IF NOT acc.is_active THEN RETURN FALSE; END IF;
    IF acc.posts_today >= acc.daily_post_limit THEN RETURN FALSE; END IF;
    RETURN TRUE;
END $$;

-- Index for scheduled posts processing
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_due 
ON public.scheduled_posts(status, scheduled_at) 
WHERE status = 'scheduled';

-- Trigger to validate account can post before scheduling
CREATE OR REPLACE FUNCTION public.validate_account_can_post()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NEW.account_id IS NOT NULL THEN
        IF NOT public.can_post(NEW.account_id) THEN
            RAISE EXCEPTION 'Account has reached daily post limit or is inactive';
        END IF;
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS check_account_can_post ON public.scheduled_posts;
CREATE TRIGGER check_account_can_post
    BEFORE INSERT OR UPDATE ON public.scheduled_posts
    FOR EACH ROW EXECUTE FUNCTION public.validate_account_can_post();

-- View for dashboard: upcoming scheduled posts with details
CREATE OR REPLACE VIEW public.upcoming_scheduled_posts AS
SELECT 
    sp.*,
    ac.headline,
    ac.body,
    ac.image_url,
    ac.video_url,
    ac.format,
    p.name AS product_name,
    p.image_url AS product_image,
    sa.platform AS account_platform,
    sa.account_name
FROM public.scheduled_posts sp
JOIN public.ad_creatives ac ON sp.creative_id = ac.id
JOIN public.products p ON ac.product_id = p.id
LEFT JOIN public.social_accounts sa ON sp.account_id = sa.id
WHERE sp.status IN ('scheduled', 'publishing')
ORDER BY sp.scheduled_at ASC;