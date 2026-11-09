import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      link_id, 
      product_id, 
      network, 
      amount, 
      currency = 'INR', 
      status = 'pending',
      sale_date 
    } = body

    if (!network || !amount) {
      return NextResponse.json(
        { error: 'network and amount are required' },
        { status: 400 }
      )
    }

    // Validate user owns the link/product if provided
    if (link_id) {
      const { data: link, error: linkError } = await supabase
        .from('affiliate_links')
        .select('id, user_id')
        .eq('id', link_id)
        .eq('user_id', user.id)
        .single()
      
      if (linkError || !link) {
        return NextResponse.json({ error: 'Invalid link' }, { status: 400 })
      }
    }

    if (product_id) {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, user_id')
        .eq('id', product_id)
        .eq('user_id', user.id)
        .single()
      
      if (productError || !product) {
        return NextResponse.json({ error: 'Invalid product' }, { status: 400 })
      }
    }

    const { data: commission, error } = await supabase
      .from('commissions')
      .insert({
        user_id: user.id,
        link_id: link_id || null,
        product_id: product_id || null,
        network,
        amount,
        currency,
        status,
        sale_date: sale_date || new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If link_id provided, update link's commission_earned and conversions
    if (link_id && status === 'approved') {
      await supabase.rpc('increment_commission', { 
        link_id, 
        amount 
      })
    }

    return NextResponse.json({ success: true, commission })
  } catch (error) {
    console.error('Commission creation error:', error)
    return NextResponse.json({ error: 'Failed to create commission' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const network = searchParams.get('network')
    const days = parseInt(searchParams.get('days') || '30')
    const limit = parseInt(searchParams.get('limit') || '100')

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    let query = supabase
      .from('commissions')
      .select(`
        *,
        affiliate_links:link_id (short_code, products:product_id(name, network)),
        products:product_id (name, network)
      `)
      .eq('user_id', user.id)
      .gte('sale_date', startDate.toISOString())
      .order('sale_date', { ascending: false })
      .limit(limit)

    if (status) query = query.eq('status', status)
    if (network) query = query.eq('network', network)

    const { data: commissions, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, commissions: commissions || [] })
  } catch (error) {
    console.error('Commissions fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch commissions' }, { status: 500 })
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
    const { id, status, paid_at } = body

    if (!id || !status) {
      return NextResponse.json(
        { error: 'id and status are required' },
        { status: 400 }
      )
    }

    // Verify ownership
    const { data: commission, error: findError } = await supabase
      .from('commissions')
      .select('id, user_id, link_id, amount, status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (findError || !commission) {
      return NextResponse.json({ error: 'Commission not found' }, { status: 404 })
    }

    const updateData: Record<string, any> = { status }
    if (status === 'paid') updateData.paid_at = paid_at || new Date().toISOString()
    if (status === 'approved') updateData.approved_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('commissions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If link_id and status changed to approved, update link earnings
    if (commission.link_id && commission.status !== 'approved' && status === 'approved') {
      await supabase.rpc('increment_commission', { 
        link_id: commission.link_id, 
        amount: commission.amount 
      })
    }

    return NextResponse.json({ success: true, commission: data })
  } catch (error) {
    console.error('Commission update error:', error)
    return NextResponse.json({ error: 'Failed to update commission' }, { status: 500 })
  }
}