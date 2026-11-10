import type { ImportAdapter, ImportedProduct, NetworkId } from '../types'
import { ImportError } from '../types'
import { fetchPage, parseProductPage, toImportedProduct } from '../scrape'
import { NETWORK_META } from '../detect'
import { searchCatalog } from '../demo-catalog'
import { amazonAdapter } from './amazon'
import { flipkartAdapter } from './flipkart'
import { clickbankAdapter } from './clickbank'

/**
 * Generic adapter for any other store URL (and 'custom' network).
 * Search is URL-based only for this adapter.
 */
const customAdapter: ImportAdapter = {
  id: 'custom',
  label: 'Custom / Other',

  async search(): Promise<ImportedProduct[]> {
    throw new ImportError('Keyword search is not available for custom networks - paste a product URL instead.')
  },

  async importByUrl(url: string): Promise<ImportedProduct> {
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      throw new ImportError('Invalid URL')
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new ImportError('Only http(s) URLs are supported')
    }

    let html: string
    try {
      html = await fetchPage(parsed.toString())
    } catch (err) {
      throw new ImportError(
        `Page could not be fetched (${err instanceof Error ? err.message : 'unknown error'}). Try again or add manually.`
      )
    }

    const scraped = parseProductPage(html, parsed.toString(), 'custom')
    if (scraped.evidence !== 'product' || !scraped.name) {
      throw new ImportError(
        'No product data (JSON-LD/price/product title) found on that page - it may be a bot check or a non-product page. Add the product manually.'
      )
    }

    const product = toImportedProduct(scraped, parsed.toString(), 'custom', scraped.category ?? null)
    // Heuristic: meesho/cuelinks hosts map to their own network ids
    const host = parsed.hostname.toLowerCase()
    if (host.includes('meesho')) product.network = 'meesho'
    else if (host.includes('cuelinks')) product.network = 'cuelinks'
    return product
  },
}

/** Adapter registry used by /api/products/import. */
const ADAPTERS: Record<NetworkId, ImportAdapter> = {
  amazon: amazonAdapter,
  flipkart: flipkartAdapter,
  clickbank: clickbankAdapter,
  meesho: meeshoAdapter(),
  cuelinks: cuelinksAdapter(),
  custom: customAdapter,
}

function meeshoAdapter(): ImportAdapter {
  return {
    id: 'meesho',
    label: NETWORK_META.meesho.label,
    search: (query: string) => Promise.resolve(searchCatalog('meesho', query)),
    importByUrl: customAdapter.importByUrl,
  }
}

function cuelinksAdapter(): ImportAdapter {
  return {
    id: 'cuelinks',
    label: NETWORK_META.cuelinks.label,
    search: (query: string) => Promise.resolve(searchCatalog('cuelinks', query)),
    importByUrl: customAdapter.importByUrl,
  }
}

export function getAdapter(network: string): ImportAdapter {
  const adapter = ADAPTERS[network as NetworkId]
  if (!adapter) {
    throw new ImportError(`Unknown network "${network}". Supported: ${Object.keys(ADAPTERS).join(', ')}`)
  }
  return adapter
}

export function supportedNetworks(): { id: NetworkId; label: string }[] {
  return (Object.keys(ADAPTERS) as NetworkId[]).map(id => ({ id, label: ADAPTERS[id].label }))
}
