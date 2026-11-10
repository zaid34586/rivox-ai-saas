import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

const PLATFORMS = ['instagram', 'youtube', 'pinterest', 'x', 'facebook', 'tiktok'] as const

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { is_active, daily_post_limit, access_token, refresh_token, token_expires_at } = body

    // Verify ownership
    const { data: existing, error: findError } = await supabase
      .from('social_accounts')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (findError || !existing) {
      return NextResponse.json({ error: 'Social account not found' }, { status: 404 })
    }

    const updates: Record<string, any> = { updated_at: new Date().toISOString() }
    if (typeof is_active === 'boolean') updates.is_active = is_active
    if (typeof daily_post_limit === 'number') updates.daily_post_limit = daily_post_limit
    if (access_token) updates.access_token = access_token
    if (refresh_token) updates.refresh_token = refresh_token
    if (token_expires_at) updates.token_expires_at = new Date(token_expires_at).toISOString()

    const { data, error } = await supabase
      .from('social_accounts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, account: data })
  } catch (error) {
    console.error('Social account update error:', error)
    return NextResponse.json({ error: 'Failed to update social account' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify ownership
    const { data: existing, error: findError } = await supabase
      .from('social_accounts')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (findError || !existing) {
      return NextResponse.json({ error: 'Social account not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('social_accounts')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Social account delete error:', error)
    return NextResponse.json({ error: 'Failed to delete social account' }, { status: 500 })
  }
}