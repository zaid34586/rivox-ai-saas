/**
 * Click Event Types & Analytics Calculations
 */

export interface ClickEvent {
  id: string
  link_id: string
  user_id: string
  ip_hash: string
  user_agent: string
  referrer: string
  country: string
  device_type: string
  browser: string
  os: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
  utm_content: string
  utm_term: string
  created_at: string
}

export interface ClickSummary {
  totalClicks: number
  uniqueClicks: number
  clicksByDate: { date: string; count: number }[]
  clicksByDevice: { device: string; count: number }[]
  clicksByBrowser: { browser: string; count: number }[]
  clicksByCountry: { country: string; count: number }[]
  clicksByReferrer: { referrer: string; count: number }[]
  clicksByUtmSource: { source: string; count: number }[]
  ctr: number // Click-through rate (needs impressions)
  epc: number // Earnings per click
}

/**
 * Hash IP for privacy (GDPR-friendly)
 */
export function hashIp(ip: string): string {
  // Simple hash - in production use crypto.subtle.digest
  let hash = 0
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}

/**
 * Parse user agent for device/browser/OS
 */
export function parseUserAgent(ua: string): { device_type: string; browser: string; os: string } {
  const device_type = /mobile|android|iphone|ipad/i.test(ua) ? 'mobile' : 'desktop'
  
  let browser = 'Unknown'
  if (ua.includes('Edg/')) browser = 'Edge'
  else if (ua.includes('Chrome/') && !ua.includes('Edg/')) browser = 'Chrome'
  else if (ua.includes('Firefox/')) browser = 'Firefox'
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari'
  else if (ua.includes('Opera/') || ua.includes('OPR/')) browser = 'Opera'
  
  let os = 'Unknown'
  if (ua.includes('Windows NT 10.0')) os = 'Windows 10'
  else if (ua.includes('Windows NT 11.0') || ua.includes('Windows NT 11')) os = 'Windows 11'
  else if (ua.includes('Mac OS X')) os = 'macOS'
  else if (ua.includes('iPhone OS')) os = 'iOS'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('Linux')) os = 'Linux'
  
  return { device_type, browser, os }
}

/**
 * Extract country from IP (placeholder - use GeoIP service in production)
 */
export function getCountryFromIp(ip: string): string {
  // In production, use a GeoIP service like MaxMind or ipapi
  // For now, return 'Unknown'
  return 'Unknown'
}

/**
 * Extract UTM params from URL
 */
export function extractUtmParams(url: string): {
  utm_source: string
  utm_medium: string
  utm_campaign: string
  utm_content: string
  utm_term: string
} {
  const urlObj = new URL(url)
  return {
    utm_source: urlObj.searchParams.get('utm_source') || '',
    utm_medium: urlObj.searchParams.get('utm_medium') || '',
    utm_campaign: urlObj.searchParams.get('utm_campaign') || '',
    utm_content: urlObj.searchParams.get('utm_content') || '',
    utm_term: urlObj.searchParams.get('utm_term') || '',
  }
}

/**
 * Calculate analytics summary from click events
 */
export function calculateClickSummary(
  clicks: ClickEvent[],
  commissions: { amount: number; link_id: string }[] = []
): ClickSummary {
  const totalClicks = clicks.length
  const uniqueIps = new Set(clicks.map(c => c.ip_hash))
  const uniqueClicks = uniqueIps.size

  // Clicks by date (last 30 days)
  const dateMap = new Map<string, number>()
  clicks.forEach(c => {
    const date = c.created_at.split('T')[0]
    dateMap.set(date, (dateMap.get(date) || 0) + 1)
  })
  const clicksByDate = Array.from(dateMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30)

  // Clicks by device
  const deviceMap = new Map<string, number>()
  clicks.forEach(c => {
    deviceMap.set(c.device_type, (deviceMap.get(c.device_type) || 0) + 1)
  })
  const clicksByDevice = Array.from(deviceMap.entries())
    .map(([device, count]) => ({ device, count }))
    .sort((a, b) => b.count - a.count)

  // Clicks by browser
  const browserMap = new Map<string, number>()
  clicks.forEach(c => {
    browserMap.set(c.browser, (browserMap.get(c.browser) || 0) + 1)
  })
  const clicksByBrowser = Array.from(browserMap.entries())
    .map(([browser, count]) => ({ browser, count }))
    .sort((a, b) => b.count - a.count)

  // Clicks by country
  const countryMap = new Map<string, number>()
  clicks.forEach(c => {
    countryMap.set(c.country, (countryMap.get(c.country) || 0) + 1)
  })
  const clicksByCountry = Array.from(countryMap.entries())
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)

  // Clicks by referrer
  const referrerMap = new Map<string, number>()
  clicks.forEach(c => {
    const ref = c.referrer || 'Direct'
    referrerMap.set(ref, (referrerMap.get(ref) || 0) + 1)
  })
  const clicksByReferrer = Array.from(referrerMap.entries())
    .map(([referrer, count]) => ({ referrer, count }))
    .sort((a, b) => b.count - a.count)

  // Clicks by UTM source
  const utmSourceMap = new Map<string, number>()
  clicks.forEach(c => {
    if (c.utm_source) {
      utmSourceMap.set(c.utm_source, (utmSourceMap.get(c.utm_source) || 0) + 1)
    }
  })
  const clicksByUtmSource = Array.from(utmSourceMap.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)

  // EPC (Earnings Per Click)
  const totalCommission = commissions.reduce((sum, c) => sum + c.amount, 0)
  const epc = totalClicks > 0 ? totalCommission / totalClicks : 0

  return {
    totalClicks,
    uniqueClicks,
    clicksByDate,
    clicksByDevice,
    clicksByBrowser,
    clicksByCountry,
    clicksByReferrer,
    clicksByUtmSource,
    ctr: 0, // Needs impressions
    epc,
  }
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}