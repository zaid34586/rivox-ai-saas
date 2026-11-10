-- ============================================================
-- ANALYTICS & REPORTING POLISH — Phase 9
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- 1. REPORT TEMPLATES (saved report configurations)
-- ============================================================
CREATE TABLE public.report_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    report_type TEXT NOT NULL CHECK (report_type IN ('overview', 'cohort', 'attribution', 'product_performance', 'platform_comparison', 'custom')),
    config JSONB NOT NULL DEFAULT '{}', -- filters, dimensions, metrics, date_range, visualization
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    schedule_config JSONB, -- {frequency: 'daily|weekly|monthly', recipients: [], format: 'pdf|csv|both'}
    last_generated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own report templates" ON public.report_templates
    FOR ALL USING (user_id = auth.uid() OR public.user_is_team_member(team_id));

CREATE TRIGGER report_templates_updated_at
    BEFORE UPDATE ON public.report_templates
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_report_templates_user ON public.report_templates(user_id);

-- ============================================================
-- 2. GENERATED REPORTS (executed report instances)
-- ============================================================
CREATE TABLE public.generated_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES public.report_templates(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    report_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
    params JSONB NOT NULL DEFAULT '{}', -- date_range, filters, etc.
    result_url TEXT, -- signed URL to file
    file_format TEXT CHECK (file_format IN ('pdf', 'csv', 'xlsx', 'json')),
    file_size BIGINT,
    error_message TEXT,
    generated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own generated reports" ON public.generated_reports
    FOR SELECT USING (user_id = auth.uid() OR public.user_is_team_member(team_id));
CREATE POLICY "Users can create generated reports" ON public.generated_reports
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_generated_reports_user ON public.generated_reports(user_id);
CREATE INDEX idx_generated_reports_template ON public.generated_reports(template_id);
CREATE INDEX idx_generated_reports_status ON public.generated_reports(status);

-- ============================================================
-- 3. COHORT ANALYSIS MATERIALIZED VIEW (pre-computed)
-- ============================================================
CREATE MATERIALIZED VIEW public.cohort_analysis AS
WITH user_first_click AS (
    SELECT 
        ce.user_id,
        DATE_TRUNC('week', MIN(ce.created_at))::DATE AS cohort_week,
        MIN(ce.created_at) AS first_click_at
    FROM public.click_events ce
    JOIN public.affiliate_links al ON ce.link_id = al.id
    GROUP BY ce.user_id
),
user_activity AS (
    SELECT 
        ce.user_id,
        DATE_TRUNC('week', ce.created_at)::DATE AS activity_week,
        COUNT(*) AS clicks,
        SUM(COALESCE(c.amount, 0)) AS revenue
    FROM public.click_events ce
    JOIN public.affiliate_links al ON ce.link_id = al.id
    LEFT JOIN public.commissions c ON c.link_id = al.id AND c.user_id = ce.user_id
    GROUP BY ce.user_id, DATE_TRUNC('week', ce.created_at)
),
cohort_data AS (
    SELECT 
        ufc.cohort_week,
        ua.activity_week,
        EXTRACT(WEEK FROM ua.activity_week - ufc.cohort_week)::INT AS week_number,
        COUNT(DISTINCT ua.user_id) AS active_users,
        SUM(ua.clicks) AS total_clicks,
        SUM(ua.revenue) AS total_revenue
    FROM user_first_click ufc
    JOIN user_activity ua ON ufc.user_id = ua.user_id
    WHERE ua.activity_week >= ufc.cohort_week
    GROUP BY ufc.cohort_week, ua.activity_week
)
SELECT 
    cohort_week,
    week_number,
    active_users,
    total_clicks,
    total_revenue,
    -- Retention rate (active_users / cohort_size)
    active_users * 100.0 / FIRST_VALUE(active_users) OVER (PARTITION BY cohort_week ORDER BY week_number) AS retention_rate_pct,
    -- Revenue per user
    CASE WHEN active_users > 0 THEN total_revenue / active_users ELSE 0 END AS arpu
FROM cohort_data
ORDER BY cohort_week, week_number;

CREATE UNIQUE INDEX ON public.cohort_analysis (cohort_week, week_number);

-- ============================================================
-- 4. ATTRIBUTION WATERFALL MATERIALIZED VIEW
-- ============================================================
CREATE MATERIALIZED VIEW public.attribution_waterfall AS
WITH click_journey AS (
    SELECT 
        ce.user_id,
        ce.link_id,
        al.product_id,
        ce.created_at AS click_at,
        ce.utm_source,
        ce.utm_medium,
        ce.utm_campaign,
        ce.device_type,
        ce.country,
        ROW_NUMBER() OVER (PARTITION BY ce.user_id, al.product_id ORDER BY ce.created_at) AS touch_number
    FROM public.click_events ce
    JOIN public.affiliate_links al ON ce.link_id = al.id
),
conversion_journey AS (
    SELECT 
        c.user_id,
        c.link_id,
        c.product_id,
        c.sale_date AS conversion_at,
        c.amount AS revenue,
        c.commission_rate,
        c.network,
        ROW_NUMBER() OVER (PARTITION BY c.user_id, c.product_id ORDER BY c.sale_date) AS conv_number
    FROM public.commissions c
),
attribution AS (
    SELECT 
        cj.user_id,
        cj.product_id,
        cj.utm_source,
        cj.utm_medium,
        cj.utm_campaign,
        cj.device_type,
        cj.country,
        cj.touch_number,
        cj.click_at,
        conv.revenue,
        conv.conversion_at,
        conv.network,
        EXTRACT(EPOCH FROM (conv.conversion_at - cj.click_at)) / 3600 AS hours_to_convert
    FROM click_journey cj
    JOIN conversion_journey conv 
        ON cj.user_id = conv.user_id 
        AND cj.product_id = conv.product_id
        AND cj.click_at <= conv.conversion_at
    WHERE cj.touch_number = 1 -- First touch attribution (can be extended for last touch, linear, etc.)
)
SELECT 
    product_id,
    utm_source,
    utm_medium,
    utm_campaign,
    device_type,
    country,
    COUNT(*) AS conversions,
    SUM(revenue) AS total_revenue,
    AVG(hours_to_convert) AS avg_hours_to_convert,
    MIN(hours_to_convert) AS min_hours_to_convert,
    MAX(hours_to_convert) AS max_hours_to_convert,
    -- Attribution model breakdown
    SUM(CASE WHEN touch_number = 1 THEN revenue ELSE 0 END) AS first_touch_revenue,
    SUM(CASE WHEN touch_number = (SELECT MAX(touch_number) FROM click_journey WHERE user_id = a.user_id AND product_id = a.product_id) THEN revenue ELSE 0 END) AS last_touch_revenue
FROM attribution a
GROUP BY product_id, utm_source, utm_medium, utm_campaign, device_type, country
ORDER BY total_revenue DESC;

CREATE INDEX ON public.attribution_waterfall (product_id);
CREATE INDEX ON public.attribution_waterfall (utm_source, utm_medium);

-- ============================================================
-- 5. REFRESH FUNCTIONS FOR MATERIALIZED VIEWS
-- ============================================================
CREATE OR REPLACE FUNCTION public.refresh_cohort_analysis()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.cohort_analysis;
END $$;

CREATE OR REPLACE FUNCTION public.refresh_attribution_waterfall()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.attribution_waterfall;
END $$;

-- Grant permissions
GRANT SELECT ON public.cohort_analysis TO authenticated;
GRANT SELECT ON public.attribution_waterfall TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_cohort_analysis() TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_attribution_waterfall() TO authenticated;

-- ============================================================
-- 6. SCHEDULED REFRESH (run daily via cron)
-- ============================================================
-- Add to cron job: SELECT public.refresh_cohort_analysis(); SELECT public.refresh_attribution_waterfall();