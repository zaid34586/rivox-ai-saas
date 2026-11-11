-- ============================================================
-- WAITLIST SIGNUPS — Early Access Program
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE public.waitlist_signups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    source TEXT DEFAULT 'landing_page',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;

-- Public can insert (for waitlist signup from landing page)
CREATE POLICY "Public can insert waitlist signup" ON public.waitlist_signups
    FOR INSERT WITH CHECK (true);

-- Public cannot read (only service role / admin)
CREATE POLICY "Service role can read waitlist signups" ON public.waitlist_signups
    FOR SELECT USING (auth.role() = 'service_role');

CREATE INDEX idx_waitlist_signups_email ON public.waitlist_signups(email);
CREATE INDEX idx_waitlist_signups_created_at ON public.waitlist_signups(created_at DESC);
