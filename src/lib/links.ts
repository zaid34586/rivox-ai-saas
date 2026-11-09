import { generateShortCode } from '@/lib/utils'

export interface LinkTrackingParams {
  sub1?: string  // creative_id
  sub2?: string  // channel
  sub3?: string  // campaign_id
  sub4?: string  // custom
}

/**
 * Build affiliate URL with tracking parameters
 */
export function buildTrackingUrl(
  baseUrl: string,
  params: LinkTrackingParams
): string {
  const url = new URL(baseUrl)
  
  // Add standard tracking params
  if (params.sub1) url.searchParams.set('subid', params.sub1)
  if (params.sub2) url.searchParams.set('subid2', params.sub2)
  if (params.sub3) url.searchParams.set('subid3', params.sub3)
  if (params.sub4) url.searchParams.set('subid4', params.sub4)
  
  // Add timestamp for cache busting
  url.searchParams.set('t', Date.now().toString())
  
  return url.toString()
}

/**
 * Generate unique short code
 */
export function generateUniqueShortCode(existingCodes: string[] = []): string {
  let code: string
  let attempts = 0
  const maxAttempts = 10
  
  do {
    code = generateShortCode(8)
    attempts++
  } while (existingCodes.includes(code) && attempts < maxAttempts)
  
  return code!
}

/**
 * Parse tracking params from request
 */
export function parseTrackingParams(searchParams: URLSearchParams): LinkTrackingParams {
  return {
    sub1: searchParams.get('sub1') || undefined,
    sub2: searchParams.get('sub2') || undefined,
    sub3: searchParams.get('sub3') || undefined,
    sub4: searchParams.get('sub4') || undefined,
  }
}

/**
 * Default tracking params for a creative
 */
export function getDefaultTrackingParams(creativeId: string, channel: string): LinkTrackingParams {
  return {
    sub1: creativeId,
    sub2: channel,
  }
}