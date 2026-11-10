import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: budgets, error } = await supabase
      .from('budget_tracking')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, budgets: budgets || [] })
  } catch (error) {
    console.error('Budgets fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 })
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
    const { 
      scope_type = 'global',
      scope_id,
      daily_budget,
      weekly_budget,
      monthly_budget,
      auto_pause_on_exhaust = true,
      auto_scale_on_roi = false
    } = body

    if (!daily_budget && !weekly_budget && !monthly_budget) {
      return NextResponse.json({ error: 'At least one budget limit required' }, { status: 400 })
    }

    const { data: budget, error } = await supabase
      .from('budget_tracking')
      .upsert({
        user_id: user.id,
        scope_type,
        scope_id,
        daily_budget: daily_budget || 0,
        weekly_budget: weekly_budget || 0,
        monthly_budget: monthly_budget || 0,
        auto_pause_on_exhaust,
        auto_scale_on_roi,
      }, {
        onConflict: 'user_id,scope_type,scope_id',
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, budget })
  } catch (error) {
    console.error('Budget create error:', error)
    return NextResponse.json({ error: 'Failed to create budget' }, { status: 500 })
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
    const { scope_type = 'global', scope_id, ...updates } = body

    if (!scope_type || !scope_id) {
      return NextResponse.json({ error: 'scope_type and scope_id required' }, { status: 400 })
    }

    const { data: budget, error } = await supabase
      .from('budget_tracking')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('scope_type', scope_type)
      .eq('scope_id', scope_id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, budget })
  } catch (error) {
    console.error('Budget update error:', error)
    return NextResponse.json({ error: 'Failed to update budget' }, { status: 500 })
  }
}