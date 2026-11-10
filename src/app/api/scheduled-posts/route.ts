import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

const PLATFORMS = ['instagram', 'youtube', 'pinterest', 'x', 'facebook', 'tiktok'] as const
const POST_STATUSES = ['scheduled', 'publishing', 'published', 'failed'] as const

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const platform = searchParams.get('platform')
    const creativeId = searchParams.get('creative_id')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('scheduled_posts')
      .select(`
        *,
        creative:ad_creatives(
          id,
          headline,
          body,
          image_url,
          video_url,
          platform,
          format,
          product:products(name, image_url)
        ),
        account:social_accounts(platform, account_name)
      `)
      .eq('user_id', user.id)
      .order('scheduled_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (status) query = query.eq('status', status)
    if (platform) query = query.eq('platform', platform)
    if (creativeId) query = query.eq('creative_id', creativeId)
    if (from) query = query.gte('scheduled_at', from)
    if (to) query = query.lte('scheduled_at', to)

    const { data: posts, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('scheduled_posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
    if (status) countQuery = countQuery.eq('status', status)
    if (platform) countQuery = countQuery.eq('platform', platform)
    if (creativeId) countQuery = countQuery.eq('creative_id', creativeId)
    if (from) countQuery = countQuery.gte('scheduled_at', from)
    if (to) countQuery = countQuery.lte('scheduled_at', to)

    const { count } = await countQuery

    return NextResponse.json({ 
      success: true, 
      posts: posts || [],
      pagination: { limit, offset, total: count || 0 }
    })
  } catch (error) {
    console.error('Scheduled posts fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch scheduled posts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { creative_id, platform, account_id, caption, media_urls, scheduled_at } = body

    if (!creative_id || !platform || !caption || !scheduled_at) {
      return NextResponse.json(
        { error: 'creative_id, platform, caption, and scheduled_at are required' },
        { status: 400 }
      )
    }

    if (!PLATFORMS.includes(platform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
    }

    // Verify creative ownership
    const { data: creative, error: creativeError } = await supabase
      .from('ad_creatives')
      .select('id, user_id, platform, format, image_url, video_url, headline, body, cta, hashtags')
      .eq('id', creative_id)
      .eq('user_id', user.id)
      .single()

    if (creativeError || !creative) {
      return NextResponse.json({ error: 'Creative not found' }, { status: 404 })
    }

    // Verify account ownership if provided
    if (account_id) {
      const { data: account, error: accountError } = await supabase
        .from('social_accounts')
        .select('id, user_id, platform')
        .eq('id', account_id)
        .eq('user_id', user.id)
        .eq('platform', platform)
        .single()

      if (accountError || !account) {
        return NextResponse.json({ error: 'Social account not found or platform mismatch' }, { status: 404 })
      }
    }

    // Use creative's media if not provided
    const finalMediaUrls = media_urls && media_urls.length > 0 
      ? media_urls 
      : (creative.image_url ? [creative.image_url] : []).concat(creative.video_url ? [creative.video_url] : [])

    const scheduledAt = new Date(scheduled_at)
    if (isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
      return NextResponse.json({ error: 'scheduled_at must be a future date' }, { status: 400 })
    }

    const { data: post, error } = await supabase
      .from('scheduled_posts')
      .insert({
        user_id: user.id,
        creative_id,
        platform,
        account_id,
        caption,
        media_urls: finalMediaUrls,
        scheduled_at: scheduledAt.toISOString(),
        status: 'scheduled',
      })
      .select(`
        *,
        creative:ad_creatives(
          id,
          headline,
          body,
          image_url,
          video_url,
          platform,
          format,
          product:products(name, image_url)
        ),
        account:social_accounts(platform, account_name)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Update creative status to scheduled
    await supabase
      .from('ad_creatives')
      .update({ status: 'scheduled', scheduled_at: scheduledAt.toISOString() })
      .eq('id', creative_id)

    return NextResponse.json({ success: true, post })
  } catch (error) {
    console.error('Scheduled post create error:', error)
    return NextResponse.json({ error: 'Failed to create scheduled post' }, { status: 500 })
  }
}