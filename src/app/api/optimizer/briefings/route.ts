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
    const limit = parseInt(searchParams.get('limit') || '30')
    const offset = parseInt(searchParams.get('offset') || '0')
    const date = searchParams.get('date') // YYYY-MM-DD

    let query = supabase
      .from('daily_briefings')
      .select('*')
      .eq('user_id', user.id)
      .order('briefing_date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (date) {
      query = query.eq('briefing_date', date)
    }

    const { data: briefings, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, briefings: briefings || [] })
  } catch (error) {
    console.error('Briefings fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch briefings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Trigger briefing generation
    const { data: briefingId, error } = await supabase.rpc('generate_daily_briefing', {
      target_user_id: user.id
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch the generated briefing
    const { data: briefing, error: fetchError } = await supabase
      .from('daily_briefings')
      .select('*')
      .eq('id', briefingId)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, briefing })
  } catch (error) {
    console.error('Briefing generation error:', error)
    return NextResponse.json({ error: 'Failed to generate briefing' }, { status: 500 })
  }
}