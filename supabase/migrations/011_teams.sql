-- ============================================================
-- TEAMS & MULTI-TENANCY — Phase 7
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- 1. TEAMS (workspaces)
-- ============================================================
CREATE TABLE public.teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    logo_url TEXT,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'agency')),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view team" ON public.teams
    FOR SELECT USING (
        id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
        OR owner_id = auth.uid()
    );

CREATE POLICY "Owner can update team" ON public.teams
    FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Owner can delete team" ON public.teams
    FOR DELETE USING (owner_id = auth.uid());

CREATE POLICY "Authenticated users can create teams" ON public.teams
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE TRIGGER teams_updated_at
    BEFORE UPDATE ON public.teams
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 2. TEAM MEMBERS (many-to-many users <-> teams)
-- ============================================================
CREATE TABLE public.team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view members" ON public.team_members
    FOR SELECT USING (
        team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Admins can manage members" ON public.team_members
    FOR ALL USING (
        team_id IN (
            SELECT team_id FROM public.team_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);

-- ============================================================
-- 3. TEAM INVITATIONS
-- ============================================================
CREATE TABLE public.team_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invitations" ON public.team_invitations
    FOR ALL USING (
        team_id IN (
            SELECT team_id FROM public.team_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Anyone can view invitation by token" ON public.team_invitations
    FOR SELECT USING (true);

CREATE INDEX idx_team_invitations_team_id ON public.team_invitations(team_id);
CREATE INDEX idx_team_invitations_token ON public.team_invitations(token);
CREATE INDEX idx_team_invitations_email ON public.team_invitations(email);

-- ============================================================
-- 4. ADD TEAM_ID TO EXISTING TABLES (for data isolation)
-- ============================================================

-- Add team_id to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_products_team_id ON public.products(team_id);

-- Add team_id to ad_creatives
ALTER TABLE public.ad_creatives ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_ad_creatives_team_id ON public.ad_creatives(team_id);

-- Add team_id to affiliate_links
ALTER TABLE public.affiliate_links ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_affiliate_links_team_id ON public.affiliate_links(team_id);

-- Add team_id to commissions
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_commissions_team_id ON public.commissions(team_id);

-- Add team_id to click_events
ALTER TABLE public.click_events ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_click_events_team_id ON public.click_events(team_id);

-- Add team_id to social_accounts
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_social_accounts_team_id ON public.social_accounts(team_id);

-- Add team_id to scheduled_posts
ALTER TABLE public.scheduled_posts ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_team_id ON public.scheduled_posts(team_id);

-- ============================================================
-- 5. UPDATE RLS POLICIES FOR TEAM ISOLATION
-- ============================================================

-- Products: users can see their own + team's products
DROP POLICY IF EXISTS "Users can manage own products" ON public.products;
CREATE POLICY "Users can manage own products" ON public.products
    FOR ALL USING (
        user_id = auth.uid() 
        OR team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    );

-- Ad creatives: users can see their own + team's creatives
DROP POLICY IF EXISTS "Users can manage own ad creatives" ON public.ad_creatives;
CREATE POLICY "Users can manage own ad creatives" ON public.ad_creatives
    FOR ALL USING (
        user_id = auth.uid() 
        OR team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    );

-- Affiliate links: users can see their own + team's links
DROP POLICY IF EXISTS "Users can manage own affiliate links" ON public.affiliate_links;
CREATE POLICY "Users can manage own affiliate links" ON public.affiliate_links
    FOR ALL USING (
        user_id = auth.uid() 
        OR team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    );

-- Commissions: users can see their own + team's commissions
DROP POLICY IF EXISTS "Users can view own commissions" ON public.commissions;
CREATE POLICY "Users can view own commissions" ON public.commissions
    FOR SELECT USING (
        user_id = auth.uid() 
        OR team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can insert own commissions" ON public.commissions;
CREATE POLICY "Users can insert own commissions" ON public.commissions
    FOR INSERT WITH CHECK (
        user_id = auth.uid() 
        OR team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    );

-- Click events: users can see their own + team's events
DROP POLICY IF EXISTS "Users can view own click events" ON public.click_events;
CREATE POLICY "Users can view own click events" ON public.click_events
    FOR SELECT USING (
        user_id = auth.uid() 
        OR team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    );

-- Social accounts: users can see their own + team's accounts
DROP POLICY IF EXISTS "Users can manage own social accounts" ON public.social_accounts;
CREATE POLICY "Users can manage own social accounts" ON public.social_accounts
    FOR ALL USING (
        user_id = auth.uid() 
        OR team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    );

-- Scheduled posts: users can see their own + team's posts
DROP POLICY IF EXISTS "Users can manage own scheduled posts" ON public.scheduled_posts;
CREATE POLICY "Users can manage own scheduled posts" ON public.scheduled_posts
    FOR ALL USING (
        user_id = auth.uid() 
        OR team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    );

-- ============================================================
-- 6. HELPER FUNCTIONS
-- ============================================================

-- Get user's teams
CREATE OR REPLACE FUNCTION public.get_user_teams(user_id UUID DEFAULT auth.uid())
RETURNS TABLE(team_id UUID, name TEXT, slug TEXT, role TEXT, is_owner BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.slug,
        tm.role,
        (t.owner_id = user_id) as is_owner
    FROM public.teams t
    JOIN public.team_members tm ON t.id = tm.team_id
    WHERE tm.user_id = user_id
    ORDER BY tm.joined_at DESC;
END $$;

-- Get team members with user details
CREATE OR REPLACE FUNCTION public.get_team_members(team_id UUID)
RETURNS TABLE(
    member_id UUID, 
    user_id UUID, 
    email TEXT, 
    full_name TEXT, 
    avatar_url TEXT, 
    role TEXT, 
    joined_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tm.id,
        tm.user_id,
        u.email,
        u.raw_user_meta_data->>'full_name' as full_name,
        u.raw_user_meta_data->>'avatar_url' as avatar_url,
        tm.role,
        tm.joined_at
    FROM public.team_members tm
    JOIN auth.users u ON tm.user_id = u.id
    WHERE tm.team_id = team_id
    ORDER BY 
        CASE tm.role WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END,
        tm.joined_at;
END $$;

-- Check if user is team admin/owner
CREATE OR REPLACE FUNCTION public.is_team_admin(team_id UUID, user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role 
    FROM public.team_members 
    WHERE team_id = is_team_admin.team_id AND user_id = is_team_admin.user_id;
    
    RETURN user_role IN ('owner', 'admin');
END $$;

-- Auto-create personal team on signup
CREATE OR REPLACE FUNCTION public.create_personal_team()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    team_slug TEXT;
BEGIN
    -- Generate unique slug from email
    team_slug := lower(regexp_replace(NEW.email, '[^a-z0-9]+', '-', 'g')) || '-' || substr(NEW.id::text, 1, 8);
    
    INSERT INTO public.teams (name, slug, owner_id)
    VALUES (split_part(NEW.email, '@', 1) || '''s Workspace', team_slug, NEW.id)
    ON CONFLICT DO NOTHING;
    
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created_team ON auth.users;
CREATE TRIGGER on_auth_user_created_team
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.create_personal_team();