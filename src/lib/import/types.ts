// Multi-network product import (Phase 3)
// Adapters try live fetches first; a curated catalog keeps the flow
// working when network APIs need partner keys (Amazon PA-API, etc).

export type NetworkId = 'amazon' | 'flipkart' | 'clickbank' | 'meesho' | 'cuelinks' | 'custom'

export interface ImportedProduct {
  name: string
  description: string | null
  image_url: string | null
  affiliate_url: string
  network: NetworkId
  commission_rate: number
  commission_type: 'percentage' | 'fixed'
  category: string | null
  price: number | null
  original_price: number | null
  rating: number | null
  review_count: number | null
  gravity_score: number | null
  trend_score: number | null
  /** 'live' = fetched from the network just now, 'demo' = curated catalog */
  source: 'live' | 'demo'
}

export interface ImportAdapter {
  id: NetworkId
  label: string
  /** Keyword search. Uses official APIs when configured, else curated catalog. */
  search(query: string): Promise<ImportedProduct[]>
  /** Import a single product page URL. Throws ImportError when the page can't be read. */
  importByUrl(url: string): Promise<ImportedProduct>
}

export class ImportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImportError'
  }
}
