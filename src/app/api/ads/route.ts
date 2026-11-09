import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { AD_HOOKS, getRandomHooks } from '@/lib/ad-studio'

// In production, use OpenAI/Anthropic API
// For now, we'll use template-based generation

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { product_id, hook_ids, platforms = ['instagram', 'youtube'], count = 10 } = body

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

    // Select hooks
    let selectedHooks = AD_HOOKS
    if (hook_ids && hook_ids.length > 0) {
      selectedHooks = AD_HOOKS.filter(h => hook_ids.includes(h.id))
    } else {
      selectedHooks = getRandomHooks(count)
    }

    // Generate ad variants for each hook + platform combination
    const variants: any[] = []

    for (const hook of selectedHooks.slice(0, count)) {
      for (const platform of platforms) {
        const formats = getFormatsForPlatform(platform)
        for (const format of formats) {
          const variant = generateAdVariant(product, hook, platform, format)
          variants.push({
            ...variant,
            user_id: user.id,
            product_id: product.id,
            hook_id: hook.id,
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
      count: inserted.length 
    })
  } catch (error) {
    console.error('Ad generation error:', error)
    return NextResponse.json({ error: 'Failed to generate ads' }, { status: 500 })
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

    return NextResponse.json({ success: true, variants: variants || [], hooks: AD_HOOKS })
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

function generateAdVariant(
  product: any,
  hook: { template: string; name: string; category: string; id: string },
  platform: string,
  format: string
): any {
  const productName = product.name
  const category = product.category || 'product'
  const price = product.price
  const originalPrice = product.original_price
  const discount = originalPrice && price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0
  const commissionType = product.commission_type === 'percentage' 
    ? `${product.commission_rate}%` 
    : `₹${product.commission_rate}`

  // Generate script using hook template
  const script = generateScript(product, hook)
  
  // Generate platform-specific content
  const { headline, body, cta, hashtags } = generatePlatformContent(product, hook, script, platform, format)
  
  // Generate image/video prompts
  const imagePrompt = generateImagePrompt(product, hook, platform, format)
  const videoPrompt = format === 'reel' || format === 'short' || format === 'story' 
    ? generateVideoPrompt(product, hook, script, platform)
    : ''

  // Calculate quality score (simple heuristic)
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

function generateScript(product: any, hook: { template: string; category: string; name: string }): any {
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
    cta: 'Tap the link in bio / Swipe up to grab yours before stock runs out!',
    fullScript: '',
  }
}

function generatePlatformContent(
  product: any,
  hook: { template: string; name: string },
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

  switch (platform) {
    case 'instagram':
      return {
        headline: hook.template.slice(0, 80) + '...',
        body: `${script.problem}\n\n${script.solution}\n\n${script.socialProof}\n\n${script.cta}`,
        cta: 'Link in bio 👆',
        hashtags: [...baseHashtags, ...categoryHashtags, '#instagram', '#reels', '#explore'],
      }
    case 'youtube':
      return {
        headline: `${hook.name}: ${productName} Review`,
        body: `${script.hook}\n\n${script.problem}\n\n${script.solution}\n\n${script.socialProof}\n\n${script.cta}`,
        cta: 'Link in description 👇',
        hashtags: [...baseHashtags, ...categoryHashtags, '#shorts', '#youtube', '#review'],
      }
    case 'pinterest':
      return {
        headline: `${productName} - ${discount > 0 ? `${discount}% Off` : 'Must Have'}`,
        body: `${script.solution}\n\n${script.socialProof}`,
        cta: 'Shop the link 👆',
        hashtags: [...baseHashtags, ...categoryHashtags, '#pinterest', '#pins', '#shopping'],
      }
    case 'x':
      return {
        headline: script.hook.slice(0, 100),
        body: `${script.problem} ${script.solution} ${script.cta}`,
        cta: 'Link in bio 🔗',
        hashtags: [...baseHashtags.slice(0, 2), ...categoryHashtags.slice(0, 2)],
      }
    case 'facebook':
      return {
        headline: hook.template,
        body: `${script.hook}\n\n${script.problem}\n\n${script.solution}\n\n${script.socialProof}\n\n${script.cta}`,
        cta: 'Learn More 👇',
        hashtags: [...baseHashtags, ...categoryHashtags, '#facebook', '#reels'],
      }
    case 'tiktok':
      return {
        headline: script.hook.slice(0, 100),
        body: `${script.hook}\n\n${script.problem}\n\n${script.solution}\n\n${script.cta}`,
        cta: 'Link in bio 👆',
        hashtags: [...baseHashtags, ...categoryHashtags, '#tiktok', '#fyp', '#viral'],
      }
    default:
      return {
        headline: hook.template,
        body: script.fullScript || `${script.problem}\n\n${script.solution}\n\n${script.cta}`,
        cta: 'Check it out!',
        hashtags: [...baseHashtags, ...categoryHashtags],
      }
  }
}

function getCategoryHashtags(category: string | null): string[] {
  const map: Record<string, string[]> = {
    'Health & Fitness': ['#fitness', '#health', '#wellness', '#gym', '#workout'],
    'Beauty & Personal Care': ['#beauty', '#skincare', '#makeup', '#selfcare', '#glow'],
    'Electronics & Gadgets': ['#tech', '#gadgets', '#electronics', '#review', '#unboxing'],
    'Home & Kitchen': ['#home', '#kitchen', '#hom decor', '#organization', '#musthave'],
    'Fashion & Accessories': ['#fashion', '#style', '#ootd', '#accessories', '#trendy'],
    'Books & Education': ['#books', '#education', '#learning', '#selfimprovement', '#reading'],
    'Sports & Outdoors': ['#sports', '#outdoors', '#adventure', '#fitness', '#gear'],
    'Automotive': ['#cars', '#auto', '#cardetailing', '#caraccessories', '#drive'],
    'Software & SaaS': ['#saas', '#software', '#tech', '#productivity', '#tools'],
    'Finance & Investing': ['#finance', '#investing', '#money', '#wealth', '#passiveincome'],
  }
  return map[category || ''] || ['#trending', '#viral', '#fyp']
}

function generateImagePrompt(product: any, hook: { name: string; category: string }, platform: string, format: string): string {
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

function generateVideoPrompt(product: any, hook: { template: string; name: string; category: string }, script: any, platform: string): string {
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
  hook: { category: string }, 
  platform: string, 
  format: string
): number {
  let score = 50 // base
  
  // Product completeness
  if (product.image_url) score += 10
  if (product.description) score += 10
  if (product.rating && product.rating >= 4) score += 10
  if (product.review_count && product.review_count > 100) score += 5
  if (product.original_price && product.price) score += 5
  
  // Hook relevance
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
  
  // Platform/format fit
  if ((format === 'reel' || format === 'short') && ['instagram', 'youtube', 'tiktok'].includes(platform)) score += 5
  
  return Math.min(100, score)
}