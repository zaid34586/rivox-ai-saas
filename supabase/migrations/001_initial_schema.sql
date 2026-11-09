-- ============================================================
-- AFFIPILOT — Initial Database Schema (Phase 0 Task 0.2)
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. USER_PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'agency')),
    credits_remaining INTEGER NOT NULL DEFAULT 20,
    daily_post_limit INTEGER NOT NULL DEFAULT 2,
    total_posts_this_month INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: Users can only see/update their own profile
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END $$;

CREATE TRIGGER user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 2. SOCIAL_ACCOUNTS (connected social media accounts)
-- ============================================================
CREATE TABLE public.social_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('instagram', 'youtube', 'pinterest', 'x', 'facebook', 'tiktok')),
    account_name TEXT NOT NULL,
    account_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    daily_post_limit INTEGER NOT NULL DEFAULT 10,
    posts_today INTEGER NOT NULL DEFAULT 0,
    last_post_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, platform, account_id)
);

ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own social accounts" ON public.social_accounts
    FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER social_accounts_updated_at
    BEFORE UPDATE ON public.social_accounts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 3. PRODUCTS (affiliate products)
-- ============================================================
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    affiliate_url TEXT NOT NULL,
    network TEXT NOT NULL CHECK (network IN ('amazon', 'flipkart', 'clickbank', 'meesho', 'cuelinks', 'custom')),
    commission_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
    commission_type TEXT NOT NULL DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'fixed')),
    category TEXT,
    price NUMERIC(10, 2),
    original_price NUMERIC(10, 2),
    rating NUMERIC(3, 2),
    review_count INTEGER,
    gravity_score NUMERIC(5, 2),
    trend_score NUMERIC(5, 2),
    smart_score INTEGER NOT NULL DEFAULT 0 CHECK (smart_score BETWEEN 0 AND 100),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own products" ON public.products
    FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_products_user_id ON public.products(user_id);
CREATE INDEX idx_products_status ON public.products(status);
CREATE INDEX idx_products_network ON public.products(network);
CREATE INDEX idx_products_smart_score ON public.products(smart_score DESC);

CREATE TRIGGER products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 4. AFFILIATE_LINKS (short tracking links)
-- ============================================================
CREATE TABLE public.affiliate_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    short_code TEXT NOT NULL UNIQUE,
    original_url TEXT NOT NULL,
    tracking_params JSONB NOT NULL DEFAULT '{}',
    clicks INTEGER NOT NULL DEFAULT 0,
    conversions INTEGER NOT NULL DEFAULT 0,
    commission_earned NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'expired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own affiliate links" ON public.affiliate_links
    FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_affiliate_links_user_id ON public.affiliate_links(user_id);
CREATE INDEX idx_affiliate_links_product_id ON public.affiliate_links(product_id);
CREATE INDEX idx_affiliate_links_short_code ON public.affiliate_links(short_code);

CREATE TRIGGER affiliate_links_updated_at
    BEFORE UPDATE ON public.affiliate_links
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 5. AD_CREATIVES (AI-generated ad creatives)
-- ============================================================
CREATE TABLE public.ad_creatives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('image', 'video', 'carousel', 'story')),
    hook TEXT NOT NULL,
    headline TEXT NOT NULL,
    body TEXT NOT NULL,
    call_to_action TEXT NOT NULL,
    hashtags TEXT[] NOT NULL DEFAULT '{}',
    image_url TEXT,
    video_url TEXT,
    platform TEXT NOT NULL CHECK (platform IN ('instagram', 'youtube', 'pinterest', 'x', 'facebook', 'tiktok')),
    format TEXT NOT NULL CHECK (format IN ('post', 'reel', 'short', 'story', 'pin', 'tweet')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'scheduled', 'published', 'failed')),
    quality_score INTEGER CHECK (quality_score BETWEEN 0 AND 100),
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ad_creatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own ad creatives" ON public.ad_creatives
    FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_ad_creatives_user_id ON public.ad_creatives(user_id);
CREATE INDEX idx_ad_creatives_product_id ON public.ad_creatives(product_id);
CREATE INDEX idx_ad_creatives_status ON public.ad_creatives(status);
CREATE INDEX idx_ad_creatives_platform ON public.ad_creatives(platform);

CREATE TRIGGER ad_creatives_updated_at
    BEFORE UPDATE ON public.ad_creatives
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 6. SCHEDULED_POSTS (content calendar)
-- ============================================================
CREATE TABLE public.scheduled_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    creative_id UUID NOT NULL REFERENCES public.ad_creatives(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('instagram', 'youtube', 'pinterest', 'x', 'facebook', 'tiktok')),
    account_id UUID REFERENCES public.social_accounts(id) ON DELETE SET NULL,
    caption TEXT NOT NULL,
    media_urls TEXT[] NOT NULL DEFAULT '{}',
    scheduled_at TIMESTAMPTZ NOT NULL,
    published_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'publishing', 'published', 'failed')),
    platform_post_id TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own scheduled posts" ON public.scheduled_posts
    FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_scheduled_posts_user_id ON public.scheduled_posts(user_id);
CREATE INDEX idx_scheduled_posts_creative_id ON public.scheduled_posts(creative_id);
CREATE INDEX idx_scheduled_posts_status ON public.scheduled_posts(status);
CREATE INDEX idx_scheduled_posts_scheduled_at ON public.scheduled_posts(scheduled_at);

CREATE TRIGGER scheduled_posts_updated_at
    BEFORE UPDATE ON public.scheduled_posts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 7. COMMISSIONS (earnings tracking)
-- ============================================================
CREATE TABLE public.commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    link_id UUID REFERENCES public.affiliate_links(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    network TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected', 'cancelled')),
    sale_date TIMESTAMPTZ NOT NULL,
    approved_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own commissions" ON public.commissions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own commissions" ON public.commissions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_commissions_user_id ON public.commissions(user_id);
CREATE INDEX idx_commissions_link_id ON public.commissions(link_id);
CREATE INDEX idx_commissions_status ON public.commissions(status);
CREATE INDEX idx_commissions_sale_date ON public.commissions(sale_date DESC);

-- ============================================================
-- 8. CLICK_EVENTS (detailed click tracking for analytics)
-- ============================================================
CREATE TABLE public.click_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    link_id UUID NOT NULL REFERENCES public.affiliate_links(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ip_hash TEXT,
    user_agent TEXT,
    referrer TEXT,
    country TEXT,
    device_type TEXT,
    browser TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.click_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own click events" ON public.click_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX idx_click_events_link_id ON public.click_events(link_id);
CREATE INDEX idx_click_events_user_id ON public.click_events(user_id);
CREATE INDEX idx_click_events_created_at ON public.click_events(created_at DESC);

-- ============================================================
-- HELPER FUNCTION: Auto-create user_profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, avatar_url)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url')
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END $$;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- STORAGE BUCKETS (for ad images/videos)
-- ============================================================
-- Run these in Supabase Dashboard → Storage
-- INSERT INTO storage.buckets (id, name, public) VALUES ('ad-media', 'ad-media', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);

-- Storage policies (run after bucket creation):
-- CREATE POLICY "Users can upload own ad media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ad-media' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Users can view own ad media" ON storage.objects FOR SELECT USING (bucket_id = 'ad-media' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Public can view ad media" ON storage.objects FOR SELECT USING (bucket_id = 'ad-media');
-- CREATE POLICY "Users can upload own product images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Users can view own product images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Public can view product images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');