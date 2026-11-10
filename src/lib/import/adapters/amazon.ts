import type { ImportAdapter, ImportedProduct } from '../types'
import { ImportError } from '../types'
import { fetchPage, parseProductPage, toImportedProduct } from '../scrape'
import { searchCatalog } from '../demo-catalog'

/**
 * Amazon adapter.
 *
 * Search: curated catalog today. Official PA-API 5.0 integration point is
 * `searchOfficial()` — drop in AMAZON_PA_API_KEY / AMAZON_PA_API_SECRET /
 * AMAZON_PA_PARTNER_TAG env vars and implement the signed request there.
 *
 * URL import: live page fetch with JSON-LD/`#productTitle` parsing.
 */
export const amazonAdapter: ImportAdapter = {
  id: 'amazon',
  label: 'Amazon Associates',

  async search(query: string): Promise<ImportedProduct[]> {
    const official = await searchOfficial(query)
    if (official) return official
    return searchCatalog('amazon', query)
  },

  async importByUrl(url: string): Promise<ImportedProduct> {
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      throw new ImportError('Invalid URL')
    }
    if (!/(^|\.)amazon\./.test(parsed.hostname)) {
      throw new ImportError('Not an Amazon product URL')
    }
    const asin = parsed.pathname.match(/\/(?:dp|gp\/product|product)\/([A-Z0-9]{10})/i)?.[1]
    if (!asin) {
      throw new ImportError('Could not find an ASIN in the URL (expected /dp/B0XXXXXXXX path)')
    }

    // Attach associate tag when configured
    const tag = process.env.AMAZON_PARTNER_TAG
    if (tag && !parsed.searchParams.get('tag')) {
      parsed.searchParams.set('tag', tag)
    }
    const affiliateUrl = parsed.toString()

    let html: string
    try {
      html = await fetchPage(affiliateUrl)
    } catch (err) {
      throw new ImportError(
        `Amazon page could not be fetched (${err instanceof Error ? err.message : 'unknown error'}). ` +
          'Amazon often blocks datacenter IPs - try again or add the product manually.'
      )
    }

    const scraped = parseProductPage(html, affiliateUrl, 'amazon')
    if (scraped.evidence !== 'product' || !scraped.name) {
      throw new ImportError(
        'Amazon returned a bot-check or unparseable page. Try again later or add the product manually.'
      )
    }

    return toImportedProduct(scraped, affiliateUrl, 'amazon', 'Other')
  },
}

/** Official PA-API search - returns null until API credentials are wired up. */
async function searchOfficial(_query: string): Promise<ImportedProduct[] | null> {
  const key = process.env.AMAZON_PA_API_KEY
  const secret = process.env.AMAZON_PA_API_SECRET
  if (!key || !secret) return null
  // TODO(phase-3): implement PA-API 5.0 SearchItems (AWS SigV4-style signing)
  // using key/secret + process.env.AMAZON_PARTNER_TAG. Until then fall back.
  return null
}
