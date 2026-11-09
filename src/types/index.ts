export interface Product {
  id: string
  user_id: string
  name: string
  description: string | null
  image_url: string | null
  affiliate_url: string
  network: 'amazon' | 'flipkart' | 'clickbank' | 'meesho' | 'cuelinks' | 'custom'
  commission_rate: number
  commission_type: 'percentage' | 'fixed'
  category: string | null
  price: number | null
  original_price: number | null
  rating: number | null
  review_count: number | null
  gravity_score: number | null
  trend_score: number | null
  smart_score: number
  status: 'active' | 'paused' | 'archived'
  created_at: string
  updated_at: string
}

export interface AffiliateLink {
  id: string
  user_id: string
  product_id: string
  short_code: string
  original_url: string
  tracking_params: Record<string, string>
  clicks: number
  conversions: number
  commission_earned: number
  status: 'active' | 'paused' | 'expired'
  created_at: string
  updated_at: string
}

export interface AdCreative {
  id: string
  user_id: string
  product_id: string
  type: 'image' | 'video' | 'carousel' | 'story'
  hook: string
  headline: string
  body: string
  call_to_action: string
  hashtags: string[]
  image_url: string | null
  video_url: string | null
  platform: 'instagram' | 'youtube' | 'pinterest' | 'x' | 'facebook' | 'tiktok'
  format: 'post' | 'reel' | 'short' | 'story' | 'pin' | 'tweet'
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'scheduled' | 'published' | 'failed'
  quality_score: number | null
  scheduled_at: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface ScheduledPost {
  id: string
  user_id: string
  creative_id: string
  platform: 'instagram' | 'youtube' | 'pinterest' | 'x' | 'facebook' | 'tiktok'
  account_id: string | null
  caption: string
  media_urls: string[]
  scheduled_at: string
  published_at: string | null
  status: 'scheduled' | 'publishing' | 'published' | 'failed'
  platform_post_id: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface Commission {
  id: string
  user_id: string
  link_id: string | null
  product_id: string | null
  network: string
  amount: number
  currency: string
  status: 'pending' | 'approved' | 'paid' | 'rejected' | 'cancelled'
  sale_date: string
  approved_at: string | null
  paid_at: string | null
  created_at: string
}

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  plan: 'free' | 'pro' | 'agency'
  credits_remaining: number
  daily_post_limit: number
  total_posts_this_month: number
  created_at: string
  updated_at: string
}

export interface SocialAccount {
  id: string
  user_id: string
  platform: 'instagram' | 'youtube' | 'pinterest' | 'x' | 'facebook' | 'tiktok'
  account_name: string
  account_id: string
  access_token: string
  refresh_token: string | null
  token_expires_at: string | null
  is_active: boolean
  daily_post_limit: number
  posts_today: number
  last_post_at: string | null
  created_at: string
  updated_at: string
}