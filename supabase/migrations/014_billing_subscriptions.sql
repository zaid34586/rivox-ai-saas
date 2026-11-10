-- ============================================================
-- BILLING & SUBSCRIPTIONS (Stripe Integration) — Phase 10
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- 1. STRIPE CUSTOMERS (linked to auth.users)
-- ============================================================
CREATE TABLE public.stripe_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    stripe_customer_id TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own stripe customer" ON public.stripe_customers
    FOR SELECT USING (user_id = auth.uid() OR public.user_is_team_member(team_id));
CREATE POLICY "Service role can manage stripe customers" ON public.stripe_customers
    FOR ALL USING (auth.role() = 'service_role');

CREATE TRIGGER stripe_customers_updated_at
    BEFORE UPDATE ON public.stripe_customers
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_stripe_customers_user ON public.stripe_customers(user_id);
CREATE INDEX idx_stripe_customers_stripe_id ON public.stripe_customers(stripe_customer_id);

-- ============================================================
-- 2. SUBSCRIPTIONS (active/pending/canceled)
-- ============================================================
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    stripe_customer_id UUID NOT NULL REFERENCES public.stripe_customers(id) ON DELETE CASCADE,
    
    -- Stripe references
    stripe_subscription_id TEXT NOT NULL UNIQUE,
    stripe_price_id TEXT NOT NULL,
    stripe_product_id TEXT,
    
    -- Plan details
    plan_name TEXT NOT NULL, -- 'free', 'pro', 'agency'
    plan_interval TEXT NOT NULL CHECK (plan_interval IN ('month', 'year')),
    amount NUMERIC(10, 2) NOT NULL, -- in INR
    currency TEXT NOT NULL DEFAULT 'INR',
    
    -- Status
    status TEXT NOT NULL CHECK (status IN ('incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused')),
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    canceled_at TIMESTAMPTZ,
    
    -- Dates
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
    FOR SELECT USING (user_id = auth.uid() OR public.user_is_team_member(team_id));
CREATE POLICY "Service role can manage subscriptions" ON public.subscriptions
    FOR ALL USING (auth.role() = 'service_role');

CREATE TRIGGER subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_id ON public.subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);

-- ============================================================
-- 3. SUBSCRIPTION ITEMS (for multi-product subscriptions)
-- ============================================================
CREATE TABLE public.subscription_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    stripe_subscription_item_id TEXT NOT NULL UNIQUE,
    stripe_price_id TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.subscription_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own subscription items" ON public.subscription_items
    FOR SELECT USING (
        subscription_id IN (SELECT id FROM public.subscriptions WHERE user_id = auth.uid())
    );
CREATE POLICY "Service role can manage subscription items" ON public.subscription_items
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- 4. INVOICES (billing history)
-- ============================================================
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    stripe_customer_id UUID NOT NULL REFERENCES public.stripe_customers(id) ON DELETE CASCADE,
    
    -- Stripe references
    stripe_invoice_id TEXT NOT NULL UNIQUE,
    stripe_payment_intent_id TEXT,
    
    -- Invoice details
    amount_due NUMERIC(10, 2) NOT NULL,
    amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0,
    amount_remaining NUMERIC(10, 2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'INR',
    
    -- Status
    status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'paid', 'uncollectible', 'void')),
    
    -- Dates
    invoice_date TIMESTAMPTZ NOT NULL,
    due_date TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    
    -- PDF & URLs
    hosted_invoice_url TEXT,
    invoice_pdf_url TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own invoices" ON public.invoices
    FOR SELECT USING (user_id = auth.uid() OR public.user_is_team_member(team_id));
CREATE POLICY "Service role can manage invoices" ON public.invoices
    FOR ALL USING (auth.role() = 'service_role');

CREATE TRIGGER invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_invoices_user ON public.invoices(user_id);
CREATE INDEX idx_invoices_subscription ON public.invoices(subscription_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_stripe_id ON public.invoices(stripe_invoice_id);

-- ============================================================
-- 5. PAYMENT METHODS (saved cards, UPI, etc.)
-- ============================================================
CREATE TABLE public.payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    stripe_customer_id UUID NOT NULL REFERENCES public.stripe_customers(id) ON DELETE CASCADE,
    
    -- Stripe reference
    stripe_payment_method_id TEXT NOT NULL UNIQUE,
    
    -- Type & details
    type TEXT NOT NULL CHECK (type IN ('card', 'upi', 'bank_transfer', 'wallet')),
    card_brand TEXT,
    card_last4 TEXT,
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    card_fingerprint TEXT,
    
    -- UPI details
    upi_vpa TEXT,
    
    -- Bank details
    bank_name TEXT,
    bank_last4 TEXT,
    
    -- Status
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own payment methods" ON public.payment_methods
    FOR ALL USING (user_id = auth.uid() OR public.user_is_team_member(team_id));

CREATE TRIGGER payment_methods_updated_at
    BEFORE UPDATE ON public.payment_methods
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_payment_methods_user ON public.payment_methods(user_id);
CREATE INDEX idx_payment_methods_stripe_id ON public.payment_methods(stripe_payment_method_id);

-- ============================================================
-- 6. WEBHOOK EVENTS (audit trail)
-- ============================================================
CREATE TABLE public.stripe_webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stripe_event_id TEXT NOT NULL UNIQUE,
    stripe_event_type TEXT NOT NULL,
    api_version TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    payload JSONB NOT NULL
);

CREATE INDEX idx_stripe_webhook_event_id ON public.stripe_webhook_events(stripe_event_id);
CREATE INDEX idx_stripe_webhook_created ON public.stripe_webhook_events(created_at);
CREATE INDEX idx_stripe_webhook_status ON public.stripe_webhook_events(processing_status);

-- ============================================================
-- 7. PLAN CONFIGURATION (for dynamic pricing)
-- ============================================================
CREATE TABLE public.plans (
    id TEXT PRIMARY KEY, -- 'free', 'pro', 'agency'
    name TEXT NOT NULL,
    description TEXT,
    stripe_product_id TEXT,
    stripe_price_id_monthly TEXT,
    stripe_price_id_yearly TEXT,
    price_monthly_inr NUMERIC(10, 2) NOT NULL,
    price_yearly_inr NUMERIC(10, 2) NOT NULL,
    features JSONB NOT NULL DEFAULT '[]',
    limits JSONB NOT NULL DEFAULT '{}', -- {products: 5, ads_per_month: 20, social_accounts: 1, team_members: 1}
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active plans" ON public.plans
    FOR SELECT USING (is_active = TRUE);

CREATE TRIGGER plans_updated_at
    BEFORE UPDATE ON public.plans
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Insert default plans
INSERT INTO public.plans (id, name, description, price_monthly_inr, price_yearly_inr, features, limits, sort_order) VALUES
('free', 'Free', 'Perfect for testing the waters', 0, 0,
 '["5 products", "20 AI ads/month", "1 social account", "Basic analytics", "Manual posting"]',
 '{"products": 5, "ads_per_month": 20, "social_accounts": 1, "team_members": 1, "api_access": false}',
 1),
('pro', 'Pro', 'For serious affiliates scaling up', 1999, 19990,
 '["Unlimited products", "500 AI ads/month", "3 social accounts", "Auto-post + scheduler", "AI optimizer", "Email/Telegram alerts", "Priority support"]',
 '{"products": -1, "ads_per_month": 500, "social_accounts": 3, "team_members": 3, "api_access": true}',
 2),
('agency', 'Agency', 'For teams managing multiple clients', 4999, 49990,
 '["Everything in Pro", "10 social accounts", "Team collaboration", "Client dashboards", "White-label reports", "API access", "Custom integrations", "Dedicated support"]',
 '{"products": -1, "ads_per_month": -1, "social_accounts": 10, "team_members": 10, "api_access": true}',
 3)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_monthly_inr = EXCLUDED.price_monthly_inr,
    price_yearly_inr = EXCLUDED.price_yearly_inr,
    features = EXCLUDED.features,
    limits = EXCLUDED.limits,
    is_active = EXCLUDED.is_active;

-- ============================================================
-- 7. USER ENTITLEMENTS (computed from subscription)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_entitlements(p_user_id UUID)
RETURNS TABLE(
    plan_id TEXT,
    plan_name TEXT,
    subscription_status TEXT,
    features JSONB,
    limits JSONB,
    subscription_end TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        COALESCE(s.status, 'none')::TEXT,
        p.features,
        p.limits,
        s.current_period_end
    FROM public.plans p
    LEFT JOIN public.subscriptions s 
        ON s.user_id = get_user_entitlements.p_user_id 
        AND s.status IN ('active', 'trialing', 'past_due')
        AND s.plan_name = p.id
    WHERE p.id = (
        SELECT COALESCE(s2.plan_name, 'free')
        FROM public.subscriptions s2
        WHERE s2.user_id = get_user_entitlements.p_user_id
          AND s2.status IN ('active', 'trialing', 'past_due')
        ORDER BY 
            CASE s2.plan_name WHEN 'agency' THEN 3 WHEN 'pro' THEN 2 ELSE 1 END DESC
        LIMIT 1
    ) OR p.id = 'free';
END $$;

-- ============================================================
-- 8. HELPER: Check if user has feature access
-- ============================================================
CREATE OR REPLACE FUNCTION public.user_has_feature(p_user_id UUID, p_feature TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    user_limits JSONB;
BEGIN
    SELECT limits INTO user_limits
    FROM public.get_user_entitlements(p_user_id);
    
    IF user_limits IS NULL THEN RETURN FALSE; END IF;
    
    -- Check if unlimited (-1)
    IF (user_limits->>p_feature)::INT = -1 THEN RETURN TRUE; END IF;
    
    -- Check if feature exists and has positive limit
    RETURN (user_limits->>p_feature)::INT > 0;
END $$;

-- ============================================================
-- 9. HELPER: Check if user has reached limit
-- ============================================================
CREATE OR REPLACE FUNCTION public.user_reached_limit(p_user_id UUID, p_feature TEXT, p_current_usage INT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    user_limits JSONB;
    limit_value INT;
BEGIN
    SELECT limits INTO user_limits
    FROM public.get_user_entitlements(p_user_id);
    
    IF user_limits IS NULL THEN RETURN TRUE; END IF;
    
    limit_value := (user_limits->>p_feature)::INT;
    
    -- Unlimited
    IF limit_value = -1 THEN RETURN FALSE; END IF;
    
    -- Check if reached limit
    RETURN p_current_usage >= limit_value;
END $$;

-- ============================================================
-- 10. USAGE TRACKING (for limits enforcement)
-- ============================================================
CREATE TABLE public.usage_counters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    feature TEXT NOT NULL, -- 'products', 'ads_per_month', 'social_accounts', 'team_members'
    count INTEGER NOT NULL DEFAULT 0,
    period_start DATE NOT NULL DEFAULT CURRENT_DATE,
    period_end DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, feature, period_start)
);

ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own usage" ON public.usage_counters
    FOR SELECT USING (user_id = auth.uid() OR public.user_is_team_member(team_id));
CREATE POLICY "Service role can manage usage" ON public.usage_counters
    FOR ALL USING (auth.role() = 'service_role');

CREATE TRIGGER usage_counters_updated_at
    BEFORE UPDATE ON public.usage_counters
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to increment usage
CREATE OR REPLACE FUNCTION public.increment_usage(
    p_user_id UUID,
    p_feature TEXT,
    p_increment INT DEFAULT 1
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.usage_counters (user_id, feature, count, period_start)
    VALUES (p_user_id, p_feature, p_increment, CURRENT_DATE)
    ON CONFLICT (user_id, feature, period_start) DO UPDATE SET
        count = usage_counters.count + EXCLUDED.count,
        updated_at = NOW();
END $$;

-- Reset monthly usage (run via cron on 1st of month)
CREATE OR REPLACE FUNCTION public.reset_monthly_usage()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    DELETE FROM public.usage_counters
    WHERE feature = 'ads_per_month'
      AND period_start < DATE_TRUNC('month', CURRENT_DATE);
END $$;

GRANT EXECUTE ON FUNCTION public.increment_usage(UUID, TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_monthly_usage() TO authenticated;