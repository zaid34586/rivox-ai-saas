import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { evaluateApprovalRules, getDefaultApprovalRules, type ApprovalItem, type ApprovalRule } from '@/lib/approval'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    const status = searchParams.get('status') || 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const queue = await buildApprovalQueue(supabase, user.id, type, status)
    
    const start = (page - 1) * limit
    const end = start + limit
    const paginated = queue.slice(start, end)

    return NextResponse.json({ 
      success: true, 
      items: paginated,
      total: queue.length,
      page,
      limit,
      hasMore: end < queue.length,
    })
  } catch (error) {
    console.error('Approval queue fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch approval queue' }, { status: 500 })
  }
}

async function buildApprovalQueue(supabase: any, userId: string, type: string, status: string): Promise<ApprovalItem[]> {
  const items: ApprovalItem[] = []

  async function processAds(): Promise<void> {
    let query = supabase
      .from('ad_creatives')
      .select('id, hook, headline, platform, format, quality_score, status, created_at, products:product_id(name, image_url, network)')
      .eq('user_id', userId)
      .in('status', ['pending_approval', 'draft'])

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: ads } = await query
    if (ads) {
      for (const ad of ads) {
        const item: ApprovalItem = {
          id: `ad_${ad.id}`,
          type: 'ad',
          user_id: userId,
          title: ad.hook.slice(0, 60) + '...',
          preview_url: ad.products?.image_url || '',
          status: ad.status === 'draft' ? 'pending' : ad.status,
          quality_score: ad.quality_score || 0,
          created_at: ad.created_at,
          reviewed_at: null,
          reviewed_by: null,
          rejection_reason: null,
          revision_count: 0,
          metadata: {
            platform: ad.platform,
            format: ad.format,
            product_name: ad.products?.name,
            product_network: ad.products?.network,
            headline: ad.headline,
          },
        }
        
        const rules = getDefaultApprovalRules(userId)
        const ruleResult = evaluateApprovalRules(item, rules)
        if (ruleResult) {
          item.status = ruleResult.action === 'auto_approve' ? 'auto_approved' : 
                       ruleResult.action === 'auto_reject' ? 'rejected' : item.status
        }
        
        items.push(item)
      }
    }
  }

  async function processImages(): Promise<void> {
    let query = supabase
      .from('generated_images')
      .select('id, prompt, image_url, style, platform, quality_score, status, created_at, products:product_id(name, network)')
      .eq('user_id', userId)
      .in('status', ['generated', 'selected'])

    if (status !== 'all') {
      query = query.eq('status', status === 'pending' ? 'generated' : status)
    }

    const { data: images } = await query
    if (images) {
      for (const img of images) {
        const item: ApprovalItem = {
          id: `img_${img.id}`,
          type: 'image',
          user_id: userId,
          title: img.prompt.slice(0, 60) + '...',
          preview_url: img.image_url,
          status: img.status === 'generated' ? 'pending' : img.status,
          quality_score: img.quality_score || 0,
          created_at: img.created_at,
          reviewed_at: null,
          reviewed_by: null,
          rejection_reason: null,
          revision_count: 0,
          metadata: {
            style: img.style,
            platform: img.platform,
            product_name: img.products?.name,
            product_network: img.products?.network,
          },
        }
        
        const rules = getDefaultApprovalRules(userId)
        const ruleResult = evaluateApprovalRules(item, rules)
        if (ruleResult) {
          item.status = ruleResult.action === 'auto_approve' ? 'auto_approved' : 
                       ruleResult.action === 'auto_reject' ? 'rejected' : item.status
        }
        
        items.push(item)
      }
    }
  }

  async function processVideos(): Promise<void> {
    let query = supabase
      .from('generated_videos')
      .select('id, duration, thumbnail_url, video_url, aspect_ratio, provider, status, created_at, ad_creatives:variant_id(hook, products:product_id(name, image_url, network))')
      .eq('user_id', userId)
      .in('status', ['generated', 'selected'])

    if (status !== 'all') {
      query = query.eq('status', status === 'pending' ? 'generated' : status)
    }

    const { data: videos } = await query
    if (videos) {
      for (const vid of videos) {
        const item: ApprovalItem = {
          id: `vid_${vid.id}`,
          type: 'video',
          user_id: userId,
          title: vid.ad_creatives?.hook?.slice(0, 60) + '...' || 'Video',
          preview_url: vid.thumbnail_url || '',
          status: vid.status === 'generated' ? 'pending' : vid.status,
          quality_score: 70,
          created_at: vid.created_at,
          reviewed_at: null,
          reviewed_by: null,
          rejection_reason: null,
          revision_count: 0,
          metadata: {
            platform: vid.ad_creatives?.platform,
            format: vid.ad_creatives?.format,
            duration: vid.duration,
            aspect_ratio: vid.aspect_ratio,
            product_name: vid.ad_creatives?.products?.name,
            product_network: vid.ad_creatives?.products?.network,
          },
        }
        
        const rules = getDefaultApprovalRules(userId)
        const ruleResult = evaluateApprovalRules(item, rules)
        if (ruleResult) {
          item.status = ruleResult.action === 'auto_approve' ? 'auto_approved' : 
                       ruleResult.action === 'auto_reject' ? 'rejected' : item.status
        }
        
        items.push(item)
      }
    }
  }

  if (type === 'all' || type === 'ad') {
    await processAds()
  }
  if (type === 'all' || type === 'image') {
    await processImages()
  }
  if (type === 'all' || type === 'video') {
    await processVideos()
  }

  return items.sort((a, b) => {
    if (a.status === 'auto_approved' && b.status !== 'auto_approved') return -1
    if (b.status === 'auto_approved' && a.status !== 'auto_approved') return 1
    return b.quality_score - a.quality_score || new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, item_ids, comment, assignee_id } = body

    if (!action || !item_ids || !item_ids.length) {
      return NextResponse.json({ error: 'action and item_ids are required' }, { status: 400 })
    }

    const results = []

    for (const itemId of item_ids) {
      const [prefix, id] = itemId.split('_')
      
      let table: string
      let statusField: string
      let newStatus: string
      
      switch (prefix) {
        case 'ad':
          table = 'ad_creatives'
          statusField = 'status'
          newStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'needs_revision'
          break
        case 'img':
          table = 'generated_images'
          statusField = 'status'
          newStatus = action === 'approve' ? 'selected' : action === 'reject' ? 'rejected' : 'generated'
          break
        case 'vid':
          table = 'generated_videos'
          statusField = 'status'
          newStatus = action === 'approve' ? 'selected' : action === 'reject' ? 'rejected' : 'generated'
          break
        default:
          continue
      }

      const { error } = await supabase
        .from(table)
        .update({ 
          [statusField]: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        results.push({ itemId, success: false, error: error.message })
        continue
      }

      console.log(`Approval action: ${action} on ${prefix} ${id} by ${user.id}`)
      results.push({ itemId, success: true, newStatus })
    }

    return NextResponse.json({ 
      success: true, 
      results,
      processed: results.filter(r => r.success).length,
    })
  } catch (error) {
    console.error('Bulk approval error:', error)
    return NextResponse.json({ error: 'Failed to process bulk action' }, { status: 500 })
  }
}