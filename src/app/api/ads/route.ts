import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { generateCompleteAdPackage, ProductForAd, AdHook } from '@/lib/ai-generation'

const PLATFORMS = ['instagram', 'youtube', 'pinterest', 'x', 'facebook', 'tiktok'] as const

function getFormatsForPlatform(platform: string): string[] {
  const formats: Record<string, string[]> = {
    instagram: ['reel', 'post', 'story'],
    youtube: ['short'],
    pinterest: ['pin'],
    x: ['tweet'],
    facebook: ['reel', 'post'],
    tiktok: ['short', 'story'],
  }
  return formats[platform] || ['post']
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
      product_id, 
      hook_ids, 
      platforms = ['instagram', 'youtube'], 
      count = 10,
      use_ai = true, // Toggle for AI vs template
      generateImage = true,
      generateVideo = false,
      generateVoice = false,
    } = body

    if (!product_id) {
      return NextResponse.json(
        { error: 'product_id is required' },
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

    // Fetch hooks from database (with fallback to static)
    let hooks: AdHook[] = []
    if (hook_ids && hook_ids.length > 0) {
      const { data: dbHooks } = await supabase
        .from('ad_hooks')
        .select('*')
        .in('id', hook_ids)
      hooks = (dbHooks || []).map(h => ({
        id: h.id,
        name: h.name,
        category: h.category,
        template: h.template,
        example: h.example,
        best_for: h.best_for,
      }))
    } else {
      // Get random hooks from DB
      const { data: dbHooks } = await supabase
        .from('ad_hooks')
        .select('*')
      hooks = (dbHooks || []).map(h => ({
        id: h.id,
        name: h.name,
        category: h.category,
        template: h.template,
        example: h.example,
        best_for: h.best_for,
      }))
    }

    // Fallback to static hooks if DB empty
    if (hooks.length === 0) {
      const { AD_HOOKS, getRandomHooks } = await import('@/lib/ad-studio')
      hooks = hook_ids && hook_ids.length > 0
        ? AD_HOOKS.filter(h => hook_ids.includes(h.id))
        : getRandomHooks(count)
    }

    // Limit hooks to count
    hooks = hooks.slice(0, count)

    // Convert product for AI
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

    // Generate ad variants
    const variants: any[] = []

    for (const hook of hooks) {
      for (const platform of platforms) {
        if (!PLATFORMS.includes(platform as any)) continue
        const formats = getFormatsForPlatform(platform)
        
        for (const format of formats) {
          let variantData: any = {}

          if (use_ai && (process.env.OPENAI_API_KEY || process.env.REPLICATE_API_TOKEN)) {
            // Real AI generation
            try {
              const result = await generateCompleteAdPackage(
                productForAd,
                hook,
                platform,
                format,
                { generateImage, generateVideo, generateVoice }
              )

              variantData = {
                hook_id: hook.id,
                hook: hook.template,
                script: result.script,
                headline: result.platformContent.headline,
                body: result.platformContent.body,
                cta: result.platformContent.cta,
                hashtags: result.platformContent.hashtags,
                image_prompt: result.image?.prompt || '',
                video_prompt: result.video?.prompt || '',
                image_url: result.image?.url || null,
                video_url: result.video?.url || null,
                voice_url: result.voice?.url || null,
                platform,
                format,
                quality_score: result.qualityScore,
                ai_generated: true,
                ai_metadata: result.metadata,
              }
            } catch (aiError) {
              console.error(`AI generation failed for ${hook.id}/${platform}/${format}:`, aiError)
              // Fallback to template
              variantData = generateTemplateVariant(product, hook, platform, format)
              variantData.ai_generated = false
            }
          } else {
            // Template-based generation (fallback)
            variantData = generateTemplateVariant(product, hook, platform, format)
            variantData.ai_generated = false
          }

          variants.push({
            ...variantData,
            user_id: user.id,
            product_id: product.id,
            status: 'draft',
          })
        }
      }
    }

    // Insert variants
    const { data: inserted, error } = await supabase
      .from('ad_creatives')
      .insert(variants)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      variants: inserted,
      count: inserted.length,
      ai_enabled: use_ai && (process.env.OPENAI_API_KEY || process.env.REPLICATE_API_TOKEN),
    })
  } catch (error) {
    console.error('Ad generation error:', error)
    return NextResponse.json({ error: 'Failed to generate ads' }, { status: 500 })
  }
}

function generateTemplateVariant(product: any, hook: any, platform: string, format: string): any {
  const productName = product.name
  const category = product.category || 'product'
  const price = product.price
  const originalPrice = product.original_price
  const discount = originalPrice && price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0
  const commissionType = product.commission_type === 'percentage' 
    ? `${product.commission_rate}%` 
    : `₹${product.commission_rate}`

  const script = generateScript(product, hook)
  const { headline, body, cta, hashtags } = generatePlatformContent(product, hook, script, platform, format)
  const imagePrompt = generateImagePrompt(product, hook, platform, format)
  const videoPrompt = format === 'reel' || format === 'short' || format === 'story' 
    ? generateVideoPrompt(product, hook, script, platform)
    : ''
  const qualityScore = calculateQualityScore(product, hook, platform, format)

  return {
    hook_id: hook.id,
    hook: hook.template,
    script,
    headline,
    body,
    cta,
    hashtags,
    image_prompt: imagePrompt,
    video_prompt: videoPrompt,
    platform,
    format,
    quality_score: qualityScore,
  }
}

// Copy template functions from original
function generateScript(product: any, hook: any): any {
  const productName = product.name
  const category = product.category || 'product'
  const discount = product.original_price && product.price 
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100) 
    : 0

  return {
    hook: hook.template
      .replace('{product_category}', category)
      .replace('{product}', productName)
      .replace('{timeframe}', '30 din')
      .replace('{benefit}', 'behtar results')
      .replace('{hidden_factor}', 'quality')
      .replace('{feature}', 'hidden feature')
      .replace('{pain_point}', 'ye problem')
      .replace('{amount}', 'hazaron')
      .replace('{wrong_solution}', 'galti')
      .replace('{common_mistake}', 'ye galti')
      .replace('{result}', 'result nahi mila')
      .replace('{number}', 'hazaron')
      .replace('{expert_name}', 'experts')
      .replace('{community_size}', 'hazaron')
      .replace('{percentage}', '85')
      .replace('{days}', '30')
      .replace('{before_state}', 'problem')
      .replace('{after_state}', 'solution')
      .replace('{study_name}', 'Clinical')
      .replace('{claim}', 'better results')
      .replace('{percentage}', '90')
      .replace('{professionals}', 'experts'),
    problem: `Struggling with ${category.toLowerCase()}? You're not alone. Most people waste money on products that don't deliver.`,
    solution: `${productName} solves this with its unique formula designed for real results. ${discount > 0 ? `Plus, ${discount}% off right now!` : ''}`,
    socialProof: `Thousands of happy customers agree - this is the real deal. ${product.rating ? `Rated ${product.rating}/5 stars!` : ''}`,
    cta: 'Tap the link in bio / Swipe up to grab yours before stock runs out! #ad',
    fullScript: '',
  }
}

function generatePlatformContent(
  product: any,
  hook: any,
  script: any,
  platform: string,
  format: string
): { headline: string; body: string; cta: string; hashtags: string[] } {
  const productName = product.name
  const discount = product.original_price && product.price 
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100) 
    : 0

  const baseHashtags = ['#ad', '#affiliate', '#recommended', '#musthave']
  const categoryHashtags = getCategoryHashtags(product.category)

  const platformCTAs: Record<string, string> = {
    instagram: 'Link in bio 👆 #ad',
    youtube: 'Link in description 👇 #ad',
    pinterest: 'Shop the link 👆 #ad',
    x: 'Link in bio 🔗 #ad',
    facebook: 'Learn More 👇 #ad',
    tiktok: 'Link in bio 👆 #ad',
  }

  switch (platform) {
    case 'instagram':
      return {
        headline: hook.template.slice(0, 80) + '...',
        body: `${script.problem}\n\n${script.solution}\n\n${script.socialProof}\n\n${script.cta}`,
        cta: platformCTAs.instagram,
        hashtags: [...baseHashtags, ...categoryHashtags, '#instagram', '#reels', '#explore'],
      }
    case 'youtube':
      return {
        headline: `${hook.name}: ${productName} Review`,
        body: `${script.hook}\n\n${script.problem}\n\n${script.solution}\n\n${script.socialProof}\n\n${script.cta}`,
        cta: platformCTAs.youtube,
        hashtags: [...baseHashtags, ...categoryHashtags, '#shorts', '#youtube', '#review'],
      }
    case 'pinterest':
      return {
        headline: `${productName} - ${discount > 0 ? `${discount}% Off` : 'Must Have'}`,
        body: `${script.solution}\n\n${script.socialProof}`,
        cta: platformCTAs.pinterest,
        hashtags: [...baseHashtags, ...categoryHashtags, '#pinterest', '#pins', '#shopping'],
      }
    case 'x':
      return {
        headline: script.hook.slice(0, 100),
        body: `${script.problem} ${script.solution} ${script.cta}`,
        cta: platformCTAs.x,
        hashtags: [...baseHashtags.slice(0, 2), ...categoryHashtags.slice(0, 2)],
      }
    case 'facebook':
      return {
        headline: hook.template,
        body: `${script.hook}\n\n${script.problem}\n\n${script.solution}\n\n${script.socialProof}\n\n${script.cta}`,
        cta: platformCTAs.facebook,
        hashtags: [...baseHashtags, ...categoryHashtags, '#facebook', '#reels'],
      }
    case 'tiktok':
      return {
        headline: script.hook.slice(0, 100),
        body: `${script.hook}\n\n${script.problem}\n\n${script.solution}\n\n${script.cta}`,
        cta: platformCTAs.tiktok,
        hashtags: [...baseHashtags, ...categoryHashtags, '#tiktok', '#fyp', '#viral'],
      }
    default:
      return {
        headline: hook.template,
        body: script.fullScript || `${script.problem}\n\n${script.solution}\n\n${script.cta}`,
        cta: 'Check it out! #ad',
        hashtags: [...baseHashtags, ...categoryHashtags],
      }
  }
}

function getCategoryHashtags(category: string | null): string[] {
  const map: Record<string, string[]> = {
    'Health & Fitness': ['#fitness', '#health', '#wellness', '#gym', '#workout'],
    'Beauty & Personal Care': ['#beauty', '#skincare', '#makeup', '#selfcare', '#glow'],
    'Electronics & Gadgets': ['#tech', '#gadgets', '#electronics', '#review', '#unboxing'],
    'Home & Kitchen': ['#home', '#kitchen', '#homedecor', '#organization', '#musthave'],
    'Fashion & Accessories': ['#fashion', '#style', '#ootd', '#accessories', '#trendy'],
    'Books & Education': ['#books', '#education', '#learning', '#selfimprovement', '#reading'],
    'Sports & Outdoors': ['#sports', '#outdoors', '#adventure', '#fitness', '#gear'],
    'Automotive': ['#cars', '#auto', '#cardetailing', '#caraccessories', '#drive'],
    'Software & SaaS': ['#saas', '#software', '#tech', '#productivity', '#tools'],
    'Finance & Investing': ['#finance', '#investing', '#money', '#wealth', '#passiveincome'],
  }
  return map[category || ''] || ['#trending', '#viral', '#fyp']
}

function generateImagePrompt(product: any, hook: any, platform: string, format: string): string {
  const productName = product.name
  const category = product.category || 'product'
  
  const styleMap: Record<string, string> = {
    instagram: 'Instagram aesthetic, bright lighting, lifestyle shot, high quality, 4k',
    youtube: 'YouTube thumbnail style, bold text overlay space, vibrant colors, 16:9',
    pinterest: 'Pinterest aesthetic, vertical 2:3, clean background, text space, lifestyle',
    x: 'Twitter post style, clean, minimal, professional, 16:9',
    facebook: 'Facebook ad style, lifestyle, relatable, bright, 1:1',
    tiktok: 'TikTok style, vertical 9:16, dynamic, engaging, trending aesthetic',
  }

  return `Product photo of ${productName}, ${category}, ${hook.name} style, ${styleMap[platform] || styleMap.instagram}, professional product photography, studio lighting, clean background`
}

function generateVideoPrompt(product: any, hook: any, script: any, platform: string): string {
  const productName = product.name
  
  return `
${hook.name} Video Script for ${platform}:

SCENE 1 (0-3s) - HOOK:
${script.hook}
Visual: Product reveal with ${hook.category} energy
Text overlay: "${hook.template.slice(0, 40)}..."

SCENE 2 (3-10s) - PROBLEM:
${script.problem}
Visual: Relatable struggle, before state
Text: "Sound familiar?"

SCENE 3 (10-20s) - SOLUTION:
${script.solution}
Visual: Product in action, close-ups, features
Text: "${productName} - The Game Changer"

SCENE 4 (20-25s) - SOCIAL PROOF:
${script.socialProof}
Visual: Reviews, ratings, user clips
Text: "${product.rating || '4.8'}/5 ⭐ ${product.review_count || '10k+'} reviews"

SCENE 5 (25-30s) - CTA:
${script.cta}
Visual: Arrow pointing to link, discount badge if applicable
Text: "Link in bio / Swipe up 👆"
  `.trim()
}

function calculateQualityScore(
  product: any, 
  hook: any, 
  platform: string, 
  format: string
): number {
  let score = 50
  
  if (product.image_url) score += 10
  if (product.description) score += 10
  if (product.rating && product.rating >= 4) score += 10
  if (product.review_count && product.review_count > 100) score += 5
  if (product.original_price && product.price) score += 5
  
  const categoryMap: Record<string, string[]> = {
    curiosity: ['Electronics & Gadgets', 'Books & Education', 'Software & SaaS'],
    problem: ['Health & Fitness', 'Beauty & Personal Care', 'Home & Kitchen'],
    social_proof: ['Fashion & Accessories', 'Electronics & Gadgets'],
    before_after: ['Beauty & Personal Care', 'Health & Fitness'],
    listicle: ['Home & Kitchen', 'Electronics & Gadgets'],
    story: ['Health & Fitness', 'Finance & Investing'],
    urgency: ['Fashion & Accessories', 'Electronics & Gadgets'],
    authority: ['Health & Fitness', 'Beauty & Personal Care', 'Software & SaaS'],
  }
  
  const relevantCategories = categoryMap[hook.category] || []
  if (relevantCategories.includes(product.category || '')) score += 10
  
  if ((format === 'reel' || format === 'short') && ['instagram', 'youtube', 'tiktok'].includes(platform)) score += 5
  
  return Math.min(100, score)
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
    const status = searchParams.get('status')
    const platform = searchParams.get('platform')

    let query = supabase
      .from('ad_creatives')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (productId) query = query.eq('product_id', productId)
    if (status) query = query.eq('status', status)
    if (platform) query = query.eq('platform', platform)

    const { data: variants, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Also return available hooks
    const { data: hooks } = await supabase
      .from('ad_hooks')
      .select('*')
      .order('category, name')

    return NextResponse.json({ 
      success: true, 
      variants: variants || [], 
      hooks: hooks || [],
      ai_available: !!(process.env.OPENAI_API_KEY || process.env.REPLICATE_API_TOKEN),
    })
  } catch (error) {
    console.error('Ads fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch ads' }, { status: 500 })
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
    const { id, status, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    // Verify ownership
    const { data: existing, error: findError } = await supabase
      .from('ad_creatives')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (findError || !existing) {
      return NextResponse.json({ error: 'Ad not found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('ad_creatives')
      .update({ status, ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, variant: data })
  } catch (error) {
    console.error('Ad update error:', error)
    return NextResponse.json({ error: 'Failed to update ad' }, { status: 500 })
  }
}