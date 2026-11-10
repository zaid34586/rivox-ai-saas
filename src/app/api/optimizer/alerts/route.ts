import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const isRead = searchParams.get('is_read')
    const alertType = searchParams.get('type')

    let query = supabase
      .from('trend_alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (isRead !== null) {
      query = query.eq('is_read', isRead === 'true')
    }
    if (alertType) {
      query = query.eq('alert_type', alertType)
    }

    const { data: alerts, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, alerts: alerts || [] })
  } catch (error) {
    console.error('Trend alerts fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { ids, is_read, is_dismissed } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array required' }, { status: 400 })
    }

    const updates: Record<string, boolean> = {}
    if (is_read !== undefined) updates.is_read = is_read
    if (is_dismissed !== undefined) updates.is_dismissed = is_dismissed

    const { data, error } = await supabase
      .from('trend_alerts')
      .update(updates)
      .in('id', ids)
      .eq('user_id', user.id)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, alerts: data })
  } catch (error) {
    console.error('Trend alerts update error:', error)
    return NextResponse.json({ error: 'Failed to update alerts' }, { status: 500 })
  }
}