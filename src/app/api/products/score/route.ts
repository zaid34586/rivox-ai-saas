import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { calculateSmartScore, type ScoreInputs } from '@/lib/scoring'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { product_id, ...inputs } = body as { product_id?: string } & ScoreInputs

    // Validate required fields
    if (typeof inputs.commission_rate !== 'number' || !inputs.commission_type) {
      return NextResponse.json(
        { error: 'commission_rate and commission_type are required' },
        { status: 400 }
      )
    }

    const result = calculateSmartScore(inputs)

    // If product_id provided, update in database
    if (product_id) {
      const supabase = await createServerClient()
      const { error } = await supabase
        .from('products')
        .update({ smart_score: result.total })
        .eq('id', product_id)

      if (error) {
        console.error('Failed to update smart_score:', error)
        // Don't fail the request, just log
      }
    }

    return NextResponse.json({ success: true, score: result })
  } catch (error) {
    console.error('Score calculation error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate score' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('product_id')

    if (!productId) {
      return NextResponse.json(
        { error: 'product_id is required' },
        { status: 400 }
      )
    }

    const supabase = await createServerClient()
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single()

    if (error || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    const inputs: ScoreInputs = {
      commission_rate: product.commission_rate,
      commission_type: product.commission_type,
      gravity_score: product.gravity_score,
      trend_score: product.trend_score,
      rating: product.rating,
      review_count: product.review_count,
      price: product.price,
      original_price: product.original_price,
    }

    const result = calculateSmartScore(inputs)

    // Update stored score
    await supabase
      .from('products')
      .update({ smart_score: result.total })
      .eq('id', productId)

    return NextResponse.json({ success: true, score: result })
  } catch (error) {
    console.error('Score fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch score' },
      { status: 500 }
    )
  }
}