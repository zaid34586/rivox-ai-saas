import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: rules, error } = await supabase
      .from('optimizer_rules')
      .select('*')
      .eq('user_id', user.id)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, rules: rules || [] })
  } catch (error) {
    console.error('Optimizer rules fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 })
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
      name, 
      description, 
      trigger_type, 
      trigger_value, 
      trigger_operator, 
      evaluation_window_hours,
      action_type, 
      action_params,
      cooldown_hours,
      priority 
    } = body

    if (!name || !trigger_type || !trigger_value || !action_type) {
      return NextResponse.json(
        { error: 'name, trigger_type, trigger_value, and action_type are required' },
        { status: 400 }
      )
    }

    const validTriggers = ['clicks_no_sales', 'epc_below', 'roi_below', 'daily_budget', 'conversion_rate']
    const validActions = ['pause_link', 'pause_product', 'scale_budget', 'create_lookalike', 'notify_only']
    const validOperators = ['>=', '<=', '>', '<', '=']

    if (!validTriggers.includes(trigger_type)) {
      return NextResponse.json({ error: 'Invalid trigger_type' }, { status: 400 })
    }
    if (!validActions.includes(action_type)) {
      return NextResponse.json({ error: 'Invalid action_type' }, { status: 400 })
    }
    if (!validOperators.includes(trigger_operator)) {
      return NextResponse.json({ error: 'Invalid trigger_operator' }, { status: 400 })
    }

    const { data: rule, error } = await supabase
      .from('optimizer_rules')
      .insert({
        user_id: user.id,
        name,
        description,
        trigger_type,
        trigger_value,
        trigger_operator,
        evaluation_window_hours: evaluation_window_hours || 24,
        action_type,
        action_params: action_params || {},
        cooldown_hours: cooldown_hours || 24,
        priority: priority || 100,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, rule })
  } catch (error) {
    console.error('Optimizer rule create error:', error)
    return NextResponse.json({ error: 'Failed to create rule' }, { status: 500 })
  }
}