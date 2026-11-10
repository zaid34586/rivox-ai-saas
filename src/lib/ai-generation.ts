/**
 * AI Media Generation — Real Provider Integrations
 * Supports: OpenAI (GPT-4o), Replicate (Flux, Runway, Kling), ElevenLabs (Voice)
 */

import OpenAI from 'openai'
import Replicate from 'replicate'
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'

// ============================================================
// Clients (lazy init)
// ============================================================
let openai: OpenAI | null = null
let replicate: Replicate | null = null
let elevenlabs: ElevenLabsClient | null = null

function getOpenAI() {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return openai
}

function getReplicate() {
  if (!replicate && process.env.REPLICATE_API_TOKEN) {
    replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })
  }
  return replicate
}

function getElevenLabs() {
  if (!elevenlabs && process.env.ELEVENLABS_API_KEY) {
    elevenlabs = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY })
  }
  return elevenlabs
}

// ============================================================
// Types
// ============================================================
export interface ProductForAd {
  id: string
  name: string
  description: string | null
  image_url: string | null
  category: string | null
  price: number | null
  original_price: number | null
  commission_rate: number
  commission_type: string
  affiliate_url: string
  network: string
  smart_score: number
  rating?: number | null
  review_count?: number | null
}

export interface AdHook {
  id: string
  name: string
  category: string
  template: string
  example?: string
  best_for?: string[]
}

export interface GeneratedScript {
  hook: string
  problem: string
  solution: string
  socialProof: string
  cta: string
  fullScript: string
}

export interface PlatformContent {
  headline: string
  body: string
  cta: string
  hashtags: string[]
}

export interface MediaResult {
  url: string
  provider: 'openai' | 'replicate' | 'elevenlabs'
  model: string
  prompt: string
  cost_usd?: number
}

// ============================================================
// 1. HOOK/SCRIPT GENERATION (OpenAI GPT-4o)
// ============================================================
export async function generateAdScript(
  product: ProductForAd,
  hook: AdHook,
  platform: string,
  format: string
): Promise<GeneratedScript> {
  const client = getOpenAI()
  if (!client) {
    return generateMockScript(product, hook, platform, format)
  }

  const discount = product.original_price && product.price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0

  const systemPrompt = `You are an expert affiliate marketer writing high-converting UGC scripts for ${platform} ${format}s.
Write in Hinglish (Hindi + English mix) - natural, conversational, relatable.
Keep it under 60 seconds for video, 3 slides for carousel.
Always include #ad disclosure. Return JSON only.`

  const userPrompt = `Product: ${product.name}
Category: ${product.category || 'General'}
Price: ${product.price ? `₹${product.price}` : 'N/A'}${discount > 0 ? ` (${discount}% off)` : ''}
Commission: ${product.commission_type === 'percentage' ? product.commission_rate + '%' : '₹' + product.commission_rate}
Affiliate Network: ${product.network}
Smart Score: ${product.smart_score}/100

Hook Template: ${hook.template}
Hook Category: ${hook.category}
Platform: ${platform}
Format: ${format}

Generate a complete script with these sections:
1. HOOK (first 3 seconds - use the template, fill placeholders naturally)
2. PROBLEM (relatable pain point)
3. SOLUTION (product as answer, mention key benefit)
4. SOCIAL PROOF (reviews, ratings, "thousands of users")
5. CTA (clear action with urgency)

Return JSON: { hook, problem, solution, socialProof, cta, fullScript }`

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' },
      max_tokens: 800,
    })

    const content = completion.choices[0]?.message?.content
    if (content) {
      const parsed = JSON.parse(content)
      return {
        hook: parsed.hook || hook.template,
        problem: parsed.problem || '',
        solution: parsed.solution || '',
        socialProof: parsed.socialProof || '',
        cta: parsed.cta || '',
        fullScript: parsed.fullScript || '',
      }
    }
  } catch (error) {
    console.error('OpenAI script generation failed:', error)
  }

  return generateMockScript(product, hook, platform, format)
}

function generateMockScript(
  product: ProductForAd,
  hook: AdHook,
  platform: string,
  format: string
): GeneratedScript {
  const discount = product.original_price && product.price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0

  const hookText = hook.template
    .replace('{product_category}', product.category || 'product')
    .replace('{product}', product.name)
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
    .replace('{professionals}', 'experts')

  return {
    hook: hookText,
    problem: `Struggling with ${product.category?.toLowerCase() || 'this'}? You're not alone. Most people waste money on products that don't deliver.`,
    solution: `${product.name} solves this with its unique formula designed for real results. ${discount > 0 ? `Plus, ${discount}% off right now!` : ''}`,
    socialProof: `Thousands of happy customers agree - this is the real deal. ${product.rating ? `Rated ${product.rating}/5 stars!` : ''}`,
    cta: 'Tap the link in bio / Swipe up to grab yours before stock runs out! #ad',
    fullScript: '',
  }
}

// ============================================================
// 2. PLATFORM-SPECIFIC CONTENT (OpenAI GPT-4o)
// ============================================================
export async function generatePlatformContent(
  product: ProductForAd,
  hook: AdHook,
  script: GeneratedScript,
  platform: string,
  format: string
): Promise<PlatformContent> {
  const client = getOpenAI()
  if (!client) {
    return generateMockPlatformContent(product, hook, script, platform, format)
  }

  const systemPrompt = `You are a ${platform} content expert. Optimize the script for ${format} format.
Return JSON only: { headline, body, cta, hashtags }`

  const userPrompt = `Adapt this script for ${platform} ${format}:

HOOK: ${script.hook}
PROBLEM: ${script.problem}
SOLUTION: ${script.solution}
SOCIAL PROOF: ${script.socialProof}
CTA: ${script.cta}

Product: ${product.name}
Affiliate URL: ${product.affiliate_url}

Requirements:
- Headline: Catchy, ${format === 'reel' || format === 'short' ? 'under 100 chars' : 'under 150 chars'}
- Body: Platform-native formatting (line breaks, emojis for IG, threads for X)
- CTA: Platform-appropriate ("Link in bio", "Link in description", etc.)
- Hashtags: 8-12 relevant tags including #ad

Return JSON only.`

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
      max_tokens: 500,
    })

    const content = completion.choices[0]?.message?.content
    if (content) {
      return JSON.parse(content)
    }
  } catch (error) {
    console.error('OpenAI platform content failed:', error)
  }

  return generateMockPlatformContent(product, hook, script, platform, format)
}

function generateMockPlatformContent(
  product: ProductForAd,
  hook: AdHook,
  script: GeneratedScript,
  platform: string,
  format: string
): PlatformContent {
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

  return {
    headline: hook.template.slice(0, format === 'reel' || format === 'short' ? 100 : 150),
    body: `${script.problem}\n\n${script.solution}\n\n${script.socialProof}\n\n${script.cta}`,
    cta: platformCTAs[platform] || 'Check it out! #ad',
    hashtags: [...baseHashtags, ...categoryHashtags.slice(0, 8)],
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

// ============================================================
// 3. IMAGE GENERATION (Replicate - Flux)
// ============================================================
export async function generateAdImage(
  product: ProductForAd,
  hook: AdHook,
  platform: string,
  format: string
): Promise<MediaResult | null> {
  const client = getReplicate()
  if (!client) {
    console.log('Replicate not configured, skipping image generation')
    return null
  }

  const styleMap: Record<string, string> = {
    instagram: 'Instagram aesthetic, bright lighting, lifestyle shot, high quality, 4k, 1:1',
    youtube: 'YouTube thumbnail style, bold text overlay space, vibrant colors, 16:9',
    pinterest: 'Pinterest aesthetic, vertical 2:3, clean background, text space, lifestyle',
    x: 'Twitter post style, clean, minimal, professional, 16:9',
    facebook: 'Facebook ad style, lifestyle, relatable, bright, 1:1',
    tiktok: 'TikTok style, vertical 9:16, dynamic, engaging, trending aesthetic',
  }

  const prompt = `Product photo of ${product.name}, ${product.category || 'product'}, ${hook.name} style, ${styleMap[platform] || styleMap.instagram}, professional product photography, studio lighting, clean background, commercial quality`

  try {
    // Use Flux Schnell (fast, cheap) or Flux Dev (higher quality)
    const model = (process.env.REPLICATE_FLUX_MODEL || 'black-forest-labs/flux-schnell') as `${string}/${string}`
    
    const output = await client.run(model, {
      input: {
        prompt,
        aspect_ratio: format === 'story' || format === 'reel' || format === 'short' ? '9:16' : '1:1',
        num_outputs: 1,
        output_format: 'webp',
        output_quality: 90,
      },
    })

    const url = Array.isArray(output) ? output[0] : output
    return {
      url: url as string,
      provider: 'replicate',
      model,
      prompt,
      cost_usd: 0.003, // Flux Schnell ~$0.003/image
    }
  } catch (error) {
    console.error('Replicate image generation failed:', error)
    return null
  }
}

// ============================================================
// 4. VIDEO GENERATION (Replicate - Runway Gen-3 / Kling)
// ============================================================
export async function generateAdVideo(
  product: ProductForAd,
  hook: AdHook,
  script: GeneratedScript,
  platform: string
): Promise<MediaResult | null> {
  const client = getReplicate()
  if (!client) {
    console.log('Replicate not configured, skipping video generation')
    return null
  }

  const videoPrompt = `
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
Text: "${product.name} - The Game Changer"

SCENE 4 (20-25s) - SOCIAL PROOF:
${script.socialProof}
Visual: Reviews, ratings, user clips
Text: "${product.rating || '4.8'}/5 ⭐ ${product.review_count || '10k+'} reviews"

SCENE 5 (25-30s) - CTA:
${script.cta}
Visual: Arrow pointing to link, discount badge if applicable
Text: "Link in bio / Swipe up 👆"
`.trim()

  try {
    // Use Runway Gen-3 Alpha Turbo (fast) or Kling
    const model = (process.env.REPLICATE_VIDEO_MODEL || 'runwayml/gen3-alpha-turbo') as `${string}/${string}`
    
    const output = await client.run(model, {
      input: {
        prompt: videoPrompt,
        duration: 30,
        fps: 30,
        aspect_ratio: platform === 'youtube' ? '16:9' : '9:16',
      },
    })

    // Poll for completion if needed
    const url = typeof output === 'string' ? output : (output as any)?.url
    return {
      url,
      provider: 'replicate',
      model,
      prompt: videoPrompt,
      cost_usd: 0.50, // Gen-3 Alpha Turbo ~$0.50/30s
    }
  } catch (error) {
    console.error('Replicate video generation failed:', error)
    return null
  }
}

// ============================================================
// 5. VOICE GENERATION (ElevenLabs)
// ============================================================
export async function generateVoiceover(
  script: GeneratedScript,
  voiceId: string = '21m00Tcm4TlvDq8ikWAM' // Rachel - default
): Promise<MediaResult | null> {
  const client = getElevenLabs()
  if (!client) {
    console.log('ElevenLabs not configured, skipping voice generation')
    return null
  }

  // Use full script or just hook + solution + CTA for short format
  const text = `${script.hook} ... ${script.solution} ... ${script.cta}`

  try {
    const audio = await client.textToSpeech.convert(voiceId, {
      text,
      modelId: 'eleven_multilingual_v2',
      voiceSettings: {
        stability: 0.5,
        similarityBoost: 0.75,
        style: 0.3,
        useSpeakerBoost: true,
      },
      outputFormat: 'mp3_44100_128',
    })

    // Convert stream to blob and upload to storage
    // For now, return the info - actual upload happens in API route
    return {
      url: '', // Will be filled after upload
      provider: 'elevenlabs',
      model: 'eleven_multilingual_v2',
      prompt: text,
      cost_usd: text.length * 0.000018, // ~$0.018 per 1k chars
    }
  } catch (error) {
    console.error('ElevenLabs voice generation failed:', error)
    return null
  }
}

// ============================================================
// 6. MASTER FUNCTION - Generate Complete Ad Package
// ============================================================
export interface CompleteAdPackage {
  script: GeneratedScript
  platformContent: PlatformContent
  image?: MediaResult
  video?: MediaResult
  voice?: MediaResult
  qualityScore: number
  metadata: {
    image: { provider: string; model: string; cost_usd?: number } | null
    video: { provider: string; model: string; cost_usd?: number } | null
    voice: { provider: string; model: string; cost_usd?: number } | null
  }
}

export async function generateCompleteAdPackage(
  product: ProductForAd,
  hook: AdHook,
  platform: string,
  format: string,
  options: { generateImage?: boolean; generateVideo?: boolean; generateVoice?: boolean } = {}
): Promise<CompleteAdPackage> {
  const { generateImage = true, generateVideo = false, generateVoice = false } = options

  // Parallel generation
  const [script, platformContent] = await Promise.all([
    generateAdScript(product, hook, platform, format),
    // platformContent depends on script, so sequential
  ]).then(async ([script]) => {
    const content = await generatePlatformContent(product, hook, script, platform, format)
    return [script, content] as const
  })

  // Media generation in parallel
  const mediaPromises: Promise<MediaResult | null>[] = []
  
  if (generateImage) {
    mediaPromises.push(generateAdImage(product, hook, platform, format))
  }
  if (generateVideo && (format === 'reel' || format === 'short' || format === 'story')) {
    mediaPromises.push(generateAdVideo(product, hook, script, platform))
  }
  if (generateVoice) {
    mediaPromises.push(generateVoiceover(script))
  }

  const mediaResults = await Promise.all(mediaPromises)

  const imageResult = mediaResults[0] ?? null
  const videoResult = mediaResults[1] ?? null
  const voiceResult = mediaResults[2] ?? null

  return {
    script,
    platformContent,
    image: imageResult ?? undefined,
    video: videoResult ?? undefined,
    voice: voiceResult ?? undefined,
    qualityScore: calculateQualityScore(product, hook, platform, format),
    metadata: {
      image: imageResult ? { provider: imageResult.provider, model: imageResult.model, cost_usd: imageResult.cost_usd } : null,
      video: videoResult ? { provider: videoResult.provider, model: videoResult.model, cost_usd: videoResult.cost_usd } : null,
      voice: voiceResult ? { provider: voiceResult.provider, model: voiceResult.model, cost_usd: voiceResult.cost_usd } : null,
    },
  }
}

function calculateQualityScore(
  product: ProductForAd,
  hook: AdHook,
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