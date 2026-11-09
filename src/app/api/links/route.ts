import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { generateUniqueShortCode } from '@/lib/links'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { product_id, short_code, tracking_params } = body

    if (!product_id) {
      return NextResponse.json(
        { error: 'product_id is required' },
        { status: 400 }
      )
    }

    // Verify product belongs to user
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, affiliate_url, name')
      .eq('id', product_id)
      .eq('user_id', user.id)
      .single()

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Generate short code if not provided
    let finalShortCode = short_code
    if (!finalShortCode) {
      // Get existing codes to avoid collision
      const { data: existingLinks } = await supabase
        .from('affiliate_links')
        .select('short_code')
        .eq('user_id', user.id)
      
      const existingCodes = existingLinks?.map(l => l.short_code) || []
      finalShortCode = generateUniqueShortCode(existingCodes)
    } else {
      // Check if custom code already exists
      const { data: existing } = await supabase
        .from('affiliate_links')
        .select('id')
        .eq('short_code', finalShortCode)
        .eq('user_id', user.id)
        .single()
      
      if (existing) {
        return NextResponse.json(
          { error: 'Short code already exists' },
          { status: 409 }
        )
      }
    }

    // Build tracking URL
    const trackingUrl = new URL(product.affiliate_url)
    if (tracking_params?.sub1) trackingUrl.searchParams.set('subid', tracking_params.sub1)
    if (tracking_params?.sub2) trackingUrl.searchParams.set('subid2', tracking_params.sub2)
    if (tracking_params?.sub3) trackingUrl.searchParams.set('subid3', tracking_params.sub3)
    if (tracking_params?.sub4) trackingUrl.searchParams.set('subid4', tracking_params.sub4)
    trackingUrl.searchParams.set('t', Date.now().toString())

    // Create link record
    const { data: link, error } = await supabase
      .from('affiliate_links')
      .insert({
        user_id: user.id,
        product_id,
        short_code: finalShortCode,
        original_url: product.affiliate_url,
        tracking_params: tracking_params || {},
        status: 'active',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const shortUrl = `${baseUrl}/go/${finalShortCode}`

    return NextResponse.json({
      success: true,
      link: {
        ...link,
        short_url: shortUrl,
        tracking_url: trackingUrl.toString(),
      }
    })
  } catch (error) {
    console.error('Link creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create link' },
      { status: 500 }
    )
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
    const productId = searchParams.get('product_id')

    let query = supabase
      .from('affiliate_links')
      .select(`
        *,
        products:product_id (name, network)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (productId) {
      query = query.eq('product_id', productId)
    }

    const { data: links, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const linksWithUrls = (links || []).map(link => ({
      ...link,
      short_url: `${baseUrl}/go/${link.short_code}`,
    }))

    return NextResponse.json({ success: true, links: linksWithUrls })
  } catch (error) {
    console.error('Links fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch links' },
      { status: 500 }
    )
  }
}