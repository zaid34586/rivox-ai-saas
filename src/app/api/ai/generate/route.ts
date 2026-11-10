import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { generateCompleteAdPackage, ProductForAd, AdHook } from '@/lib/ai-generation'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      product_id, 
      hook_id, 
      platform, 
      format,
      generateImage = true,
      generateVideo = false,
      generateVoice = false,
    } = body

    if (!product_id || !hook_id || !platform || !format) {
      return NextResponse.json(
        { error: 'product_id, hook_id, platform, and format are required' },
        { status: 400 }
      )
    }

    // Fetch product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', product_id)
      .eq('user_id', user.id)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Fetch hook
    const { data: hook, error: hookError } = await supabase
      .from('ad_hooks')
      .select('*')
      .eq('id', hook_id)
      .single()

    if (hookError || !hook) {
      return NextResponse.json({ error: 'Hook not found' }, { status: 404 })
    }

    // Convert to AI generation types
    const productForAd: ProductForAd = {
      id: product.id,
      name: product.name,
      description: product.description,
      image_url: product.image_url,
      category: product.category,
      price: product.price,
      original_price: product.original_price,
      commission_rate: product.commission_rate,
      commission_type: product.commission_type,
      affiliate_url: product.affiliate_url,
      network: product.network,
      smart_score: product.smart_score,
    }

    const adHook: AdHook = {
      id: hook.id,
      name: hook.name,
      category: hook.category,
      template: hook.template,
      example: hook.example || '',
      best_for: hook.best_for,
    }

    // Generate complete ad package
    const result = await generateCompleteAdPackage(productForAd, adHook, platform, format, {
      generateImage,
      generateVideo,
      generateVoice,
    })

    // Upload media to Supabase Storage if generated
    let imageUrl = result.image?.url
    let videoUrl = result.video?.url
    let voiceUrl = result.voice?.url

    // For now, we'll store the external URLs directly
    // In production, you'd download and re-upload to your Supabase bucket

    return NextResponse.json({
      success: true,
      package: {
        script: result.script,
        platform_content: result.platformContent,
        image_url: imageUrl,
        video_url: videoUrl,
        voice_url: voiceUrl,
        quality_score: result.qualityScore,
        metadata: {
          image: result.image ? { provider: result.image.provider, model: result.image.model, cost_usd: result.image.cost_usd } : null,
          video: result.video ? { provider: result.video.provider, model: result.video.model, cost_usd: result.video.cost_usd } : null,
          voice: result.voice ? { provider: result.voice.provider, model: result.voice.model, cost_usd: result.voice.cost_usd } : null,
        },
      },
    })
  } catch (error) {
    console.error('AI generation error:', error)
    return NextResponse.json({ error: 'Failed to generate ad package' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'AI Generation API - Use POST to generate ad packages',
    required_env: ['OPENAI_API_KEY', 'REPLICATE_API_TOKEN', 'ELEVENLABS_API_KEY'],
  })
}