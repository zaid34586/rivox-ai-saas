import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ shortCode: string }>
}

export const instant = false

export async function generateMetadata({ params }: Props) {
  const { shortCode } = await params
  return {
    title: 'Redirecting...',
  }
}

export default async function RedirectPage({ params }: Props) {
  const { shortCode } = await params

  try {
    const supabase = await createServerClient()

    const { data: link, error } = await supabase
      .from('affiliate_links')
      .select('*')
      .eq('short_code', shortCode)
      .single()

    if (error || !link) {
      notFound()
    }

    if (link.status !== 'active') {
      return (
        <html>
          <head>
            <meta httpEquiv="refresh" content="0;url=/link/expired" />
          </head>
          <body>This link has expired or is paused. Redirecting...</body>
        </html>
      )
    }

    // Increment click count
    supabase
      .from('affiliate_links')
      .update({ clicks: link.clicks + 1 })
      .eq('id', link.id)
      .then(() => {})

    // Build tracking URL
    const trackingUrl = new URL(link.original_url)
    const params = link.tracking_params as Record<string, string>
    
    if (params.sub1) trackingUrl.searchParams.set('subid', params.sub1)
    if (params.sub2) trackingUrl.searchParams.set('subid2', params.sub2)
    if (params.sub3) trackingUrl.searchParams.set('subid3', params.sub3)
    if (params.sub4) trackingUrl.searchParams.set('subid4', params.sub4)
    
    trackingUrl.searchParams.set('click_id', link.id.slice(0, 8))
    trackingUrl.searchParams.set('t', Date.now().toString())

    redirect(trackingUrl.toString())
  } catch {
    notFound()
  }
}