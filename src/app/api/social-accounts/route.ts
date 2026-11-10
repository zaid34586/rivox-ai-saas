import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

const PLATFORMS = ['instagram', 'youtube', 'pinterest', 'x', 'facebook', 'tiktok'] as const

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: accounts, error } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, accounts: accounts || [] })
  } catch (error) {
    console.error('Social accounts fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch social accounts' }, { status: 500 })
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
    const { platform, account_name, account_id, access_token, refresh_token, token_expires_at, daily_post_limit } = body

    if (!platform || !account_name || !account_id || !access_token) {
      return NextResponse.json(
        { error: 'platform, account_name, account_id, and access_token are required' },
        { status: 400 }
      )
    }

    if (!PLATFORMS.includes(platform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
    }

    // Check if account already exists
    const { data: existing } = await supabase
      .from('social_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('platform', platform)
      .eq('account_id', account_id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Account already connected' }, { status: 409 })
    }

    const { data: account, error } = await supabase
      .from('social_accounts')
      .insert({
        user_id: user.id,
        platform,
        account_name,
        account_id,
        access_token,
        refresh_token,
        token_expires_at: token_expires_at ? new Date(token_expires_at).toISOString() : null,
        daily_post_limit: daily_post_limit || 10,
        posts_today: 0,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, account })
  } catch (error) {
    console.error('Social account create error:', error)
    return NextResponse.json({ error: 'Failed to create social account' }, { status: 500 })
  }
}