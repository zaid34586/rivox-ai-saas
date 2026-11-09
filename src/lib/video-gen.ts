/**
 * Video Generation v1 — Image + TTS + Subtitles → 9:16 MP4
 */

export type VideoProvider = 'mock' | 'remotion' | 'ffmpeg' | 'replicate' | 'runway'

export interface VideoGenerationRequest {
  variantId: string
  script: {
    hook: string
    problem: string
    solution: string
    socialProof: string
    cta: string
  }
  images: string[] // URLs
  voiceId?: string
  voiceSettings?: {
    stability: number
    similarityBoost: number
    style: number
    speed: number
  }
  musicTrack?: string
  subtitleStyle?: 'tiktok' | 'reels' | 'youtube' | 'clean'
  aspectRatio?: '9:16' | '16:9' | '1:1'
  duration?: number // target seconds
}

export interface GeneratedVideo {
  id: string
  url: string
  thumbnailUrl: string
  duration: number
  width: number
  height: number
  provider: VideoProvider
  createdAt: string
}

export interface VoiceOption {
  id: string
  name: string
  gender: 'male' | 'female' | 'neutral'
  accent: string
  previewUrl: string
  provider: 'elevenlabs' | 'openai' | 'azure' | 'google'
}

export const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: 'eleven_rachel',
    name: 'Rachel (Female, US)',
    gender: 'female',
    accent: 'American',
    previewUrl: '',
    provider: 'elevenlabs',
  },
  {
    id: 'eleven_adam',
    name: 'Adam (Male, US)',
    gender: 'male',
    accent: 'American',
    previewUrl: '',
    provider: 'elevenlabs',
  },
  {
    id: 'eleven_antoni',
    name: 'Antoni (Male, US)',
    gender: 'male',
    accent: 'American',
    previewUrl: '',
    provider: 'elevenlabs',
  },
  {
    id: 'eleven_bella',
    name: 'Bella (Female, US)',
    gender: 'female',
    accent: 'American',
    previewUrl: '',
    provider: 'elevenlabs',
  },
  {
    id: 'eleven_josh',
    name: 'Josh (Male, US)',
    gender: 'male',
    accent: 'American',
    previewUrl: '',
    provider: 'elevenlabs',
  },
  {
    id: 'openai_alloy',
    name: 'Alloy (Neutral, US)',
    gender: 'neutral',
    accent: 'American',
    previewUrl: '',
    provider: 'openai',
  },
  {
    id: 'openai_echo',
    name: 'Echo (Male, US)',
    gender: 'male',
    accent: 'American',
    previewUrl: '',
    provider: 'openai',
  },
  {
    id: 'openai_fable',
    name: 'Fable (Female, UK)',
    gender: 'female',
    accent: 'British',
    previewUrl: '',
    provider: 'openai',
  },
  {
    id: 'openai_onyx',
    name: 'Onyx (Male, US)',
    gender: 'male',
    accent: 'American',
    previewUrl: '',
    provider: 'openai',
  },
  {
    id: 'openai_nova',
    name: 'Nova (Female, US)',
    gender: 'female',
    accent: 'American',
    previewUrl: '',
    provider: 'openai',
  },
  {
    id: 'openai_shimmer',
    name: 'Shimmer (Female, US)',
    gender: 'female',
    accent: 'American',
    previewUrl: '',
    provider: 'openai',
  },
]

export const MUSIC_TRACKS = [
  { id: 'upbeat_1', name: 'Upbeat Pop', mood: 'energetic', url: '' },
  { id: 'chill_1', name: 'Chill Lo-fi', mood: 'relaxed', url: '' },
  { id: 'corporate_1', name: 'Corporate Upbeat', mood: 'professional', url: '' },
  { id: 'emotional_1', name: 'Emotional Piano', mood: 'emotional', url: '' },
  { id: 'tech_1', name: 'Tech Ambient', mood: 'modern', url: '' },
  { id: 'fitness_1', name: 'Fitness Motivation', mood: 'high-energy', url: '' },
  { id: 'none', name: 'No Music', mood: 'silent', url: '' },
]

export const SUBTITLE_STYLES = {
  tiktok: {
    name: 'TikTok Style',
    fontSize: 48,
    fontFamily: 'Arial Black',
    color: '#FFFFFF',
    strokeColor: '#000000',
    strokeWidth: 3,
    position: 'bottom',
    animation: 'bounce',
  },
  reels: {
    name: 'Reels Style',
    fontSize: 44,
    fontFamily: 'Montserrat Bold',
    color: '#FFFFFF',
    strokeColor: '#000000',
    strokeWidth: 2,
    position: 'bottom',
    animation: 'fade',
  },
  youtube: {
    name: 'YouTube Shorts',
    fontSize: 40,
    fontFamily: 'Roboto Bold',
    color: '#FFFF00',
    strokeColor: '#000000',
    strokeWidth: 2,
    position: 'center-bottom',
    animation: 'slide',
  },
  clean: {
    name: 'Clean Minimal',
    fontSize: 36,
    fontFamily: 'Inter Medium',
    color: '#FFFFFF',
    strokeColor: 'transparent',
    strokeWidth: 0,
    position: 'bottom',
    animation: 'none',
  },
}

export type SubtitleStyleKey = keyof typeof SUBTITLE_STYLES

export function getVoiceOptions(provider?: string): VoiceOption[] {
  if (provider) {
    return VOICE_OPTIONS.filter(v => v.provider === provider)
  }
  return VOICE_OPTIONS
}

export function buildVideoPrompt(request: VideoGenerationRequest): string {
  const { script, images, voiceId, musicTrack, subtitleStyle, aspectRatio, duration } = request
  
  const voice = VOICE_OPTIONS.find(v => v.id === voiceId) || VOICE_OPTIONS[0]
  const music = MUSIC_TRACKS.find(m => m.id === musicTrack) || MUSIC_TRACKS[0]
  const subs = SUBTITLE_STYLES[subtitleStyle as SubtitleStyleKey] || SUBTITLE_STYLES.clean
  
  return `
VIDEO GENERATION SPEC:

ASPECT RATIO: ${aspectRatio || '9:16'}
TARGET DURATION: ${duration || 30}s
IMAGES: ${images.length} provided

SCRIPT SECTIONS:
1. HOOK (0-3s): "${script.hook}"
2. PROBLEM (3-10s): "${script.problem}"
3. SOLUTION (10-20s): "${script.solution}"
4. SOCIAL PROOF (20-25s): "${script.socialProof}"
5. CTA (25-30s): "${script.cta}"

VOICE: ${voice.name} (${voice.provider})
MUSIC: ${music.name} (${music.mood})
SUBTITLES: ${subs.name}
  - Font: ${subs.fontFamily}, ${subs.fontSize}px
  - Color: ${subs.color}, Stroke: ${subs.strokeColor} ${subs.strokeWidth}px
  - Position: ${subs.position}
  - Animation: ${subs.animation}

OUTPUT: MP4, ${aspectRatio || '9:16'}, H.264, 30fps
  `.trim()
}

/**
 * Provider implementations
 */

export async function generateVideoMock(request: VideoGenerationRequest): Promise<GeneratedVideo> {
  // Mock implementation - returns placeholder
  const seed = Date.now()
  const placeholderUrl = `https://assets.mixkit.co/videos/preview/mixkit-waves-in-ocean-sunset-1190-large.mp4`
  
  return {
    id: `vid_${seed}`,
    url: placeholderUrl,
    thumbnailUrl: `https://picsum.photos/seed/${seed}/400/711`,
    duration: request.duration || 30,
    width: 1080,
    height: 1920,
    provider: 'mock',
    createdAt: new Date().toISOString(),
  }
}

// Remotion (React-based video generation)
export async function generateVideoRemotion(request: VideoGenerationRequest): Promise<GeneratedVideo> {
  // Would use Remotion to render video programmatically
  return generateVideoMock(request)
}

// Replicate (Runway, Stable Video Diffusion, etc.)
export async function generateVideoReplicate(request: VideoGenerationRequest): Promise<GeneratedVideo> {
  // Would call Replicate API
  return generateVideoMock(request)
}

// FFmpeg (server-side composition)
export async function generateVideoFFmpeg(request: VideoGenerationRequest): Promise<GeneratedVideo> {
  // Would use fluent-ffmpeg to compose images + audio + subtitles
  return generateVideoMock(request)
}

export async function generateVideo(
  request: VideoGenerationRequest,
  provider: VideoProvider = 'mock'
): Promise<GeneratedVideo> {
  switch (provider) {
    case 'remotion':
      return generateVideoRemotion(request)
    case 'replicate':
      return generateVideoReplicate(request)
    case 'ffmpeg':
      return generateVideoFFmpeg(request)
    default:
      return generateVideoMock(request)
  }
}

export function estimateVideoDuration(script: VideoGenerationRequest['script']): number {
  // Rough estimate: ~150 words per minute speaking rate
  const fullText = Object.values(script).join(' ')
  const wordCount = fullText.split(/\s+/).length
  const speakingTime = (wordCount / 150) * 60 // seconds
  return Math.max(15, Math.min(60, Math.ceil(speakingTime + 5))) // 15-60s with buffer
}