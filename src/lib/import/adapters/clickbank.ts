import type { ImportAdapter, ImportedProduct } from '../types'
import { ImportError } from '../types'
import { fetchPage, parseProductPage, toImportedProduct } from '../scrape'
import { searchCatalog } from '../demo-catalog'

/**
 * ClickBank adapter.
 *
 * ClickBank offers are usually shared as hop links
 * (https://hop.clickbank.net/?affiliate=...&vendor=...) which redirect to a
 * sales page. We resolve the hop link, parse the sales page, and fall back to
 * a vendor-slug-based catalog entry when the page can't be read.
 */
export const clickbankAdapter: ImportAdapter = {
  id: 'clickbank',
  label: 'ClickBank',

  async search(query: string): Promise<ImportedProduct[]> {
    // Official marketplace search needs CLICKBANK_API_KEY; curated until then.
    return searchCatalog('clickbank', query)
  },

  async importByUrl(url: string): Promise<ImportedProduct> {
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      throw new ImportError('Invalid URL')
    }
    const isHop = /(^|\.)clickbank\.(net|com)$/.test(parsed.hostname)
    if (!isHop && !/clickbank/i.test(url)) {
      throw new ImportError('Not a ClickBank URL or hop link')
    }

    // Try the live sales page first (follows the hop redirect)
    try {
      const html = await fetchPage(parsed.toString())
      const scraped = parseProductPage(html, parsed.toString(), 'clickbank')
      if (scraped.name && scraped.price) {
        return toImportedProduct(scraped, parsed.toString(), 'clickbank', 'Other')
      }
    } catch {
      // fall through to catalog-by-vendor
    }

    // Fallback: match the vendor slug against the curated catalog
    const vendor = parsed.searchParams.get('vendor')
    if (vendor) {
      const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
      const catalog = await searchCatalog('clickbank', '', 10)
      const matched = catalog.find(e => norm(e.name).includes(norm(vendor)) || norm(vendor).includes(norm(e.name)))
      if (matched) {
        return { ...matched, affiliate_url: parsed.toString(), source: 'demo' }
      }
      // Unknown vendor: import with ClickBank defaults so the user can edit
      return {
        name: vendor.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        description: `ClickBank offer (vendor: ${vendor}). Fill in details after import.`,
        image_url: null,
        affiliate_url: parsed.toString(),
        network: 'clickbank',
        commission_rate: 50,
        commission_type: 'percentage',
        category: 'Other',
        price: null,
        original_price: null,
        rating: null,
        review_count: null,
        gravity_score: null,
        trend_score: null,
        source: 'demo',
      }
    }

    throw new ImportError('Could not resolve this ClickBank link (no vendor parameter found).')
  },
}
