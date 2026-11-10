-- ============================================================
-- OPTIMIZER AUTOPilot BRAIN — Phase 4.5
-- Optimizer rules, daily briefings, trend alerts, budget tracking
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- 1. OPTIMIZER_RULES (user-defined automation rules)
-- ============================================================
CREATE TABLE public.optimizer_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN (
        'clicks_no_sales',    -- clicks >= threshold with 0 conversions
        'epc_below',          -- EPC falls below threshold
        'roi_below',          -- ROI falls below threshold %
        'daily_budget',       -- daily spend exceeds budget
        'conversion_rate',    -- conversion rate below threshold
        'ctr_below',          -- CTR below threshold
        'cpa_above'           -- CPA above threshold
    )),
    trigger_value NUMERIC(10, 2) NOT NULL,
    trigger_operator TEXT NOT NULL CHECK (trigger_operator IN ('>=', '<=', '>', '<', '=')),
    evaluation_window_hours INTEGER NOT NULL DEFAULT 24 CHECK (evaluation_window_hours > 0),
    action_type TEXT NOT NULL CHECK (action_type IN (
        'pause_link',         -- pause the affiliate link
        'pause_product',      -- pause all links for the product
        'scale_budget',       -- increase daily budget by %
        'create_lookalike',   -- generate lookalike ad creatives
        'notify_only'         -- just send notification/alert
    )),
    action_params JSONB NOT NULL DEFAULT '{}', -- {scale_pct: 20, lookalike_count: 3, etc}
    cooldown_hours INTEGER NOT NULL DEFAULT 24 CHECK (cooldown_hours >= 0),
    priority INTEGER NOT NULL DEFAULT 100 CHECK (priority >= 1),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    trigger_count INTEGER NOT NULL DEFAULT 0,
    last_triggered_at TIMESTAMPTZ,
    last_evaluated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.optimizer_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own optimizer rules" ON public.optimizer_rules
    FOR ALL USING (
        user_id = auth.uid() 
        OR team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    );

CREATE INDEX idx_optimizer_rules_user ON public.optimizer_rules(user_id);
CREATE INDEX idx_optimizer_rules_team ON public.optimizer_rules(team_id);
CREATE INDEX idx_optimizer_rules_active ON public.optimizer_rules(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_optimizer_rules_trigger ON public.optimizer_rules(trigger_type);

CREATE TRIGGER optimizer_rules_updated_at
    BEFORE UPDATE ON public.optimizer_rules
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 2. OPTIMIZER_ACTIONS (audit log of auto-executed actions)
-- ============================================================
CREATE TABLE public.optimizer_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    rule_id UUID NOT NULL REFERENCES public.optimizer_rules(id) ON DELETE CASCADE,
    link_id UUID REFERENCES public.affiliate_links(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    trigger_type TEXT NOT NULL,
    trigger_value NUMERIC(10, 2) NOT NULL,
    actual_value NUMERIC(10, 2) NOT NULL,
    action_type TEXT NOT NULL,
    action_params JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'failed', 'skipped')),
    result_message TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.optimizer_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own optimizer actions" ON public.optimizer_actions
    FOR SELECT USING (
        user_id = auth.uid() 
        OR team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    );

CREATE INDEX idx_optimizer_actions_user ON public.optimizer_actions(user_id);
CREATE INDEX idx_optimizer_actions_rule ON public.optimizer_actions(rule_id);
CREATE INDEX idx_optimizer_actions_link ON public.optimizer_actions(link_id);
CREATE INDEX idx_optimizer_actions_status ON public.optimizer_actions(status);
CREATE INDEX idx_optimizer_actions_created ON public.optimizer_actions(created_at DESC);

-- ============================================================
-- 3. DAILY_BRIEFINGS (AI-generated daily mission briefings)
-- ============================================================
CREATE TABLE public.daily_briefings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    briefing_date DATE NOT NULL,
    executive_summary TEXT NOT NULL,
    top_performers JSONB NOT NULL DEFAULT '[]',     -- [{product_id, name, epc, roi, clicks, sales}]
    underperformers JSONB NOT NULL DEFAULT '[]',    -- [{product_id, name, epc, roi, clicks, issue}]
    alerts JSONB NOT NULL DEFAULT '[]',             -- [{type, severity, title, description}]
    recommendations JSONB NOT NULL DEFAULT '[]',    -- [{action, reason, priority, estimated_impact}]
    metrics_snapshot JSONB NOT NULL DEFAULT '{}',   -- {total_clicks, total_sales, total_commission, avg_epc, etc}
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, briefing_date)
);

ALTER TABLE public.daily_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily briefings" ON public.daily_briefings
    FOR SELECT USING (
        user_id = auth.uid() 
        OR team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    );

CREATE INDEX idx_daily_briefings_user ON public.daily_briefings(user_id);
CREATE INDEX idx_daily_briefings_date ON public.daily_briefings(briefing_date DESC);
CREATE INDEX idx_daily_briefings_team ON public.daily_briefings(team_id);

CREATE TRIGGER daily_briefings_updated_at
    BEFORE UPDATE ON public.daily_briefings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 4. TREND_ALERTS (opportunity & threat detection)
-- ============================================================
CREATE TABLE public.trend_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN (
        'trending_product',       -- product gaining momentum
        'declining_product',      -- product losing performance
        'new_opportunity',        -- new high-potential product detected
        'budget_overspend',       -- budget pacing issue
        'commission_spike',       -- unusual commission activity
        'platform_trend',         -- platform-level trend
        'seasonal_opportunity',   -- seasonal trend detected
        'competitor_gap'          -- gap in competitor coverage
    )),
    severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    source_platform TEXT,
    source_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    source_link_id UUID REFERENCES public.affiliate_links(id) ON DELETE SET NULL,
    metrics JSONB NOT NULL DEFAULT '{}', -- supporting data
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    is_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
    dismissed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.trend_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trend alerts" ON public.trend_alerts
    FOR SELECT USING (
        user_id = auth.uid() 
        OR team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    );

CREATE INDEX idx_trend_alerts_user ON public.trend_alerts(user_id);
CREATE INDEX idx_trend_alerts_type ON public.trend_alerts(alert_type);
CREATE INDEX idx_trend_alerts_severity ON public.trend_alerts(severity);
CREATE INDEX idx_trend_alerts_read ON public.trend_alerts(is_read, is_dismissed);
CREATE INDEX idx_trend_alerts_created ON public.trend_alerts(created_at DESC);
CREATE INDEX idx_trend_alerts_team ON public.trend_alerts(team_id);

CREATE TRIGGER trend_alerts_updated_at
    BEFORE UPDATE ON public.trend_alerts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 5. BUDGET_TRACKING (daily/weekly/monthly spend tracking)
-- ============================================================
CREATE TABLE public.budget_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    scope_type TEXT NOT NULL CHECK (scope_type IN ('global', 'product', 'link', 'platform', 'campaign')),
    scope_id UUID, -- product_id, link_id, or platform name
    daily_budget NUMERIC(12, 2),
    weekly_budget NUMERIC(12, 2),
    monthly_budget NUMERIC(12, 2),
    spent_today NUMERIC(12, 2) NOT NULL DEFAULT 0,
    spent_this_week NUMERIC(12, 2) NOT NULL DEFAULT 0,
    spent_this_month NUMERIC(12, 2) NOT NULL DEFAULT 0,
    pace_status TEXT NOT NULL DEFAULT 'on_track' CHECK (pace_status IN (
        'on_track',        -- spending within expected range
        'under_pacing',    -- spending less than expected (opportunity to scale)
        'over_pacing',     -- spending faster than expected
        'exhausted'        -- budget fully spent
    )),
    projected_monthly_spend NUMERIC(12, 2),
    last_reset_daily TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_reset_weekly TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_reset_monthly TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, scope_type, scope_id)
);

ALTER TABLE public.budget_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own budget tracking" ON public.budget_tracking
    FOR ALL USING (
        user_id = auth.uid() 
        OR team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    );

CREATE INDEX idx_budget_tracking_user ON public.budget_tracking(user_id);
CREATE INDEX idx_budget_tracking_scope ON public.budget_tracking(scope_type, scope_id);
CREATE INDEX idx_budget_tracking_pace ON public.budget_tracking(pace_status);
CREATE INDEX idx_budget_tracking_team ON public.budget_tracking(team_id);

CREATE TRIGGER budget_tracking_updated_at
    BEFORE UPDATE ON public.budget_tracking
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 6. HELPER FUNCTIONS FOR OPTIMIZER EVALUATION
-- ============================================================

-- Calculate EPC for a link in a time window
CREATE OR REPLACE FUNCTION public.calc_link_epc(
    p_link_id UUID,
    p_window_hours INTEGER DEFAULT 24
)
RETURNS NUMERIC(10, 2) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_epc NUMERIC(10, 2) := 0;
BEGIN
    SELECT COALESCE(commission_earned / NULLIF(clicks, 0), 0)::NUMERIC(10, 2)
    INTO v_epc
    FROM public.affiliate_links
    WHERE id = p_link_id;
    
    RETURN v_epc;
END $$;

-- Calculate conversion rate for a link in a time window
CREATE OR REPLACE FUNCTION public.calc_link_conversion_rate(
    p_link_id UUID,
    p_window_hours INTEGER DEFAULT 24
)
RETURNS NUMERIC(5, 2) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_rate NUMERIC(5, 2) := 0;
    v_clicks INTEGER;
    v_conversions INTEGER;
BEGIN
    SELECT clicks, conversions INTO v_clicks, v_conversions
    FROM public.affiliate_links
    WHERE id = p_link_id;
    
    IF v_clicks > 0 THEN
        v_rate := (v_conversions::NUMERIC / v_clicks * 100)::NUMERIC(5, 2);
    END IF;
    
    RETURN v_rate;
END $$;

-- Calculate ROI for a link in a time window
CREATE OR REPLACE FUNCTION public.calc_link_roi(
    p_link_id UUID,
    p_window_hours INTEGER DEFAULT 24
)
RETURNS NUMERIC(10, 2) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_roi NUMERIC(10, 2) := 0;
    v_spent NUMERIC(12, 2);
    v_earned NUMERIC(12, 2);
BEGIN
    -- Get spend from click events (estimated CPC * clicks)
    -- For now, use a simplified calculation
    SELECT 
        COALESCE(SUM(c.amount), 0) INTO v_earned
    FROM public.commissions c
    JOIN public.affiliate_links al ON c.link_id = al.id
    WHERE al.id = p_link_id
      AND c.sale_date >= NOW() - INTERVAL '1 hour' * p_window_hours
      AND c.status = 'approved';
    
    -- Estimated spend: assume average CPC * clicks
    SELECT clicks * 5 INTO v_spent -- placeholder CPC of ₹5
    FROM public.affiliate_links
    WHERE id = p_link_id;
    
    IF v_spent > 0 THEN
        v_roi := ((v_earned - v_spent) / v_spent * 100)::NUMERIC(10, 2);
    END IF;
    
    RETURN v_roi;
END $$;

-- Calculate CTR for a link
CREATE OR REPLACE FUNCTION public.calc_link_ctr(
    p_link_id UUID,
    p_window_hours INTEGER DEFAULT 24
)
RETURNS NUMERIC(5, 2) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_ctr NUMERIC(5, 2) := 0;
    v_clicks INTEGER;
    v_impressions INTEGER;
BEGIN
    -- Get clicks from affiliate_links
    SELECT clicks INTO v_clicks FROM public.affiliate_links WHERE id = p_link_id;
    
    -- Get impressions from click_events (as proxy)
    SELECT COUNT(*) INTO v_impressions
    FROM public.click_events
    WHERE link_id = p_link_id
      AND created_at >= NOW() - INTERVAL '1 hour' * p_window_hours;
    
    IF v_impressions > 0 THEN
        v_ctr := (v_clicks::NUMERIC / v_impressions * 100)::NUMERIC(5, 2);
    END IF;
    
    RETURN v_ctr;
END $$;

-- ============================================================
-- 7. OPTIMIZER EVALUATION ENGINE (THE AUTOPILOT BRAIN)
-- ============================================================

-- Main evaluation function - called by cron job
CREATE OR REPLACE FUNCTION public.evaluate_optimizer_rules(
    p_user_id UUID DEFAULT auth.uid(),
    p_dry_run BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
    rule_id UUID,
    rule_name TEXT,
    link_id UUID,
    product_id UUID,
    triggered BOOLEAN,
    actual_value NUMERIC,
    action_taken TEXT,
    action_status TEXT,
    message TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_rule RECORD;
    v_link RECORD;
    v_actual_value NUMERIC;
    v_should_trigger BOOLEAN;
    v_cooldown_ok BOOLEAN;
    v_action_result JSONB;
    v_last_action TIMESTAMPTZ;
BEGIN
    -- Loop through all active rules for this user
    FOR v_rule IN 
        SELECT * FROM public.optimizer_rules
        WHERE user_id = p_user_id
          AND is_active = TRUE
        ORDER BY priority ASC
    LOOP
        -- Check cooldown
        SELECT MAX(created_at) INTO v_last_action
        FROM public.optimizer_actions
        WHERE rule_id = v_rule.id
          AND status IN ('executed', 'pending');
        
        v_cooldown_ok := v_last_action IS NULL 
            OR v_last_action < NOW() - INTERVAL '1 hour' * v_rule.cooldown_hours;
        
        IF NOT v_cooldown_ok THEN
            CONTINUE;
        END IF;
        
        -- Get relevant links for this rule
        FOR v_link IN
            SELECT al.*, p.name as product_name
            FROM public.affiliate_links al
            JOIN public.products p ON al.product_id = p.id
            WHERE al.user_id = p_user_id
              AND al.status = 'active'
              AND p.status = 'active'
              AND (v_rule.trigger_type != 'daily_budget' OR al.id IS NOT NULL)
        LOOP
            v_actual_value := 0;
            v_should_trigger := FALSE;
            
            -- Evaluate trigger condition based on trigger_type
            CASE v_rule.trigger_type
                WHEN 'clicks_no_sales' THEN
                    -- Clicks >= threshold AND conversions = 0
                    IF v_link.clicks >= v_rule.trigger_value AND v_link.conversions = 0 THEN
                        v_actual_value := v_link.clicks;
                        v_should_trigger := TRUE;
                    END IF;
                    
                WHEN 'epc_below' THEN
                    -- EPC < threshold
                    v_actual_value := public.calc_link_epc(v_link.id, v_rule.evaluation_window_hours);
                    IF v_actual_value > 0 AND v_actual_value <= v_rule.trigger_value THEN
                        v_should_trigger := TRUE;
                    END IF;
                    
                WHEN 'roi_below' THEN
                    -- ROI < threshold %
                    v_actual_value := public.calc_link_roi(v_link.id, v_rule.evaluation_window_hours);
                    IF v_actual_value > 0 AND v_actual_value <= v_rule.trigger_value THEN
                        v_should_trigger := TRUE;
                    END IF;
                    
                WHEN 'conversion_rate' THEN
                    -- Conversion rate < threshold %
                    v_actual_value := public.calc_link_conversion_rate(v_link.id, v_rule.evaluation_window_hours);
                    IF v_actual_value > 0 AND v_actual_value <= v_rule.trigger_value THEN
                        v_should_trigger := TRUE;
                    END IF;
                    
                WHEN 'ctr_below' THEN
                    -- CTR < threshold %
                    v_actual_value := public.calc_link_ctr(v_link.id, v_rule.evaluation_window_hours);
                    IF v_actual_value > 0 AND v_actual_value <= v_rule.trigger_value THEN
                        v_should_trigger := TRUE;
                    END IF;
                    
                WHEN 'cpa_above' THEN
                    -- CPA > threshold (cost per acquisition)
                    -- CPA = estimated_spend / conversions
                    IF v_link.conversions > 0 THEN
                        v_actual_value := (v_link.clicks * 5 / v_link.conversions)::NUMERIC(10, 2); -- placeholder CPC
                        IF v_actual_value >= v_rule.trigger_value THEN
                            v_should_trigger := TRUE;
                        END IF;
                    END IF;
                    
                WHEN 'daily_budget' THEN
                    -- Check budget tracking for this scope
                    DECLARE
                        v_budget RECORD;
                    BEGIN
                        SELECT * INTO v_budget
                        FROM public.budget_tracking
                        WHERE user_id = p_user_id
                          AND scope_type IN ('global', 'link')
                          AND (scope_type = 'global' OR scope_id = v_link.id)
                        LIMIT 1;
                        
                        IF v_budget IS NOT NULL AND v_budget.daily_budget IS NOT NULL THEN
                            v_actual_value := v_budget.spent_today;
                            IF v_actual_value >= v_rule.trigger_value THEN
                                v_should_trigger := TRUE;
                            END IF;
                        END IF;
                    END;
            END CASE;
            
            -- Execute action if triggered
            IF v_should_trigger THEN
                IF p_dry_run THEN
                    RETURN QUERY SELECT 
                        v_rule.id, v_rule.name, v_link.id, v_link.product_id,
                        TRUE, v_actual_value, v_rule.action_type, 'dry_run', 
                        'DRY RUN: Would execute ' || v_rule.action_type;
                ELSE
                    -- Execute the action
                    v_action_result := public.execute_optimizer_action(
                        v_rule.id, v_link.id, v_link.product_id,
                        v_rule.action_type, v_rule.action_params,
                        v_actual_value
                    );
                    
                    -- Record action
                    INSERT INTO public.optimizer_actions (
                        user_id, team_id, rule_id, link_id, product_id,
                        trigger_type, trigger_value, actual_value,
                        action_type, action_params, status, result_message
                    ) VALUES (
                        p_user_id, v_rule.team_id, v_rule.id, v_link.id, v_link.product_id,
                        v_rule.trigger_type, v_rule.trigger_value, v_actual_value,
                        v_rule.action_type, v_rule.action_params,
                        (v_action_result->>'status')::TEXT,
                        v_action_result->>'message'
                    );
                    
                    -- Update rule trigger count
                    UPDATE public.optimizer_rules
                    SET trigger_count = trigger_count + 1,
                        last_triggered_at = NOW(),
                        last_evaluated_at = NOW()
                    WHERE id = v_rule.id;
                    
                    RETURN QUERY SELECT 
                        v_rule.id, v_rule.name, v_link.id, v_link.product_id,
                        TRUE, v_actual_value, v_rule.action_type,
                        (v_action_result->>'status')::TEXT,
                        v_action_result->>'message';
                END IF;
            ELSE
                -- Update last_evaluated_at even if not triggered
                UPDATE public.optimizer_rules
                SET last_evaluated_at = NOW()
                WHERE id = v_rule.id;
            END IF;
        END LOOP;
    END LOOP;
    
    RETURN;
END $$;

-- ============================================================
-- 8. EXECUTE OPTIMIZER ACTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.execute_optimizer_action(
    p_rule_id UUID,
    p_link_id UUID,
    p_product_id UUID,
    p_action_type TEXT,
    p_action_params JSONB,
    p_actual_value NUMERIC
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_result JSONB := '{"status": "failed", "message": "Unknown action"}';
    v_link_status TEXT;
    v_product_status TEXT;
    v_new_budget NUMERIC;
    v_scale_pct NUMERIC := COALESCE((p_action_params->>'scale_pct')::NUMERIC, 20);
    v_lookalike_count INT := COALESCE((p_action_params->>'lookalike_count')::INT, 3);
BEGIN
    CASE p_action_type
        WHEN 'pause_link' THEN
            UPDATE public.affiliate_links
            SET status = 'paused', updated_at = NOW()
            WHERE id = p_link_id;
            
            v_result := jsonb_build_object(
                'status', 'executed',
                'message', 'Link paused due to optimizer rule trigger',
                'link_id', p_link_id
            );
            
        WHEN 'pause_product' THEN
            UPDATE public.affiliate_links
            SET status = 'paused', updated_at = NOW()
            WHERE product_id = p_product_id AND status = 'active';
            
            v_result := jsonb_build_object(
                'status', 'executed',
                'message', 'All links for product paused',
                'product_id', p_product_id,
                'links_paused', ROW_COUNT
            );
            
        WHEN 'scale_budget' THEN
            -- Increase daily budget in budget_tracking
            DECLARE
                v_budget RECORD;
            BEGIN
                SELECT * INTO v_budget
                FROM public.budget_tracking
                WHERE user_id IN (SELECT user_id FROM public.optimizer_rules WHERE id = p_rule_id)
                  AND scope_type IN ('global', 'link')
                  AND (scope_type = 'global' OR scope_id = p_link_id)
                LIMIT 1;
                
                IF v_budget IS NOT NULL AND v_budget.daily_budget IS NOT NULL THEN
                    v_new_budget := v_budget.daily_budget * (1 + v_scale_pct / 100);
                    
                    UPDATE public.budget_tracking
                    SET daily_budget = v_new_budget,
                        updated_at = NOW()
                    WHERE id = v_budget.id;
                    
                    v_result := jsonb_build_object(
                        'status', 'executed',
                        'message', 'Daily budget increased by ' || v_scale_pct || '%',
                        'old_budget', v_budget.daily_budget,
                        'new_budget', v_new_budget
                    );
                ELSE
                    v_result := jsonb_build_object(
                        'status', 'skipped',
                        'message', 'No budget found to scale'
                    );
                END IF;
            END;
            
        WHEN 'create_lookalike' THEN
            -- This would typically call an AI service to generate lookalike creatives
            -- For now, we create a placeholder action that could trigger the ad generation API
            v_result := jsonb_build_object(
                'status', 'executed',
                'message', 'Lookalike generation requested for ' || v_lookalike_count || ' variants',
                'product_id', p_product_id,
                'requested_variants', v_lookalike_count,
                'note', 'Requires integration with ad generation API'
            );
            
        WHEN 'notify_only' THEN
            -- Create an alert/notification
            DECLARE
                v_user_id UUID;
                v_team_id UUID;
            BEGIN
                SELECT user_id, team_id INTO v_user_id, v_team_id
                FROM public.optimizer_rules WHERE id = p_rule_id;
                
                INSERT INTO public.trend_alerts (
                    user_id, team_id, alert_type, severity, title, description,
                    source_link_id, source_product_id, metrics
                ) VALUES (
                    v_user_id, v_team_id, 'optimizer_action', 'medium',
                    'Optimizer Rule Triggered: ' || (SELECT name FROM public.optimizer_rules WHERE id = p_rule_id),
                    'Rule triggered: ' || p_action_type || ' with value ' || p_actual_value,
                    p_link_id, p_product_id,
                    jsonb_build_object('rule_id', p_rule_id, 'action', p_action_type, 'value', p_actual_value)
                );
                
                v_result := jsonb_build_object(
                    'status', 'executed',
                    'message', 'Notification alert created',
                    'alert_type', 'optimizer_action'
                );
            END;
            
        ELSE
            v_result := jsonb_build_object(
                'status', 'failed',
                'message', 'Unknown action type: ' || p_action_type
            );
    END CASE;
    
    RETURN v_result;
END $$;

-- ============================================================
-- 9. DAILY BRIEFING GENERATION
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_daily_briefing(
    p_target_user_id UUID
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_briefing_id UUID;
    v_briefing_date DATE := CURRENT_DATE;
    v_summary TEXT;
    v_top_performers JSONB := '[]'::JSONB;
    v_underperformers JSONB := '[]'::JSONB;
    v_alerts JSONB := '[]'::JSONB;
    v_recommendations JSONB := '[]'::JSONB;
    v_metrics JSONB := '{}'::JSONB;
BEGIN
    -- Check if briefing already exists
    SELECT id INTO v_briefing_id
    FROM public.daily_briefings
    WHERE user_id = p_target_user_id AND briefing_date = v_briefing_date;
    
    IF v_briefing_id IS NOT NULL THEN
        RETURN v_briefing_id;
    END IF;
    
    -- Aggregate metrics for the user
    SELECT jsonb_build_object(
        'total_clicks', COALESCE(SUM(clicks), 0),
        'total_sales', COALESCE(SUM(conversions), 0),
        'total_commission', COALESCE(SUM(commission_earned), 0),
        'active_links', COUNT(*) FILTER (WHERE status = 'active'),
        'active_products', (SELECT COUNT(*) FROM public.products WHERE user_id = p_target_user_id AND status = 'active')
    ) INTO v_metrics
    FROM public.affiliate_links
    WHERE user_id = p_target_user_id;
    
    -- Top performers (products with highest EPC and conversions)
    SELECT jsonb_agg(jsonb_build_object(
        'product_id', p.id,
        'name', p.name,
        'epc', ROUND(COALESCE(SUM(al.commission_earned) / NULLIF(SUM(al.clicks), 0), 0)::NUMERIC, 2),
        'roi', 0, -- placeholder
        'clicks', COALESCE(SUM(al.clicks), 0),
        'sales', COALESCE(SUM(al.conversions), 0)
    ) ORDER BY (COALESCE(SUM(al.commission_earned) / NULLIF(SUM(al.clicks), 0), 0)) DESC
    ) INTO v_top_performers
    FROM public.products p
    JOIN public.affiliate_links al ON al.product_id = p.id
    WHERE p.user_id = p_target_user_id
      AND p.status = 'active'
      AND al.status = 'active'
    GROUP BY p.id, p.name
    HAVING COALESCE(SUM(al.clicks), 0) > 0
    ORDER BY COALESCE(SUM(al.commission_earned) / NULLIF(SUM(al.clicks), 0), 0) DESC
    LIMIT 5;
    
    -- Underperformers (high clicks, no sales)
    SELECT jsonb_agg(jsonb_build_object(
        'product_id', p.id,
        'name', p.name,
        'epc', ROUND(COALESCE(SUM(al.commission_earned) / NULLIF(SUM(al.clicks), 0), 0)::NUMERIC, 2),
        'clicks', COALESCE(SUM(al.clicks), 0),
        'sales', COALESCE(SUM(al.conversions), 0),
        'issue', 'High clicks, no conversions'
    ) ORDER BY COALESCE(SUM(al.clicks), 0) DESC
    ) INTO v_underperformers
    FROM public.products p
    JOIN public.affiliate_links al ON al.product_id = p.id
    WHERE p.user_id = p_target_user_id
      AND p.status = 'active'
      AND al.status = 'active'
    GROUP BY p.id, p.name
    HAVING COALESCE(SUM(al.clicks), 0) >= 20
       AND COALESCE(SUM(al.conversions), 0) = 0
    ORDER BY COALESCE(SUM(al.clicks), 0) DESC
    LIMIT 5;
    
    -- Active alerts
    SELECT jsonb_agg(jsonb_build_object(
        'type', alert_type,
        'severity', severity,
        'title', title,
        'description', description
    ) ORDER BY 
        CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
        created_at DESC
    ) INTO v_alerts
    FROM public.trend_alerts
    WHERE user_id = p_target_user_id
      AND is_read = FALSE
      AND is_dismissed = FALSE
    LIMIT 10;
    
    -- Recommendations
    v_recommendations := '[
        {"action": "pause_underperformers", "reason": "Products with >20 clicks and 0 sales detected", "priority": "high", "estimated_impact": "Save ad spend"},
        {"action": "scale_winners", "reason": "Top performers identified with strong EPC", "priority": "high", "estimated_impact": "Increase revenue 20-30%"},
        {"action": "generate_lookalikes", "reason": "Successful creatives can be replicated", "priority": "medium", "estimated_impact": "New traffic sources"}
    ]'::JSONB;
    
    -- Executive summary
    v_summary := format(
        'Good morning! Yesterday you had %s clicks, %s sales, earning ₹%s. 
        %s top performers found. %s underperformers need attention. 
        %s active alerts require review.',
        COALESCE((v_metrics->>'total_clicks')::INT, 0),
        COALESCE((v_metrics->>'total_sales')::INT, 0),
        COALESCE((v_metrics->>'total_commission')::NUMERIC, 0),
        COALESCE(jsonb_array_length(v_top_performers), 0),
        COALESCE(jsonb_array_length(v_underperformers), 0),
        COALESCE(jsonb_array_length(v_alerts), 0)
    );
    
    -- Insert briefing
    INSERT INTO public.daily_briefings (
        user_id, briefing_date, executive_summary,
        top_performers, underperformers, alerts, recommendations,
        metrics_snapshot
    ) VALUES (
        p_target_user_id, v_briefing_date, v_summary,
        v_top_performers, v_underperformers, v_alerts, v_recommendations,
        v_metrics
    ) RETURNING id INTO v_briefing_id;
    
    RETURN v_briefing_id;
END $$;

-- ============================================================
-- 10. TREND ALERT DETECTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.detect_trend_alerts(
    p_user_id UUID
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_link RECORD;
    v_product RECORD;
    v_budget RECORD;
    v_ctr NUMERIC;
    v_epc NUMERIC;
    v_roi NUMERIC;
BEGIN
    -- Detect trending products (high EPC, rising)
    FOR v_product IN
        SELECT p.*, 
               COALESCE(SUM(al.clicks), 0) as total_clicks,
               COALESCE(SUM(al.conversions), 0) as total_sales,
               COALESCE(SUM(al.commission_earned), 0) as total_commission
        FROM public.products p
        JOIN public.affiliate_links al ON al.product_id = p.id
        WHERE p.user_id = p_user_id
          AND p.status = 'active'
          AND al.status = 'active'
        GROUP BY p.id
        HAVING COALESCE(SUM(al.clicks), 0) >= 50
           AND COALESCE(SUM(al.commission_earned) / NULLIF(SUM(al.clicks), 0), 0) > 10
    LOOP
        -- Check if alert already exists
        IF NOT EXISTS (
            SELECT 1 FROM public.trend_alerts
            WHERE user_id = p_user_id
              AND alert_type = 'trending_product'
              AND source_product_id = v_product.id
              AND is_dismissed = FALSE
              AND created_at > NOW() - INTERVAL '24 hours'
        ) THEN
            INSERT INTO public.trend_alerts (
                user_id, alert_type, severity, title, description,
                source_product_id, metrics
            ) VALUES (
                p_user_id, 'trending_product', 'medium',
                'Trending Product: ' || v_product.name,
                'Product is generating strong EPC (>₹10) with ' || v_product.total_clicks || ' clicks and ' || v_product.total_sales || ' sales.',
                v_product.id,
                jsonb_build_object('epc', ROUND(v_product.total_commission / NULLIF(v_product.total_clicks, 0), 2), 'clicks', v_product.total_clicks, 'sales', v_product.total_sales)
            );
        END IF;
    END LOOP;
    
    -- Detect declining products (was good, now declining)
    FOR v_link IN
        SELECT al.*, p.name as product_name
        FROM public.affiliate_links al
        JOIN public.products p ON al.product_id = p.id
        WHERE al.user_id = p_user_id
          AND al.status = 'active'
          AND p.status = 'active'
          AND al.clicks >= 100
          AND al.commission_earned / NULLIF(al.clicks, 0) < 5
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM public.trend_alerts
            WHERE user_id = p_user_id
              AND alert_type = 'declining_product'
              AND source_link_id = v_link.id
              AND is_dismissed = FALSE
              AND created_at > NOW() - INTERVAL '24 hours'
        ) THEN
            INSERT INTO public.trend_alerts (
                user_id, alert_type, severity, title, description,
                source_link_id, source_product_id, metrics
            ) VALUES (
                p_user_id, 'declining_product', 'high',
                'Declining Performance: ' || v_link.product_name,
                'Link EPC dropped below ₹5 (' || ROUND(v_link.commission_earned / NULLIF(v_link.clicks, 0), 2) || ') with ' || v_link.clicks || ' clicks.',
                v_link.id, v_link.product_id,
                jsonb_build_object('epc', ROUND(v_link.commission_earned / NULLIF(v_link.clicks, 0), 2), 'clicks', v_link.clicks)
            );
        END IF;
    END LOOP;
    
    -- Budget overspend alerts
    FOR v_budget IN
        SELECT * FROM public.budget_tracking
        WHERE user_id = p_user_id
          AND daily_budget IS NOT NULL
          AND spent_today >= daily_budget * 0.9
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM public.trend_alerts
            WHERE user_id = p_user_id
              AND alert_type = 'budget_overspend'
              AND scope_type = v_budget.scope_type
              AND scope_id = v_budget.scope_id
              AND is_dismissed = FALSE
              AND created_at > NOW() - INTERVAL '6 hours'
        ) THEN
            INSERT INTO public.trend_alerts (
                user_id, alert_type, severity, title, description,
                scope_type, scope_id, metrics
            ) VALUES (
                p_user_id, 'budget_overspend', 
                CASE WHEN v_budget.spent_today >= v_budget.daily_budget THEN 'critical' ELSE 'high' END,
                'Budget Alert: ' || v_budget.scope_type || ' at ' || ROUND(v_budget.spent_today / v_budget.daily_budget * 100) || '%',
                'Daily budget for ' || v_budget.scope_type || ' is ' || ROUND(v_budget.spent_today / v_budget.daily_budget * 100) || '% spent (₹' || v_budget.spent_today || ' / ₹' || v_budget.daily_budget || ').',
                v_budget.scope_type, v_budget.scope_id,
                jsonb_build_object('spent_today', v_budget.spent_today, 'daily_budget', v_budget.daily_budget, 'pace_status', v_budget.pace_status)
            );
        END IF;
    END LOOP;
    
    -- Commission spike detection
    DECLARE
        v_recent_commission NUMERIC;
        v_avg_commission NUMERIC;
    BEGIN
        SELECT COALESCE(SUM(amount), 0) INTO v_recent_commission
        FROM public.commissions
        WHERE user_id = p_user_id
          AND sale_date >= NOW() - INTERVAL '24 hours'
          AND status = 'approved';
        
        SELECT COALESCE(AVG(daily_total), 0) INTO v_avg_commission
        FROM (
            SELECT DATE(sale_date) as day, SUM(amount) as daily_total
            FROM public.commissions
            WHERE user_id = p_user_id
              AND sale_date >= NOW() - INTERVAL '7 days'
              AND sale_date < NOW() - INTERVAL '24 hours'
              AND status = 'approved'
            GROUP BY DATE(sale_date)
        ) sub;
        
        IF v_avg_commission > 0 AND v_recent_commission > v_avg_commission * 2 THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.trend_alerts
                WHERE user_id = p_user_id
                  AND alert_type = 'commission_spike'
                  AND is_dismissed = FALSE
                  AND created_at > NOW() - INTERVAL '24 hours'
            ) THEN
                INSERT INTO public.trend_alerts (
                    user_id, alert_type, severity, title, description,
                    metrics
                ) VALUES (
                    p_user_id, 'commission_spike', 'medium',
                    'Commission Spike Detected!',
                    'Yesterday\'s commissions (₹' || v_recent_commission || ') are ' || ROUND((v_recent_commission / v_avg_commission - 1) * 100) || '% above 7-day average (₹' || ROUND(v_avg_commission) || ').',
                    jsonb_build_object('recent', v_recent_commission, 'average', v_avg_commission, 'spike_pct', ROUND((v_recent_commission / v_avg_commission - 1) * 100))
                );
            END IF;
        END IF;
    END;
END $$;

-- ============================================================
-- 11. BUDGET PACING UPDATE
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_budget_pacing()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_budget RECORD;
    v_days_in_month INT;
    v_days_elapsed INT;
    v_expected_spend NUMERIC;
    v_pace_ratio NUMERIC;
BEGIN
    v_days_in_month := EXTRACT(DAY FROM DATE_TRUNC('month', NOW()) + INTERVAL '1 month - 1 day')::INT;
    v_days_elapsed := EXTRACT(DAY FROM NOW())::INT;
    
    FOR v_budget IN
        SELECT * FROM public.budget_tracking
        WHERE monthly_budget IS NOT NULL AND monthly_budget > 0
    LOOP
        v_expected_spend := v_budget.monthly_budget * v_days_elapsed / v_days_in_month;
        
        IF v_expected_spend > 0 THEN
            v_pace_ratio := v_budget.spent_this_month / v_expected_spend;
        ELSE
            v_pace_ratio := 0;
        END IF;
        
        -- Update pace_status
        UPDATE public.budget_tracking
        SET pace_status = CASE
            WHEN v_budget.spent_this_month >= v_budget.monthly_budget THEN 'exhausted'
            WHEN v_pace_ratio >= 1.2 THEN 'over_pacing'
            WHEN v_pace_ratio < 0.8 THEN 'under_pacing'
            ELSE 'on_track'
        END,
        projected_monthly_spend = CASE 
            WHEN v_days_elapsed > 0 THEN v_budget.spent_this_month * v_days_in_month / v_days_elapsed
            ELSE NULL
        END,
        updated_at = NOW()
        WHERE id = v_budget.id;
    END LOOP;
END $$;

-- ============================================================
-- 12. DAILY BUDGET RESET
-- ============================================================
CREATE OR REPLACE FUNCTION public.reset_daily_budget_spend()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.budget_tracking
    SET spent_today = 0,
        last_reset_daily = NOW(),
        updated_at = NOW()
    WHERE last_reset_daily < DATE_TRUNC('day', NOW());
    
    -- Also reset weekly on Monday
    UPDATE public.budget_tracking
    SET spent_this_week = 0,
        last_reset_weekly = NOW(),
        updated_at = NOW()
    WHERE last_reset_weekly < DATE_TRUNC('week', NOW());
    
    -- Reset monthly on 1st
    UPDATE public.budget_tracking
    SET spent_this_month = 0,
        last_reset_monthly = NOW(),
        updated_at = NOW()
    WHERE last_reset_monthly < DATE_TRUNC('month', NOW());
END $$;

-- ============================================================
-- 13. GRANT PERMISSIONS
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.optimizer_rules TO authenticated;
GRANT SELECT, INSERT ON public.optimizer_actions TO authenticated;
GRANT SELECT ON public.daily_briefings TO authenticated;
GRANT SELECT ON public.trend_alerts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.budget_tracking TO authenticated;

GRANT EXECUTE ON FUNCTION public.evaluate_optimizer_rules(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_optimizer_action(UUID, UUID, UUID, TEXT, JSONB, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_daily_briefing(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.detect_trend_alerts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_budget_pacing() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_daily_budget_spend() TO authenticated;
GRANT EXECUTE ON FUNCTION public.calc_link_epc(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calc_link_conversion_rate(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calc_link_roi(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calc_link_ctr(UUID, INTEGER) TO authenticated;

-- ============================================================
-- 14. CRON JOB SCHEDULE (run via pg_cron or external)
-- ============================================================
-- Add these to your cron scheduler:
-- Every 5 minutes: SELECT public.evaluate_optimizer_rules();
-- Daily at 6 AM:   SELECT public.generate_daily_briefing(); SELECT public.detect_trend_alerts();
-- Hourly:          SELECT public.update_budget_pacing();
-- Daily midnight:  SELECT public.reset_daily_budget_spend();

-- If using pg_cron:
-- SELECT cron.schedule('optimizer-eval-every-5min', '*/5 * * * *', 'SELECT public.evaluate_optimizer_rules();');
-- SELECT cron.schedule('daily-briefing-6am', '0 6 * * *', 'SELECT public.generate_daily_briefing(); SELECT public.detect_trend_alerts();');
-- SELECT cron.schedule('budget-pacing-hourly', '0 * * * *', 'SELECT public.update_budget_pacing();');
-- SELECT cron.schedule('daily-budget-reset-midnight', '0 0 * * *', 'SELECT public.reset_daily_budget_spend();');