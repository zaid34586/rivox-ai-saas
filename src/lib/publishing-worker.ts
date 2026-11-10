import { createServerClient } from '@/lib/supabase-server'

/**
 * Publishing Worker - Handles posting scheduled content to social platforms
 * Called by cron job (e.g., every 5 minutes via Vercel Cron or external scheduler)
 */

export interface PublishResult {
  success: boolean
  platform_post_id?: string
  error_message?: string
}

interface SocialAccount {
  id: string
  platform: string
  account_name: string
  account_id: string
  access_token: string
  refresh_token?: string
  token_expires_at?: string
}

interface ScheduledPost {
  id: string
  creative_id: string
  platform: string
  account_id: string | null
  caption: string
  media_urls: string[]
  scheduled_at: string
  status: string
  creative: {
    id: string
    headline: string
    body: string
    image_url: string | null
    video_url: string | null
    platform: string
    format: string
    product: {
      name: string
      image_url: string | null
    }
  }
  account: SocialAccount | null
}

async function publishToInstagram(account: SocialAccount, post: ScheduledPost): Promise<PublishResult> {
  // Instagram Graph API - requires Business/Creator account
  // POST https://graph.facebook.com/v18.0/{ig-user-id}/media
  // Then POST https://graph.facebook.com/v18.0/{ig-user-id}/media_publish
  
  try {
    // Check token expiry
    if (account.token_expires_at && new Date(account.token_expires_at) <= new Date()) {
      return { success: false, error_message: 'Access token expired' }
    }

    const mediaUrls = post.media_urls.filter(url => url)
    if (mediaUrls.length === 0) {
      return { success: false, error_message: 'No media provided for Instagram' }
    }

    // Step 1: Create media container
    const mediaType = mediaUrls[0].includes('.mp4') || mediaUrls[0].includes('.mov') ? 'VIDEO' : 'IMAGE'
    const isCarousel = mediaUrls.length > 1 && mediaType === 'IMAGE'
    
    let containerId: string
    
    if (isCarousel) {
      // Create carousel children first
      const childrenIds: string[] = []
      for (const url of mediaUrls) {
        const childRes = await fetch(
          `https://graph.facebook.com/v18.0/${account.account_id}/media`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image_url: url,
              is_carousel_item: true,
              access_token: account.access_token,
            }),
          }
        )
        const childData = await childRes.json()
        if (!childRes.ok) throw new Error(childData.error?.message || 'Failed to create carousel child')
        childrenIds.push(childData.id)
      }
      
      // Create carousel container
      const carouselRes = await fetch(
        `https://graph.facebook.com/v18.0/${account.account_id}/media`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            media_type: 'CAROUSEL',
            children: childrenIds,
            caption: post.caption,
            access_token: account.access_token,
          }),
        }
      )
      const carouselData = await carouselRes.json()
      if (!carouselRes.ok) throw new Error(carouselData.error?.message || 'Failed to create carousel')
      containerId = carouselData.id
    } else {
      // Single media
      const mediaRes = await fetch(
        `https://graph.facebook.com/v18.0/${account.account_id}/media`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            media_type: mediaType,
            [mediaType === 'VIDEO' ? 'video_url' : 'image_url']: mediaUrls[0],
            caption: post.caption,
            access_token: account.access_token,
          }),
        }
      )
      const mediaData = await mediaRes.json()
      if (!mediaRes.ok) throw new Error(mediaData.error?.message || 'Failed to create media')
      containerId = mediaData.id
    }

    // Step 2: Publish the container
    const publishRes = await fetch(
      `https://graph.facebook.com/v18.0/${account.account_id}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: account.access_token,
        }),
      }
    )
    const publishData = await publishRes.json()
    if (!publishRes.ok) throw new Error(publishData.error?.message || 'Failed to publish')

    return { success: true, platform_post_id: publishData.id }
  } catch (error) {
    return { success: false, error_message: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function publishToFacebook(account: SocialAccount, post: ScheduledPost): Promise<PublishResult> {
  // Facebook Graph API
  try {
    if (account.token_expires_at && new Date(account.token_expires_at) <= new Date()) {
      return { success: false, error_message: 'Access token expired' }
    }

    const mediaUrls = post.media_urls.filter(url => url)
    
    const body: Record<string, any> = {
      message: post.caption,
      access_token: account.access_token,
    }

    if (mediaUrls.length > 0) {
      if (mediaUrls.length === 1) {
        const isVideo = mediaUrls[0].includes('.mp4') || mediaUrls[0].includes('.mov')
        body[isVideo ? 'video_url' : 'picture'] = mediaUrls[0]
      } else {
        // Multiple photos - use attachments
        const attachments = mediaUrls.map(url => ({ media: { image: { url } } }))
        body.attached_media = JSON.stringify(attachments)
      }
    }

    const res = await fetch(
      `https://graph.facebook.com/v18.0/${account.account_id}/feed`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    )
    const data = await res.json()
    if (!res.ok) throw new Error(data.error?.message || 'Failed to post to Facebook')

    return { success: true, platform_post_id: data.id }
  } catch (error) {
    return { success: false, error_message: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function publishToX(account: SocialAccount, post: ScheduledPost): Promise<PublishResult> {
  // X (Twitter) API v2
  try {
    if (account.token_expires_at && new Date(account.token_expires_at) <= new Date()) {
      return { success: false, error_message: 'Access token expired' }
    }

    const mediaUrls = post.media_urls.filter(url => url)
    let mediaIds: string[] = []

    // Upload media first if any
    for (const url of mediaUrls) {
      const mediaRes = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${account.access_token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ media_url: url }),
      })
      const mediaData = await mediaRes.json()
      if (!mediaRes.ok) throw new Error(mediaData.errors?.[0]?.message || 'Failed to upload media')
      mediaIds.push(mediaData.media_id_string)
    }

    const tweetRes = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: post.caption,
        media: mediaIds.length > 0 ? { media_ids: mediaIds } : undefined,
      }),
    })
    const tweetData = await tweetRes.json()
    if (!tweetRes.ok) throw new Error(tweetData.errors?.[0]?.message || 'Failed to post to X')

    return { success: true, platform_post_id: tweetData.data?.id }
  } catch (error) {
    return { success: false, error_message: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function publishToPinterest(account: SocialAccount, post: ScheduledPost): Promise<PublishResult> {
  // Pinterest API
  try {
    if (account.token_expires_at && new Date(account.token_expires_at) <= new Date()) {
      return { success: false, error_message: 'Access token expired' }
    }

    const mediaUrls = post.media_urls.filter(url => url)
    if (mediaUrls.length === 0) {
      return { success: false, error_message: 'No media provided for Pinterest' }
    }

    const res = await fetch('https://api.pinterest.com/v5/pins', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        board_id: account.account_id, // board ID
        media_source: {
          source_type: 'image_url',
          url: mediaUrls[0],
        },
        title: post.creative.headline || 'Affiliate Post',
        description: post.caption,
        link: post.creative.product.image_url ? '' : '', // Would need affiliate link
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Failed to post to Pinterest')

    return { success: true, platform_post_id: data.id }
  } catch (error) {
    return { success: false, error_message: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function publishToYouTube(account: SocialAccount, post: ScheduledPost): Promise<PublishResult> {
  // YouTube Data API v3 - for Shorts
  try {
    if (account.token_expires_at && new Date(account.token_expires_at) <= new Date()) {
      return { success: false, error_message: 'Access token expired' }
    }

    const mediaUrls = post.media_urls.filter(url => url)
    const videoUrl = mediaUrls.find(url => url.includes('.mp4') || url.includes('.mov'))
    
    if (!videoUrl) {
      return { success: false, error_message: 'No video provided for YouTube Shorts' }
    }

    // YouTube requires resumable upload for videos
    // This is a simplified version - in production use resumable upload
    const res = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.access_token}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': 'video/mp4',
      },
      body: JSON.stringify({
        snippet: {
          title: post.creative.headline || 'Affiliate Short',
          description: post.caption,
          tags: ['shorts', 'affiliate'],
          categoryId: '22', // People & Blogs
        },
        status: {
          privacyStatus: 'public',
          selfDeclaredMadeForKids: false,
        },
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error?.message || 'Failed to upload to YouTube')

    return { success: true, platform_post_id: data.id }
  } catch (error) {
    return { success: false, error_message: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function publishToTikTok(account: SocialAccount, post: ScheduledPost): Promise<PublishResult> {
  // TikTok API for Business/Creator
  try {
    if (account.token_expires_at && new Date(account.token_expires_at) <= new Date()) {
      return { success: false, error_message: 'Access token expired' }
    }

    const mediaUrls = post.media_urls.filter(url => url)
    const videoUrl = mediaUrls.find(url => url.includes('.mp4') || url.includes('.mov'))
    
    if (!videoUrl) {
      return { success: false, error_message: 'No video provided for TikTok' }
    }

    // TikTok video upload (simplified)
    const res = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        post_info: {
          title: post.caption.slice(0, 150),
          privacy_level: 'PUBLIC',
          disable_duet: false,
          disable_stitch: false,
          disable_comment: false,
        },
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: 0, // Would need actual size
          chunk_size: 0,
          total_chunk_count: 1,
        },
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Failed to init TikTok upload')

    // Would need to upload video chunks to data.data.upload_url
    // Simplified for now
    return { success: true, platform_post_id: data.data?.publish_id }
  } catch (error) {
    return { success: false, error_message: error instanceof Error ? error.message : 'Unknown error' }
  }
}

const PUBLISHERS: Record<string, (account: SocialAccount, post: ScheduledPost) => Promise<PublishResult>> = {
  instagram: publishToInstagram,
  facebook: publishToFacebook,
  x: publishToX,
  pinterest: publishToPinterest,
  youtube: publishToYouTube,
  tiktok: publishToTikTok,
}

export async function publishScheduledPost(post: ScheduledPost): Promise<PublishResult> {
  if (!post.account) {
    return { success: false, error_message: 'No social account connected' }
  }

  const publisher = PUBLISHERS[post.platform]
  if (!publisher) {
    return { success: false, error_message: `No publisher for platform: ${post.platform}` }
  }

  return await publisher(post.account, post)
}

export async function processScheduledPosts(): Promise<{ processed: number; succeeded: number; failed: number }> {
  const supabase = await createServerClient()
  
  // Get posts that are due and scheduled
  const now = new Date().toISOString()
  const { data: posts, error } = await supabase
    .from('scheduled_posts')
    .select(`
      *,
      creative:ad_creatives(
        id,
        headline,
        body,
        image_url,
        video_url,
        platform,
        format,
        product:products(name, image_url, affiliate_url)
      ),
      account:social_accounts(*)
    `)
    .eq('status', 'scheduled')
    .lte('scheduled_at', now)
    .order('scheduled_at', { ascending: true })
    .limit(20) // Process in batches

  if (error) {
    console.error('Failed to fetch scheduled posts:', error)
    return { processed: 0, succeeded: 0, failed: 0 }
  }

  if (!posts || posts.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0 }
  }

  let succeeded = 0
  let failed = 0

  for (const post of posts) {
    // Mark as publishing
    await supabase
      .from('scheduled_posts')
      .update({ status: 'publishing', updated_at: new Date().toISOString() })
      .eq('id', post.id)

    const result = await publishScheduledPost(post)

    if (result.success) {
      await supabase
        .from('scheduled_posts')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          platform_post_id: result.platform_post_id,
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', post.id)

      // Update creative
      await supabase
        .from('ad_creatives')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('id', post.creative_id)

      // Increment account's posts_today
      if (post.account) {
        await supabase.rpc('increment_posts_today', { account_id: post.account.id })
      }

      succeeded++
    } else {
      await supabase
        .from('scheduled_posts')
        .update({
          status: 'failed',
          error_message: result.error_message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', post.id)

      // Update creative
      await supabase
        .from('ad_creatives')
        .update({ status: 'failed' })
        .eq('id', post.creative_id)

      failed++
    }
  }

  return { processed: posts.length, succeeded, failed }
}

// Daily reset for posts_today (call via cron at midnight)
export async function resetDailyPostCounts(): Promise<void> {
  const supabase = await createServerClient()
  await supabase.rpc('reset_daily_post_counts')
}