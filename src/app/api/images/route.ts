import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { 
  generateImages, 
  buildImagePrompt, 
  getAspectRatioDimensions,
  getStyleConfig,
  IMAGE_STYLES,
  type ImageGenerationRequest 
} from '@/lib/image-gen'

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
      variant_id,
      style = 'lifestyle',
      platform = 'instagram',
      count = 4,
      customPrompt,
      brandColors,
      logoRequired = false,
      provider = 'mock',
    } = body

    if (!product_id) {
      return NextResponse.json({ error: 'product_id is required' }, { status: 400 })
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

    // Fetch variant if provided (for hook context)
    let hook = ''
    if (variant_id) {
      const { data: variant } = await supabase
        .from('ad_creatives')
        .select('hook')
        .eq('id', variant_id)
        .eq('user_id', user.id)
        .single()
      hook = variant?.hook || ''
    }

    // Determine dimensions based on style and platform
    const styleConfig = getStyleConfig(style)
    const ratio = styleConfig.recommendedRatio
    const { width, height } = getAspectRatioDimensions(ratio, 1024)

    // Build prompt
    const prompt = customPrompt || buildImagePrompt(
      product.name,
      product.description,
      style,
      hook,
      platform,
      body.brandColors,
      logoRequired
    )

    // Generate images
    const imageRequest: ImageGenerationRequest = {
      prompt,
      width,
      height,
      style: style as any,
      brandColors: body.brandColors,
      logoUrl: body.logoUrl,
      count,
    }

    const generatedImages = await generateImages(imageRequest, provider as any)

    // Save to database
    const imageRecords = generatedImages.map(img => ({
      user_id: user.id,
      product_id: product.id,
      variant_id: variant_id || null,
      prompt: img.prompt,
      image_url: img.url,
      width: img.width,
      height: img.height,
      style,
      platform,
      provider: img.provider,
      status: 'generated',
    }))

    const { data: savedImages, error } = await supabase
      .from('generated_images')
      .insert(imageRecords)
      .select()

    if (error) {
      console.error('Image save error:', error)
      return NextResponse.json({ error: 'Failed to save images' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      images: savedImages,
      count: savedImages.length,
      dimensions: { width, height, ratio },
    })
  } catch (error) {
    console.error('Image generation error:', error)
    return NextResponse.json({ error: 'Failed to generate images' }, { status: 500 })
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
    const variantId = searchParams.get('variant_id')
    const style = searchParams.get('style')
    const platform = searchParams.get('platform')

    let query = supabase
      .from('generated_images')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (productId) query = query.eq('product_id', productId)
    if (variantId) query = query.eq('variant_id', variantId)
    if (style) query = query.eq('style', style)
    if (platform) query = query.eq('platform', platform)

    const { data: images, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      images: images || [],
      styles: IMAGE_STYLES,
    })
  } catch (error) {
    console.error('Images fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 })
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
    const { id, status, selected } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from('generated_images')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    const updates: any = {}
    if (status) updates.status = status
    if (selected !== undefined) updates.selected = selected

    const { data, error } = await supabase
      .from('generated_images')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, image: data })
  } catch (error) {
    console.error('Image update error:', error)
    return NextResponse.json({ error: 'Failed to update image' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from('generated_images')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('generated_images')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Image delete error:', error)
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 })
  }
}