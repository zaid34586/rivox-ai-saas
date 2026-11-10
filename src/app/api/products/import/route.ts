import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { calculateSmartScore } from '@/lib/scoring'
import { getAdapter, detectNetwork, ImportError, supportedNetworks, type ImportedProduct } from '@/lib/import'

/**
 * Multi-network product import.
 *
 * POST { action: 'search', network, query }  -> candidates with score preview
 * POST { action: 'url', url }                -> single candidate (network auto-detected)
 * POST { action: 'save', product }           -> validate + score + insert into products
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, network, query, url, product } = body as {
      action?: string
      network?: string
      query?: string
      url?: string
      product?: ImportedProduct
    }

    if (action === 'networks') {
      return NextResponse.json({ success: true, networks: supportedNetworks() })
    }

    if (action === 'search') {
      if (!network) {
        return NextResponse.json({ error: 'network is required' }, { status: 400 })
      }
      const adapter = getAdapter(network)
      const results = await adapter.search(query || '')
      return NextResponse.json({
        success: true,
        products: results.map(withScorePreview),
        source: results[0]?.source || 'demo',
      })
    }

    if (action === 'url') {
      if (!url) {
        return NextResponse.json({ error: 'url is required' }, { status: 400 })
      }
      // Known networks use their adapter; anything else goes through the
      // generic adapter (JSON-LD/og parsing for any store).
      const detected = detectNetwork(url) ?? 'custom'
      const adapter = getAdapter(detected)
      const product = await adapter.importByUrl(url)
      return NextResponse.json({ success: true, product: withScorePreview(product) })
    }

    if (action === 'save') {
      if (!product || !product.name || !product.affiliate_url) {
        return NextResponse.json({ error: 'product.name and product.affiliate_url are required' }, { status: 400 })
      }
      if (!product.network || !product.commission_type) {
        return NextResponse.json({ error: 'product.network and product.commission_type are required' }, { status: 400 })
      }

      const score = calculateSmartScore({
        commission_rate: product.commission_rate,
        commission_type: product.commission_type,
        gravity_score: product.gravity_score ?? null,
        trend_score: product.trend_score ?? null,
        rating: product.rating ?? null,
        review_count: product.review_count ?? null,
        price: product.price ?? null,
        original_price: product.original_price ?? null,
      })

      const { data: created, error } = await supabase
        .from('products')
        .insert({
          user_id: user.id,
          name: product.name.slice(0, 300),
          description: product.description,
          image_url: product.image_url,
          affiliate_url: product.affiliate_url,
          network: product.network,
          commission_rate: product.commission_rate,
          commission_type: product.commission_type,
          category: product.category,
          price: product.price,
          original_price: product.original_price,
          rating: product.rating,
          review_count: product.review_count,
          gravity_score: product.gravity_score,
          trend_score: product.trend_score,
          smart_score: score.total,
          status: 'active',
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, product: created, smart_score: score.total })
    }

    return NextResponse.json(
      { error: `Unknown action "${action}". Use: search | url | save | networks` },
      { status: 400 }
    )
  } catch (error) {
    if (error instanceof ImportError) {
      return NextResponse.json({ error: error.message }, { status: 422 })
    }
    console.error('Product import error:', error)
    return NextResponse.json({ error: 'Failed to import product' }, { status: 500 })
  }
}

function withScorePreview(product: ImportedProduct) {
  const score = calculateSmartScore({
    commission_rate: product.commission_rate,
    commission_type: product.commission_type,
    gravity_score: product.gravity_score,
    trend_score: product.trend_score,
    rating: product.rating,
    review_count: product.review_count,
    price: product.price,
    original_price: product.original_price,
  })
  return { ...product, smart_score: score.total }
}
