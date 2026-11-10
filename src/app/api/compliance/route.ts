import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { checkCompliance, autoFixCompliance, type ComplianceContent, type ComplianceReport } from '@/lib/compliance'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { content, content_type, content_id, auto_fix } = body

    if (!content_type || !content_id) {
      return NextResponse.json({ 
        error: 'content_type and content_id are required' 
      }, { status: 400 })
    }

    // Build compliance content object
    let complianceContent: ComplianceContent

    if (content_type === 'ad') {
      const { data: ad } = await supabase
        .from('ad_creatives')
        .select('*, products:product_id(name, category, network, image_url)')
        .eq('id', content_id)
        .eq('user_id', user.id)
        .single()
      
      if (!ad) {
        return NextResponse.json({ error: 'Ad not found' }, { status: 404 })
      }

      complianceContent = {
        text: ad.body || ad.headline || '',
        platform: ad.platform,
        format: ad.format,
        productCategory: ad.products?.category,
        network: ad.products?.network,
        hasAffiliateLink: true,
        mediaUrls: ad.image_prompt ? [ad.image_prompt] : [],
      }
    } else if (content_type === 'image') {
      const { data: img } = await supabase
        .from('generated_images')
        .select('*, products:product_id(name, category, network)')
        .eq('id', content_id)
        .eq('user_id', user.id)
        .single()
      
      if (!img) {
        return NextResponse.json({ error: 'Image not found' }, { status: 404 })
      }

      complianceContent = {
        text: img.prompt || '',
        platform: img.platform,
        format: 'image',
        productCategory: img.products?.category,
        network: img.products?.network,
        hasAffiliateLink: true,
        mediaUrls: [img.image_url],
      }
    } else if (content_type === 'video') {
      const { data: vid } = await supabase
        .from('generated_videos')
        .select('*, ad_creatives:variant_id(hook, platform, format, products:product_id(name, category, network))')
        .eq('id', content_id)
        .eq('user_id', user.id)
        .single()
      
      if (!vid) {
        return NextResponse.json({ error: 'Video not found' }, { status: 404 })
      }

      complianceContent = {
        text: vid.ad_creatives?.hook || '',
        platform: vid.ad_creatives?.platform || 'instagram',
        format: vid.ad_creatives?.format || 'reel',
        productCategory: vid.ad_creatives?.products?.category,
        network: vid.ad_creatives?.products?.network,
        hasAffiliateLink: true,
        mediaUrls: [vid.video_url],
      }
    } else {
      return NextResponse.json({ error: 'Invalid content_type' }, { status: 400 })
    }

    // Run compliance check
    const report = checkCompliance(complianceContent)
    
    let fixedContent: ComplianceContent | undefined
    if (auto_fix && !report.overallPassed) {
      fixedContent = autoFixCompliance(complianceContent)
      const fixedReport = checkCompliance(fixedContent)
      report.overallPassed = fixedReport.overallPassed
      report.violations = fixedReport.violations
    }

    return NextResponse.json({ 
      success: true, 
      report,
      fixedContent,
    })
  } catch (error) {
    console.error('Compliance check error:', error)
    return NextResponse.json({ error: 'Failed to check compliance' }, { status: 500 })
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ 
      success: true, 
      logs: [],
      message: 'Compliance logs endpoint - implement database logging in production'
    })
  } catch (error) {
    console.error('Compliance logs fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch compliance logs' }, { status: 500 })
  }
}