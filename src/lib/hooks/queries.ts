"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys, apiCall } from '../query-client'

// ============================================================
// Products
// ============================================================

export interface Product {
  id: string
  user_id: string
  name: string
  description: string | null
  image_url: string | null
  affiliate_url: string
  network: string
  commission_rate: number
  commission_type: string
  category: string | null
  price: number | null
  original_price: number | null
  rating: number | null
  review_count: number | null
  gravity_score: number | null
  trend_score: number | null
  smart_score: number
  status: string
  created_at: string
  updated_at: string
}

export function useProducts(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.products.list(filters),
    queryFn: () => apiCall<Product[]>('/api/products', { 
      method: 'GET',
      // Add query params if needed
    }),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => apiCall<Product>(`/api/products/${id}`),
    enabled: !!id,
  })
}

export function useProductSmartScore(id: string) {
  return useQuery({
    queryKey: queryKeys.products.smartScore(id),
    queryFn: () => apiCall<{ smart_score: number }>(`/api/products/${id}/score`),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

// ============================================================
// Affiliate Links
// ============================================================

export interface AffiliateLink {
  id: string
  user_id: string
  product_id: string
  short_code: string
  original_url: string
  tracking_params: Record<string, unknown>
  clicks: number
  conversions: number
  commission_earned: number
  status: string
  created_at: string
  updated_at: string
  product?: Product
}

export function useLinks(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.links.list(filters),
    queryFn: () => apiCall<AffiliateLink[]>('/api/links'),
    staleTime: 2 * 60 * 1000,
  })
}

export function useLink(id: string) {
  return useQuery({
    queryKey: queryKeys.links.detail(id),
    queryFn: () => apiCall<AffiliateLink>(`/api/links/${id}`),
    enabled: !!id,
  })
}

// ============================================================
// Ad Creatives
// ============================================================

export interface AdCreative {
  id: string
  user_id: string
  product_id: string
  type: string
  hook: string
  headline: string
  body: string
  call_to_action: string
  hashtags: string[]
  image_url: string | null
  video_url: string | null
  platform: string
  format: string
  status: string
  quality_score: number
  created_at: string
  updated_at: string
  product?: Product
}

export function useAds(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.ads.list(filters),
    queryFn: () => apiCall<AdCreative[]>('/api/ads'),
    staleTime: 2 * 60 * 1000,
  })
}

export function useAdVariants(productId: string) {
  return useQuery({
    queryKey: queryKeys.ads.variants(productId),
    queryFn: () => apiCall<AdCreative[]>(`/api/ads?product_id=${productId}`),
    enabled: !!productId,
  })
}

// ============================================================
// Analytics
// ============================================================

export interface AnalyticsSummary {
  totalClicks: number
  uniqueClicks: number
  clicksByDate: { date: string; count: number }[]
  clicksByDevice: { device: string; count: number }[]
  clicksByBrowser: { browser: string; count: number }[]
  clicksByCountry: { country: string; count: number }[]
  clicksByReferrer: { referrer: string; count: number }[]
  clicksByUtmSource: { source: string; count: number }[]
  epc: number
}

export function useAnalyticsSummary(days: number = 30) {
  return useQuery({
    queryKey: queryKeys.analytics.summary(days),
    queryFn: () => apiCall<AnalyticsSummary>(`/api/clicks?days=${days}`),
    staleTime: 5 * 60 * 1000,
  })
}

export function useTopLinks(days: number = 30) {
  return useQuery({
    queryKey: queryKeys.analytics.topLinks(days),
    queryFn: () => apiCall<{ id: string; short_code: string; product: { name: string } | null; clicks: number; commission_earned: number }[]>(
      `/api/links?limit=10&days=${days}`
    ),
    staleTime: 2 * 60 * 1000,
  })
}

// ============================================================
// Commissions
// ============================================================

export interface Commission {
  id: string
  user_id: string
  link_id: string | null
  product_id: string | null
  network: string
  amount: number
  currency: string
  status: string
  sale_date: string
  approved_at: string | null
  paid_at: string | null
  created_at: string
  product?: Product
  link?: AffiliateLink
}

export function useCommissions(days: number = 30) {
  return useQuery({
    queryKey: queryKeys.commissions.list({ days }),
    queryFn: () => apiCall<Commission[]>(`/api/commissions?days=${days}`),
    staleTime: 2 * 60 * 1000,
  })
}

export function useEarnings(days: number = 30) {
  return useQuery({
    queryKey: queryKeys.commissions.earnings(days),
    queryFn: () => apiCall<{ total: number; byNetwork: Record<string, number>; byProduct: Record<string, number> }>(
      `/api/commissions?days=${days}&summary=true`
    ),
    staleTime: 5 * 60 * 1000,
  })
}

// ============================================================
// Optimizer
// ============================================================

export interface OptimizerRule {
  id: string
  user_id: string
  name: string
  description: string | null
  is_active: boolean
  trigger_type: string
  trigger_value: number
  trigger_operator: string
  action_type: string
  priority: number
  trigger_count: number
  last_triggered_at: string | null
  created_at: string
  evaluation_window_hours: number
}

export interface OptimizerAction {
  id: string
  rule_id: string
  trigger_type: string
  actual_value: number
  action_type: string
  status: string
  result_message: string | null
  created_at: string
  rule?: {
    name: string
    trigger_type: string
    action_type: string
  }
}

export interface DailyBriefing {
  id: string
  briefing_date: string
  executive_summary: string
  top_performers: unknown[]
  underperformers: unknown[]
  alerts: unknown[]
  recommendations: unknown[]
  is_read: boolean
  generated_at: string
}

export interface TrendAlert {
  id: string
  alert_type: string
  severity: string
  title: string
  description: string
  source_platform: string | null
  is_read: boolean
  is_dismissed: boolean
  created_at: string
}

export interface BudgetTracking {
  id: string
  scope_type: string
  scope_id: string | null
  daily_budget: number
  weekly_budget: number
  monthly_budget: number
  spent_today: number
  spent_this_week: number
  spent_this_month: number
  pace_status: string
  projected_monthly_spend: number | null
}

export function useOptimizerRules() {
  return useQuery({
    queryKey: queryKeys.optimizer.rules,
    queryFn: () => apiCall<OptimizerRule[]>('/api/optimizer/rules'),
    staleTime: 1 * 60 * 1000, // 1 minute for active rules
  })
}

export function useOptimizerRule(id: string) {
  return useQuery({
    queryKey: queryKeys.optimizer.rule(id),
    queryFn: () => apiCall<OptimizerRule>(`/api/optimizer/rules/${id}`),
    enabled: !!id,
  })
}

export function useOptimizerActions(limit = 20) {
  return useQuery({
    queryKey: queryKeys.optimizer.actions,
    queryFn: () => apiCall<OptimizerAction[]>(`/api/optimizer/actions?limit=${limit}`),
    staleTime: 1 * 60 * 1000,
  })
}

export function useDailyBriefings(limit = 10) {
  return useQuery({
    queryKey: queryKeys.optimizer.briefings,
    queryFn: () => apiCall<DailyBriefing[]>(`/api/optimizer/briefings?limit=${limit}`),
    staleTime: 5 * 60 * 1000,
  })
}

export function useTodaysBriefing() {
  const today = new Date().toISOString().split('T')[0]
  return useQuery({
    queryKey: queryKeys.optimizer.briefing(today),
    queryFn: () => apiCall<DailyBriefing>(`/api/optimizer/briefings?date=${today}`),
    staleTime: 5 * 60 * 1000,
  })
}

export function useTrendAlerts(limit = 20) {
  return useQuery({
    queryKey: queryKeys.optimizer.alerts,
    queryFn: () => apiCall<TrendAlert[]>(`/api/optimizer/alerts?limit=${limit}`),
    staleTime: 1 * 60 * 1000,
  })
}

export function useBudgetTracking() {
  return useQuery({
    queryKey: queryKeys.optimizer.budgets,
    queryFn: () => apiCall<BudgetTracking[]>('/api/optimizer/budgets'),
    staleTime: 2 * 60 * 1000,
  })
}

// ============================================================
// Social Accounts
// ============================================================

export interface SocialAccount {
  id: string
  user_id: string
  platform: string
  account_name: string
  account_id: string
  is_active: boolean
  daily_post_limit: number
  posts_today: number
  last_post_at: string | null
  created_at: string
}

export function useSocialAccounts() {
  return useQuery({
    queryKey: queryKeys.socialAccounts.list,
    queryFn: () => apiCall<SocialAccount[]>('/api/social-accounts'),
    staleTime: 5 * 60 * 1000,
  })
}

// ============================================================
// Scheduled Posts
// ============================================================

export interface ScheduledPost {
  id: string
  user_id: string
  creative_id: string
  platform: string
  account_id: string | null
  caption: string
  media_urls: string[]
  scheduled_at: string
  status: string
  platform_post_id: string | null
  error_message: string | null
  created_at: string
  creative?: {
    id: string
    headline: string
    body: string
    image_url: string | null
    video_url: string | null
    platform: string
    format: string
    product: {
      name: string
      image_url: string | null
    }
  }
}

export function useScheduledPosts(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.scheduledPosts.list(filters),
    queryFn: () => apiCall<ScheduledPost[]>('/api/scheduled-posts'),
    staleTime: 2 * 60 * 1000,
  })
}

// ============================================================
// Teams
// ============================================================

export interface Team {
  id: string
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  plan: string
  owner_id: string
  created_at: string
}

export function useTeams() {
  return useQuery({
    queryKey: queryKeys.teams.list,
    queryFn: () => apiCall<Team[]>('/api/teams'),
    staleTime: 5 * 60 * 1000,
  })
}

// ============================================================
// MUTATIONS
// ============================================================

// Product mutations
export function useCreateProduct() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: Partial<Product>) => apiCall<Product>('/api/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) => 
      apiCall<Product>(`/api/products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(id) })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => apiCall(`/api/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
    },
  })
}

// Ad mutations
export function useGenerateAds() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: {
      product_id: string
      hook_ids?: string[]
      platforms: string[]
      count: number
      use_ai: boolean
      generate_image?: boolean
      generate_video?: boolean
      generate_voice?: boolean
    }) => apiCall('/api/ads', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ads.all })
    },
  })
}

export function useUpdateAdStatus() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      apiCall(`/api/ads`, {
        method: 'PATCH',
        body: JSON.stringify({ id, status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ads.all })
    },
  })
}

// Commission mutations
export function useCreateCommission() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: {
      link_id: string
      product_id: string
      network: string
      amount: number
      currency: string
      status: string
      sale_date: string
    }) => apiCall('/api/commissions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.commissions.all })
    },
  })
}

// Optimizer mutations
export function useCreateOptimizerRule() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: {
      name: string
      description?: string
      trigger_type: string
      trigger_value: number
      trigger_operator: string
      evaluation_window_hours: number
      action_type: string
      action_params?: Record<string, unknown>
      cooldown_hours?: number
      priority?: number
    }) => apiCall<OptimizerRule>('/api/optimizer/rules', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.optimizer.rules })
    },
  })
}

export function useUpdateOptimizerRule() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<OptimizerRule> }) => 
      apiCall<OptimizerRule>(`/api/optimizer/rules/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.optimizer.rules })
      queryClient.invalidateQueries({ queryKey: queryKeys.optimizer.rule(id) })
    },
  })
}

export function useToggleOptimizerRule() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => 
      apiCall<OptimizerRule>(`/api/optimizer/rules/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.optimizer.rules })
    },
  })
}

export function useGenerateBriefing() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: () => apiCall('/api/optimizer/briefings', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.optimizer.briefings })
    },
  })
}

export function useMarkAlertRead() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (ids: string[]) => apiCall('/api/optimizer/alerts', {
      method: 'PATCH',
      body: JSON.stringify({ ids, is_read: true }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.optimizer.alerts })
    },
  })
}

export function useDismissAlert() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (ids: string[]) => apiCall('/api/optimizer/alerts', {
      method: 'PATCH',
      body: JSON.stringify({ ids, is_dismissed: true }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.optimizer.alerts })
    },
  })
}

// Social Account mutations
export function useCreateSocialAccount() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: {
      platform: string
      account_name: string
      account_id: string
      access_token: string
      refresh_token?: string
      token_expires_at?: string
    }) => apiCall<SocialAccount>('/api/social-accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.socialAccounts.all })
    },
  })
}

export function useUpdateSocialAccount() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SocialAccount> }) => 
      apiCall<SocialAccount>(`/api/social-accounts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.socialAccounts.all })
    },
  })
}

export function useDeleteSocialAccount() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => apiCall(`/api/social-accounts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.socialAccounts.all })
    },
  })
}

// Scheduled Post mutations
export function useCreateScheduledPost() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: Partial<ScheduledPost>) => apiCall<ScheduledPost>('/api/scheduled-posts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scheduledPosts.all })
    },
  })
}

export function useUpdateScheduledPost() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ScheduledPost> }) => 
      apiCall<ScheduledPost>(`/api/scheduled-posts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scheduledPosts.all })
    },
  })
}

export function useDeleteScheduledPost() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => apiCall(`/api/scheduled-posts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scheduledPosts.all })
    },
  })
}

// Compliance mutations
export function useCheckCompliance() {
  return useMutation({
    mutationFn: (data: {
      content_type: 'ad' | 'image' | 'video'
      content_id: string
      auto_fix?: boolean
    }) => apiCall('/api/compliance', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  })
}

// Product Import mutations
export function useImportSearch() {
  return useMutation({
    mutationFn: (data: {
      action: 'search'
      network: string
      query: string
    }) => apiCall('/api/products/import', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  })
}

export function useImportUrl() {
  return useMutation({
    mutationFn: (data: {
      action: 'url'
      url: string
    }) => apiCall('/api/products/import', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  })
}

export function useImportSave() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: {
      action: 'save'
      product: unknown
    }) => apiCall('/api/products/import', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
    },
  })
}

// Team mutations
export function useCreateTeam() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: {
      name: string
      slug: string
      description?: string
    }) => apiCall<Team>('/api/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all })
    },
  })
}

export function useUpdateTeam() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Team> }) => 
      apiCall<Team>(`/api/teams/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all })
    },
  })
}