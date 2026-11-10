import { redirect, notFound } from 'next/navigation'
import { after } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

interface Props {
  params: Promise<{ shortCode: string }>
}

// Short links resolve per-request (unique code, analytics side-effects):
// block prerendering instead of trying to cache this route.

export async function generateMetadata({ params }: Props) {
  return {
    title: 'Redirecting...',
  }
}

/**
 * Public short-link redirect: /go/<shortCode>
 *
 * Uses the service-role client because visitors are anonymous and RLS
 * on affiliate_links is owner-only. redirect() throws NEXT_REDIRECT, so
 * it must be called OUTSIDE try/catch (a catch would swallow it and the
 * route would 404 instead of redirecting).
 */
export default async function RedirectPage({ params }: Props) {
  const { shortCode } = await params

  let link: {
    id: string
    user_id: string
    original_url: string
    tracking_params: Record<string, string> | null
    status: string
    clicks: number
  } | null = null
  let lookupFailed = false

  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('affiliate_links')
      .select('id, user_id, original_url, tracking_params, status, clicks')
      .eq('short_code', shortCode)
      .single()

    if (error || !data) {
      lookupFailed = true
    } else {
      link = data
    }
  } catch {
    lookupFailed = true
  }

  if (lookupFailed || !link) {
    notFound()
  }

  if (link.status !== 'active') {
    redirect('/link/expired')
  }

  // Analytics runs after the redirect response is sent (next/server after()).
  const trackedLink = link
  after(async () => {
    try {
      const admin = createAdminClient()
      // increment_clicks is a SECURITY DEFINER RPC (migration 004)
      await admin.rpc('increment_clicks', { link_id: trackedLink.id })
      // Attribute the click to the link owner so dashboard analytics
      // (RLS: auth.uid() = user_id) can see it.
      await admin.from('click_events').insert({
        link_id: trackedLink.id,
        user_id: trackedLink.user_id,
        referrer: 'Direct',
        device_type: 'unknown',
      })
    } catch {
      // analytics must never break the redirect
    }
  })

  // Build tracking URL from the original affiliate URL
  const trackingUrl = new URL(link.original_url)
  const tp = (link.tracking_params || {}) as Record<string, string>

  if (tp.sub1) trackingUrl.searchParams.set('subid', tp.sub1)
  if (tp.sub2) trackingUrl.searchParams.set('subid2', tp.sub2)
  if (tp.sub3) trackingUrl.searchParams.set('subid3', tp.sub3)
  if (tp.sub4) trackingUrl.searchParams.set('subid4', tp.sub4)

  trackingUrl.searchParams.set('click_id', link.id.slice(0, 8))
  trackingUrl.searchParams.set('t', Date.now().toString())

  redirect(trackingUrl.toString())
}
