/**
 * Image Generation — Types, Providers & Prompts
 */

export type ImageProvider = 'openai' | 'flux' | 'gpt-image' | 'stability' | 'mock'

export interface ImageGenerationRequest {
  prompt: string
  negativePrompt?: string
  width: number
  height: number
  style?: 'photorealistic' | 'lifestyle' | 'flat-lay' | 'before-after' | 'product-shot' | 'ugc-selfie' | 'demo'
  productImage?: string // base64 or URL for reference
  brandColors?: string[]
  logoUrl?: string
  count?: number
  seed?: number
}

export interface GeneratedImage {
  id: string
  url: string
  prompt: string
  width: number
  height: number
  provider: ImageProvider
  createdAt: string
}

export interface ImageStyleConfig {
  name: string
  promptSuffix: string
  recommendedRatio: '1:1' | '9:16' | '4:5' | '2:3' | '16:9'
  useCases: string[]
}

export const IMAGE_STYLES: Record<string, ImageStyleConfig> = {
  photorealistic: {
    name: 'Photorealistic',
    promptSuffix: 'hyperrealistic, 8k, professional photography, studio lighting, sharp focus, commercial quality',
    recommendedRatio: '1:1',
    useCases: ['product shots', 'hero images', 'catalog'],
  },
  lifestyle: {
    name: 'Lifestyle',
    promptSuffix: 'lifestyle shot, natural lighting, relatable setting, candid feel, authentic, magazine style',
    recommendedRatio: '4:5',
    useCases: ['instagram posts', 'facebook ads', 'blog headers'],
  },
  'flat-lay': {
    name: 'Flat Lay',
    promptSuffix: 'flat lay composition, top-down view, clean background, organized, aesthetic, pinterest style',
    recommendedRatio: '1:1',
    useCases: ['pinterest pins', 'instagram carousel', 'product collections'],
  },
  'before-after': {
    name: 'Before/After',
    promptSuffix: 'split screen before and after comparison, clear division, dramatic transformation, professional lighting',
    recommendedRatio: '16:9',
    useCases: ['skincare', 'fitness', 'hair', 'cleaning products'],
  },
  'product-shot': {
    name: 'Clean Product Shot',
    promptSuffix: 'clean white background, studio lighting, product centered, commercial catalog style, high detail',
    recommendedRatio: '1:1',
    useCases: ['amazon listings', 'shopify', 'catalog', 'google shopping'],
  },
  'ugc-selfie': {
    name: 'UGC Selfie Style',
    promptSuffix: 'selfie style, person holding product, natural smartphone photo, authentic, relatable, influencer vibe',
    recommendedRatio: '9:16',
    useCases: ['reels', 'stories', 'tiktok', 'shorts'],
  },
  demo: {
    name: 'Product Demo',
    promptSuffix: 'product in use, action shot, demonstrating features, hands-on, dynamic angle, engaging',
    recommendedRatio: '9:16',
    useCases: ['reels', 'shorts', 'tiktok', 'demo videos'],
  },
}

export function getStyleConfig(style: string): ImageStyleConfig {
  return IMAGE_STYLES[style] || IMAGE_STYLES.photorealistic
}

export function getAspectRatioDimensions(ratio: string, baseWidth = 1024): { width: number; height: number } {
  const ratios: Record<string, [number, number]> = {
    '1:1': [1, 1],
    '9:16': [9, 16],
    '4:5': [4, 5],
    '2:3': [2, 3],
    '16:9': [16, 9],
  }
  const [w, h] = ratios[ratio] || [1, 1]
  const scale = baseWidth / w
  return { width: Math.round(w * scale), height: Math.round(h * scale) }
}

export function buildImagePrompt(
  productName: string,
  productDescription: string | null,
  style: string,
  hook: string,
  platform: string,
  brandColors?: string[],
  logoRequired = false
): string {
  const config = getStyleConfig(style)
  const { promptSuffix, recommendedRatio } = config
  
  const platformContext = getPlatformContext(platform)
  const colorHint = brandColors && brandColors.length > 0 
    ? `brand colors: ${brandColors.join(', ')}` 
    : ''
  const logoHint = logoRequired ? 'include subtle logo placement' : ''

  return `
Product: ${productName}
Description: ${productDescription || 'No description'}
Style: ${config.name} (${recommendedRatio})
Platform: ${platformContext}
Hook context: ${hook}
${promptSuffix}
${colorHint}
${logoHint}
Professional quality, commercial license safe, no text overlays unless specified
  `.trim()
}

function getPlatformContext(platform: string): string {
  const contexts: Record<string, string> = {
    instagram: 'Instagram feed/reels - aesthetic, engaging, vertical friendly',
    youtube: 'YouTube thumbnail/shorts - bold, clickable, 16:9 or 9:16',
    pinterest: 'Pinterest pin - vertical 2:3, text-space, saveable',
    x: 'X/Twitter post - clean, minimal, 16:9',
    facebook: 'Facebook ad - lifestyle, relatable, 1:1 or 4:5',
    tiktok: 'TikTok - vertical 9:16, dynamic, trending aesthetic',
  }
  return contexts[platform] || contexts.instagram
}

/**
 * Provider implementations
 * In production, replace with actual API calls
 */

export async function generateImagesMock(request: ImageGenerationRequest): Promise<GeneratedImage[]> {
  // Mock implementation - returns placeholder URLs
  const count = request.count || 1
  const images: GeneratedImage[] = []
  
  for (let i = 0; i < count; i++) {
    const seed = request.seed || Date.now() + i
    const placeholderUrl = `https://picsum.photos/seed/${seed}/${request.width}/${request.height}`
    
    images.push({
      id: `img_${Date.now()}_${i}`,
      url: placeholderUrl,
      prompt: request.prompt,
      width: request.width,
      height: request.height,
      provider: 'mock',
      createdAt: new Date().toISOString(),
    })
  }
  
  return images
}

// OpenAI DALL-E 3 / GPT-Image
export async function generateImagesOpenAI(request: ImageGenerationRequest, apiKey: string): Promise<GeneratedImage[]> {
  // Implementation would call OpenAI API
  // For now, fallback to mock
  return generateImagesMock(request)
}

// Flux / Replicate
export async function generateImagesFlux(request: ImageGenerationRequest, apiKey: string): Promise<GeneratedImage[]> {
  // Implementation would call Replicate/Flux API
  return generateImagesMock(request)
}

// Stability AI
export async function generateImagesStability(request: ImageGenerationRequest, apiKey: string): Promise<GeneratedImage[]> {
  // Implementation would call Stability API
  return generateImagesMock(request)
}

export async function generateImages(
  request: ImageGenerationRequest,
  provider: ImageProvider = 'mock',
  apiKey?: string
): Promise<GeneratedImage[]> {
  switch (provider) {
    case 'openai':
      return generateImagesOpenAI(request, apiKey || '')
    case 'flux':
      return generateImagesFlux(request, apiKey || '')
    case 'stability':
      return generateImagesStability(request, apiKey || '')
    case 'gpt-image':
      return generateImagesOpenAI(request, apiKey || '')
    default:
      return generateImagesMock(request)
  }
}