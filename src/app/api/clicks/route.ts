import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { hashIp, parseUserAgent, extractUtmParams } from '@/lib/analytics'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const body = await request.json()
    
    const { 
      link_id, 
      ip, 
      user_agent, 
      referrer, 
      url 
    } = body

    if (!link_id) {
      return NextResponse.json(
        { error: 'link_id is required' },
        { status: 400 }
      )
    }

    // Get client IP if not provided
    const clientIp = ip || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const ua = user_agent || request.headers.get('user-agent') || 'unknown'
    const ref = referrer || request.headers.get('referer') || 'Direct'

    // Parse tracking data
    const { device_type, browser, os } = parseUserAgent(ua)
    const ipHash = hashIp(clientIp)
    const country = 'Unknown' // Use GeoIP service in production
    const utm = extractUtmParams(url || request.headers.get('referer') || '')

    // Record click event
    const { data: click, error } = await supabase
      .from('click_events')
      .insert({
        link_id,
        user_id: (await supabase.auth.getUser()).data.user?.id || null,
        ip_hash: ipHash,
        user_agent: ua,
        referrer: ref,
        country,
        device_type,
        browser,
        os,
        utm_source: utm.utm_source,
        utm_medium: utm.utm_medium,
        utm_campaign: utm.utm_campaign,
        utm_content: utm.utm_content,
        utm_term: utm.utm_term,
      })
      .select()
      .single()

    if (error) {
      console.error('Click record error:', error)
      return NextResponse.json({ error: 'Failed to record click' }, { status: 500 })
    }

    // Increment link click count
    await supabase.rpc('increment_clicks', { link_id })

    return NextResponse.json({ success: true, click_id: click.id })
  } catch (error) {
    console.error('Click tracking error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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
    const linkId = searchParams.get('link_id')
    const productId = searchParams.get('product_id')
    const days = parseInt(searchParams.get('days') || '30')

    // Get user's links
    let linkQuery = supabase
      .from('affiliate_links')
      .select('id')
      .eq('user_id', user.id)

    if (linkId) {
      linkQuery = linkQuery.eq('id', linkId)
    }

    const { data: userLinks, error: linksError } = await linkQuery
    if (linksError) {
      return NextResponse.json({ error: linksError.message }, { status: 500 })
    }

    const linkIds = userLinks?.map(l => l.id) || []

    if (linkIds.length === 0) {
      return NextResponse.json({ 
        success: true, 
        summary: {
          totalClicks: 0,
          uniqueClicks: 0,
          clicksByDate: [],
          clicksByDevice: [],
          clicksByBrowser: [],
          clicksByCountry: [],
          clicksByReferrer: [],
          clicksByUtmSource: [],
          epc: 0,
        }
      })
    }

    // Get click events for these links
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    const { data: clicks, error: clicksError } = await supabase
      .from('click_events')
      .select('*')
      .in('link_id', linkIds)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    if (clicksError) {
      return NextResponse.json({ error: clicksError.message }, { status: 500 })
    }

    // Get commissions for EPC calculation
    const { data: commissions } = await supabase
      .from('commissions')
      .select('amount, link_id')
      .in('link_id', linkIds)
      .gte('sale_date', startDate.toISOString())

    // Calculate summary using analytics lib
    const { calculateClickSummary } = await import('@/lib/analytics')
    const summary = calculateClickSummary(clicks || [], commissions || [])

    return NextResponse.json({ success: true, summary, rawClicks: clicks?.length || 0 })
  } catch (error) {
    console.error('Analytics fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}