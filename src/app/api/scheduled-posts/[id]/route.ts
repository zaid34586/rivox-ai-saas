import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { caption, media_urls, scheduled_at, status } = body

    // Verify ownership
    const { data: existing, error: findError } = await supabase
      .from('scheduled_posts')
      .select('id, creative_id, status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (findError || !existing) {
      return NextResponse.json({ error: 'Scheduled post not found' }, { status: 404 })
    }

    // Can't modify published/failed posts
    if (['published', 'failed'].includes(existing.status)) {
      return NextResponse.json({ error: 'Cannot modify published or failed posts' }, { status: 400 })
    }

    const updates: Record<string, any> = { updated_at: new Date().toISOString() }
    if (caption) updates.caption = caption
    if (media_urls) updates.media_urls = media_urls
    if (scheduled_at) {
      const scheduledAt = new Date(scheduled_at)
      if (isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
        return NextResponse.json({ error: 'scheduled_at must be a future date' }, { status: 400 })
      }
      updates.scheduled_at = scheduledAt.toISOString()
    }
    if (status && ['scheduled', 'publishing', 'published', 'failed'].includes(status)) {
      updates.status = status
      if (status === 'published') updates.published_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('scheduled_posts')
      .update(updates)
      .eq('id', id)
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
          product:products(name, image_url)
        ),
        account:social_accounts(platform, account_name)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Sync creative status
    if (status === 'published') {
      await supabase
        .from('ad_creatives')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('id', existing.creative_id)
    } else if (status === 'scheduled') {
      await supabase
        .from('ad_creatives')
        .update({ status: 'scheduled', scheduled_at: updates.scheduled_at })
        .eq('id', existing.creative_id)
    }

    return NextResponse.json({ success: true, post: data })
  } catch (error) {
    console.error('Scheduled post update error:', error)
    return NextResponse.json({ error: 'Failed to update scheduled post' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify ownership
    const { data: existing, error: findError } = await supabase
      .from('scheduled_posts')
      .select('id, creative_id, status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (findError || !existing) {
      return NextResponse.json({ error: 'Scheduled post not found' }, { status: 404 })
    }

    // Can't delete published posts
    if (existing.status === 'published') {
      return NextResponse.json({ error: 'Cannot delete published posts' }, { status: 400 })
    }

    const { error } = await supabase
      .from('scheduled_posts')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Reset creative status to draft
    await supabase
      .from('ad_creatives')
      .update({ status: 'draft', scheduled_at: null })
      .eq('id', existing.creative_id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Scheduled post delete error:', error)
    return NextResponse.json({ error: 'Failed to delete scheduled post' }, { status: 500 })
  }
}