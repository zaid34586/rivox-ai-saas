import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { 
  generateVideo, 
  buildVideoPrompt, 
  estimateVideoDuration,
  VOICE_OPTIONS,
  MUSIC_TRACKS,
  SUBTITLE_STYLES,
  type VideoGenerationRequest 
} from '@/lib/video-gen'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      variant_id,
      voice_id,
      music_track,
      subtitle_style = 'tiktok',
      aspect_ratio = '9:16',
      provider = 'mock',
    } = body

    if (!variant_id) {
      return NextResponse.json({ error: 'variant_id is required' }, { status: 400 })
    }

    // Fetch variant with product
    const { data: variant, error: variantError } = await supabase
      .from('ad_creatives')
      .select(`
        *,
        products:product_id (id, name, description, image_url, network)
      `)
      .eq('id', variant_id)
      .eq('user_id', user.id)
      .single()

    if (variantError || !variant) {
      return NextResponse.json({ error: 'Ad variant not found' }, { status: 404 })
    }

    // Parse script from variant
    let script: VideoGenerationRequest['script'] = {
      hook: variant.hook || '',
      problem: '',
      solution: '',
      socialProof: '',
      cta: variant.cta || 'Check it out!',
    }

    // Try to extract structured script from variant body/headline
    if (variant.body) {
      const bodyParts = variant.body.split('\n\n')
      if (bodyParts.length >= 3) {
        script.problem = bodyParts[0] || ''
        script.solution = bodyParts[1] || ''
        script.socialProof = bodyParts[2] || ''
      }
    }

    // Get images for this variant
    const { data: imagesData } = await supabase
      .from('generated_images')
      .select('image_url')
      .eq('variant_id', variant_id)
      .eq('status', 'selected')
      .order('created_at', { ascending: true })

    const imageUrls = imagesData?.map(img => img.image_url) || []
    
    // If no selected images, use product image
    if (imageUrls.length === 0 && variant.products?.image_url) {
      imageUrls.push(variant.products.image_url)
    }

    // Default placeholder if no images
    if (imageUrls.length === 0) {
      imageUrls.push('https://picsum.photos/1080/1920')
    }

    // Estimate duration
    const estimatedDuration = estimateVideoDuration({
      hook: script.hook,
      problem: script.problem,
      solution: script.solution,
      socialProof: script.socialProof,
      cta: script.cta,
    })

    // Build video request
    const videoRequest: VideoGenerationRequest = {
      variantId: variant_id,
      script,
      images: imageUrls,
      voiceId: body.voice_id || 'eleven_rachel',
      musicTrack: body.music_track || 'upbeat_1',
      subtitleStyle: body.subtitle_style || 'tiktok',
      aspectRatio: body.aspect_ratio || '9:16',
      duration: estimatedDuration,
    }

    // Generate video
    const generatedVideo = await generateVideo(videoRequest, provider as any)

    // Save to database
    const { data: savedVideo, error } = await supabase
      .from('generated_videos')
      .insert({
        user_id: user.id,
        variant_id: variant_id,
        video_url: generatedVideo.url,
        thumbnail_url: generatedVideo.thumbnailUrl,
        duration: generatedVideo.duration,
        width: generatedVideo.width,
        height: generatedVideo.height,
        voice_id: body.voice_id || 'eleven_rachel',
        music_track: body.music_track || 'upbeat_1',
        subtitle_style: body.subtitle_style || 'tiktok',
        aspect_ratio: body.aspect_ratio || '9:16',
        provider: generatedVideo.provider,
        status: 'generated',
      })
      .select()
      .single()

    if (error) {
      console.error('Video save error:', error)
      return NextResponse.json({ error: 'Failed to save video' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      video: savedVideo,
      prompt: buildVideoPrompt({ ...videoRequest, duration: estimatedDuration } as VideoGenerationRequest),
    })
  } catch (error) {
    console.error('Video generation error:', error)
    return NextResponse.json({ error: 'Failed to generate video' }, { status: 500 })
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
    const variantId = searchParams.get('variant_id')
    const status = searchParams.get('status')

    let query = supabase
      .from('generated_videos')
      .select(`
        *,
        ad_creatives:variant_id (id, hook, headline, platform, format, products:product_id(name))
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (variantId) query = query.eq('variant_id', variantId)
    if (status) query = query.eq('status', status)

    const { data: videos, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      videos: videos || [],
      voices: VOICE_OPTIONS,
      musicTracks: MUSIC_TRACKS,
      subtitleStyles: SUBTITLE_STYLES,
    })
  } catch (error) {
    console.error('Videos fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 })
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
      .from('generated_videos')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    const updates: any = {}
    if (status) updates.status = status
    if (selected !== undefined) updates.selected = selected

    const { data, error } = await supabase
      .from('generated_videos')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, video: data })
  } catch (error) {
    console.error('Video update error:', error)
    return NextResponse.json({ error: 'Failed to update video' }, { status: 500 })
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
      .from('generated_videos')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('generated_videos')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Video delete error:', error)
    return NextResponse.json({ error: 'Failed to delete video' }, { status: 500 })
  }
}