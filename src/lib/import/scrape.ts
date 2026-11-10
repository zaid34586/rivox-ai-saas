import type { NetworkId, ImportedProduct } from './types'
import { NETWORK_META } from './detect'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

export interface ScrapeResult {
  name: string | null
  description: string | null
  image_url: string | null
  price: number | null
  original_price: number | null
  rating: number | null
  review_count: number | null
  category: string | null
  /** ASIN for Amazon, vendor id etc. — used to rebuild the affiliate URL */
  external_id: string | null
  /**
   * 'product' = real product data found (JSON-LD / price / rating / product-title)
   * 'meta'    = only generic page metadata (title/og) — usually a bot check or
   *             a non-product page; callers should treat this as a failed import.
   */
  evidence?: 'product' | 'meta'
}

/** Fetch a product page HTML with a browser-like UA. Throws on network/HTTP errors. */
export async function fetchPage(url: string, timeoutMs = 10000): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })
    if (!res.ok) {
      throw new Error(`Site responded with HTTP ${res.status}`)
    }
    return await res.text()
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Site did not respond in time (blocked or slow)')
    }
    throw err
  }
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Pull the first text content for a regex-ish pattern from HTML (strip tags). */
function grabText(html: string, pattern: RegExp): string | null {
  const m = html.match(pattern)
  if (!m) return null
  const text = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  return text || null
}

/**
 * Parse a product page: JSON-LD first (most e-commerce sites emit it),
 * then og-meta, then network-specific fallbacks.
 */
export function parseProductPage(html: string, url: string, network: NetworkId): Partial<ScrapeResult> {
  const result: Partial<ScrapeResult> = {}
  let evidence: 'product' | 'meta' | null = null

  // Bot-check detection (Amazon "Robot Check", general captcha walls)
  if (/robot check|api-services-support|captcha-form|unusual traffic/i.test(html) && !/id="productTitle"/i.test(html)) {
    return { ...result, evidence: 'meta' }
  }

  // --- 1. JSON-LD Product ---
  const ldBlocks = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  for (const block of ldBlocks) {
    let nodes: any[] = []
    try {
      const parsed = JSON.parse(block[1].trim())
      nodes = Array.isArray(parsed) ? parsed : [parsed]
    } catch {
      continue
    }
    const flat = nodes.flatMap(n => (n && Array.isArray(n['@graph']) ? n['@graph'] : [n]))
    const product = flat.find(
      n => n && typeof n === 'object' && (n['@type'] === 'Product' || (Array.isArray(n['@type']) && n['@type'].includes('Product')))
    )
    if (!product) continue
    evidence = 'product'

    result.name = result.name || (typeof product.name === 'string' ? product.name.trim() : null)
    if (typeof product.description === 'string') {
      result.description = product.description.replace(/\s+/g, ' ').trim().slice(0, 2000)
    }
    const image = Array.isArray(product.image) ? product.image[0] : product.image
    if (typeof image === 'string') result.image_url = image

    const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers
    if (offers) {
      result.price = toNumber(offers.price ?? offers.lowPrice)
      const listPrice = toNumber(offers.highPrice)
      if (listPrice && result.price && listPrice > result.price) result.original_price = listPrice
    }

    const agg = product.aggregateRating
    if (agg) {
      result.rating = toNumber(agg.ratingValue)
      result.review_count = toNumber(agg.ratingCount ?? agg.reviewCount)
    }
    if (typeof product.sku === 'string') result.external_id = product.sku
    if (typeof product.brand === 'string') result.category = result.category || product.brand
  }

  // --- 2. og-meta / product-meta fallback ---
  const og = (prop: string): string | null => {
    const m = html.match(
      new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, 'i')
    )
    return m ? m[1].trim() : null
  }
  const metaContent = (prop: string): string | null => {
    const m = html.match(
      new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i')
    )
    return m ? m[1].trim() : null
  }
  result.name = result.name || og('title')
  result.image_url = result.image_url || og('image')
  result.description = result.description || og('description')

  // <title> fallback (may carry the product name when og:title is absent)
  if (!result.name) {
    const titleTag = grabText(html, /<title[^>]*>([\s\S]*?)<\/title>/i)
    if (titleTag) result.name = titleTag.split(/\s+[-|–—]\s+/)[0]
  }

  // Standard e-commerce meta tags count as real product evidence
  const metaPrice = toNumber(metaContent('product:price:amount') ?? metaContent('twitter:data1'))
  if (metaPrice) {
    result.price = result.price ?? metaPrice
    evidence = 'product'
  }
  const metaRating = toNumber(metaContent('product:rating:value'))
  if (metaRating) {
    result.rating = result.rating ?? metaRating
    evidence = 'product'
  }

  // Generic price fallback: microdata itemprop or a price-styled element.
  // Combined with a name (title/og) this counts as product evidence.
  if (!evidence) {
    const priceMatch =
      html.match(/itemprop=["']price["'][^>]*content=["']([\d.]+)/i) ||
      html.match(/class=["'][^"']*price[^"']*["'][^>]*>\s*[₹$€£]\s?([\d,]+(?:\.\d+)?)/i)
    const price = priceMatch ? toNumber(priceMatch[1]) : null
    if (price && result.name) {
      result.price = price
      evidence = 'product'
    }
  }

  // --- 3. Network-specific fallbacks ---
  if (network === 'amazon') {
    const asin = url.match(/\/(?:dp|gp\/product|product)\/([A-Z0-9]{10})/i)?.[1]
    if (asin) result.external_id = asin

    const productTitle = grabText(html, /id="productTitle"[^>]*>([\s\S]*?)<\/span>/)
    if (productTitle) {
      result.name = productTitle
      evidence = 'product'
    }
    if (!result.price) {
      const whole = grabText(html, /class="a-price-whole"[^>]*>([\s\S]*?)<\/span>/)
      const price = toNumber(whole)
      if (price) {
        result.price = price
        evidence = 'product'
      }
    }
    if (result.rating === null) {
      const r = html.match(/(\d(?:\.\d)?)\s*out of 5 stars/i) || html.match(/"ratingValue"\s*:\s*"?(\d(?:\.\d+)?)/i)
      if (r) {
        result.rating = toNumber(r[1])
        evidence = 'product'
      }
    }
    if (result.review_count === null) {
      const rc = html.match(/([\d,]+)\s*ratings/i) || html.match(/"reviewCount"\s*:\s*"?([\d,]+)/i)
      if (rc) result.review_count = toNumber(rc[1])
    }
  }

  if (network === 'flipkart') {
    const fkTitle = grabText(html, /class="[_-]?[A-Za-z0-9]*BNUJ[_-]?[A-Za-z0-9]*"[^>]*>([\s\S]*?)<\/h1>/)
    if (fkTitle) {
      result.name = fkTitle
      evidence = 'product'
    }
    if (!result.price) {
      const price = html.match(/₹\s?([\d,]+)/) || html.match(/"price"\s*:\s*"?([\d,]+)/i)
      if (price) {
        result.price = toNumber(price[1])
        evidence = 'product'
      }
    }
  }

  result.evidence = evidence ?? 'meta'
  return result
}

/** Assemble an ImportedProduct from a scrape result + URL + defaults. */
export function toImportedProduct(
  scraped: Partial<ScrapeResult>,
  url: string,
  network: NetworkId,
  category: string | null
): ImportedProduct {
  const meta = NETWORK_META[network]
  return {
    name: scraped.name || 'Imported product',
    description: scraped.description || null,
    image_url: scraped.image_url || null,
    affiliate_url: url,
    network,
    commission_rate: meta.defaultCommission,
    commission_type: 'percentage',
    category: scraped.category || category,
    price: scraped.price ?? null,
    original_price: scraped.original_price ?? null,
    rating: scraped.rating ?? null,
    review_count: scraped.review_count ?? null,
    gravity_score: null,
    trend_score: null,
    source: 'live',
  }
}
