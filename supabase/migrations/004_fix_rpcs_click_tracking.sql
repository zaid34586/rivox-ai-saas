-- ============================================================
-- FIX: Missing RPCs + anonymous click tracking (E2E fixes)
-- ============================================================

-- ------------------------------------------------------------
-- 1. click_events: allow anonymous visitors' clicks
-- ------------------------------------------------------------
ALTER TABLE public.click_events ALTER COLUMN user_id DROP NOT NULL;

-- api/clicks inserts os / utm_content / utm_term (missing in 001)
ALTER TABLE public.click_events ADD COLUMN IF NOT EXISTS os TEXT;
ALTER TABLE public.click_events ADD COLUMN IF NOT EXISTS utm_content TEXT;
ALTER TABLE public.click_events ADD COLUMN IF NOT EXISTS utm_term TEXT;

-- Anyone (incl. anonymous short-link visitors) may record a click.
-- Rows only carry link_id + tracking metadata; no user data leaks in.
DROP POLICY IF EXISTS "Anyone can record click events" ON public.click_events;
CREATE POLICY "Anyone can record click events" ON public.click_events
    FOR INSERT WITH CHECK (true);

-- Owners can read events on their own links, including anon-recorded
-- rows (user_id IS NULL) that belong to their links.
DROP POLICY IF EXISTS "Owners can view click events on own links" ON public.click_events;
CREATE POLICY "Owners can view click events on own links" ON public.click_events
    FOR SELECT USING (
        link_id IN (SELECT id FROM public.affiliate_links WHERE user_id = auth.uid())
    );

-- ------------------------------------------------------------
-- 2. RPC: increment_clicks  (called by POST /api/clicks)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_clicks(link_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE public.affiliate_links
       SET clicks = clicks + 1
     WHERE id = link_id;
$$;

-- ------------------------------------------------------------
-- 3. RPC: increment_commission (called by POST/PATCH /api/commissions)
--    link_id + amount are the exact parameter names supabase-js sends.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_commission(link_id UUID, amount NUMERIC)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE public.affiliate_links
       SET commission_earned = commission_earned + amount,
           conversions       = conversions + 1
     WHERE id = link_id;
$$;

REVOKE ALL ON FUNCTION public.increment_clicks(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_commission(UUID, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_clicks(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_commission(UUID, NUMERIC) TO authenticated;

-- ------------------------------------------------------------
-- 4. Verify
-- ------------------------------------------------------------
SELECT proname, pronargs
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('increment_clicks', 'increment_commission');
