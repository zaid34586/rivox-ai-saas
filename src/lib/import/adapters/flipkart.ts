import type { ImportAdapter, ImportedProduct } from '../types'
import { ImportError } from '../types'
import { fetchPage, parseProductPage, toImportedProduct } from '../scrape'
import { searchCatalog } from '../demo-catalog'

/** Flipkart adapter: curated search, live URL import via page parsing. */
export const flipkartAdapter: ImportAdapter = {
  id: 'flipkart',
  label: 'Flipkart Affiliate',

  async search(query: string): Promise<ImportedProduct[]> {
    return searchCatalog('flipkart', query)
  },

  async importByUrl(url: string): Promise<ImportedProduct> {
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      throw new ImportError('Invalid URL')
    }
    if (!/flipkart\.com$/.test(parsed.hostname)) {
      throw new ImportError('Not a Flipkart product URL')
    }

    let html: string
    try {
      html = await fetchPage(parsed.toString())
    } catch (err) {
      throw new ImportError(
        `Flipkart page could not be fetched (${err instanceof Error ? err.message : 'unknown error'}). Try again or add manually.`
      )
    }

    const scraped = parseProductPage(html, parsed.toString(), 'flipkart')
    if (scraped.evidence !== 'product' || !scraped.name) {
      throw new ImportError('Flipkart returned a page we could not parse. Add the product manually.')
    }

    return toImportedProduct(scraped, parsed.toString(), 'flipkart', 'Other')
  },
}
