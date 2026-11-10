'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Search, ExternalLink, CheckCircle, AlertCircle, Package, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImportCandidate {
  name: string
  description: string | null
  image_url: string | null
  affiliate_url: string
  network: string
  commission_rate: number
  commission_type: string
  category: string | null
  price: number | null
  original_price: number | null
  rating: number | null
  review_count: number | null
  source: 'live' | 'demo'
  smart_score: number
}

const NETWORKS = [
  { value: 'amazon', label: 'Amazon' },
  { value: 'flipkart', label: 'Flipkart' },
  { value: 'clickbank', label: 'ClickBank' },
  { value: 'meesho', label: 'Meesho' },
  { value: 'cuelinks', label: 'Cuelinks' },
]

const NETWORK_BADGES: Record<string, string> = {
  amazon: 'bg-orange-100 text-orange-700',
  flipkart: 'bg-blue-100 text-blue-700',
  clickbank: 'bg-purple-100 text-purple-700',
  meesho: 'bg-pink-100 text-pink-700',
  cuelinks: 'bg-indigo-100 text-indigo-700',
  custom: 'bg-gray-100 text-gray-700',
}

async function callImport(payload: Record<string, unknown>): Promise<any> {
  const res = await fetch('/api/products/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || `Request failed (${res.status})`)
  }
  return data
}

export default function ImportPage() {
  const [network, setNetwork] = useState('amazon')
  const [query, setQuery] = useState('')
  const [url, setUrl] = useState('')
  const [mode, setMode] = useState<'search' | 'url'>('search')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<ImportCandidate[]>([])
  const [imported, setImported] = useState<Record<string, string>>({})

  const run = async (payload: Record<string, unknown>) => {
    setLoading(true)
    setError(null)
    try {
      const data = await callImport(payload)
      if (data.product) {
        setResults([data.product])
      } else {
        setResults(data.products || [])
        if ((data.products || []).length === 0) {
          setError('No products found for that search. Try different keywords or paste a product URL.')
        }
      }
      setImported({})
    } catch (err) {
      setResults([])
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    run({ action: 'search', network, query })
  }

  const handleUrl = (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    run({ action: 'url', url: url.trim() })
  }

  const handleImport = async (product: ImportCandidate) => {
    const key = product.affiliate_url
    setLoading(true)
    setError(null)
    try {
      await callImport({ action: 'save', product })
      setImported(prev => ({ ...prev, [key]: 'done' }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  const scoreColor = (s: number) =>
    s >= 70 ? 'bg-emerald-100 text-emerald-700' : s >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Import Products</h1>
        <p className="text-muted-foreground">
          Find products from Amazon, Flipkart, ClickBank, Meesho and Cuelinks - scored and ready to promote
        </p>
      </div>

      {/* Import box */}
      <Card>
        <CardContent className="p-6 space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <Button
              variant={mode === 'search' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('search')}
            >
              <Search className="mr-2 h-4 w-4" />
              Keyword Search
            </Button>
            <Button
              variant={mode === 'url' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('url')}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Product URL
            </Button>
          </div>

          {mode === 'search' ? (
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {NETWORKS.map(n => (
                  <button
                    key={n.value}
                    type="button"
                    onClick={() => setNetwork(n.value)}
                    className={cn(
                      'whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                      network === n.value
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-muted-foreground hover:bg-accent'
                    )}
                  >
                    {n.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-1 gap-2">
                <Input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="e.g. protein powder, headphones, weight loss..."
                  className="flex-1"
                />
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  <span className="ml-2 hidden sm:inline">Search</span>
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleUrl} className="flex gap-2">
              <Input
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://www.amazon.in/dp/B0XXXXXXXX or any store product link"
                className="flex-1"
              />
              <Button type="submit" disabled={loading || !url.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                <span className="ml-2 hidden sm:inline">Fetch</span>
              </Button>
            </form>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {results.map((p, i) => {
            const key = p.affiliate_url
            const isImported = imported[key] === 'done'
            return (
              <Card key={`${key}-${i}`} className="overflow-hidden">
                <div className="relative h-40 bg-muted">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Package className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                  <span
                    className={cn(
                      'absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium',
                      NETWORK_BADGES[p.network] || NETWORK_BADGES.custom
                    )}
                  >
                    {p.network}
                  </span>
                  <span
                    className={cn(
                      'absolute right-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium',
                      p.source === 'live' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {p.source === 'live' ? 'Live' : 'Catalog'}
                  </span>
                </div>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium leading-snug line-clamp-2">{p.name}</h3>
                    <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-bold', scoreColor(p.smart_score))}>
                      {p.smart_score}
                    </span>
                  </div>

                  {p.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <div>
                      {p.price != null && (
                        <span className="font-semibold">₹{p.price.toLocaleString('en-IN')}</span>
                      )}
                      {p.original_price != null && p.price != null && p.original_price > p.price && (
                        <span className="ml-2 text-muted-foreground line-through">₹{p.original_price.toLocaleString('en-IN')}</span>
                      )}
                    </div>
                    <span className="text-primary font-medium">
                      {p.commission_rate}% {p.commission_type === 'percentage' ? 'comm.' : 'fixed'}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={loading || isImported}
                      onClick={() => handleImport(p)}
                    >
                      {isImported ? (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Imported
                        </>
                      ) : (
                        <>
                          <Zap className="mr-2 h-4 w-4" />
                          Import
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(p.affiliate_url, '_blank', 'noopener')}
                    >
                      Preview
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Empty state */}
      {results.length === 0 && !error && !loading && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Search className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h3 className="mb-1 font-semibold">Find products to promote</h3>
          <p className="text-sm text-muted-foreground">
            Search by keyword or paste any product URL - each result comes with a smart score (0-100) and commission estimate.
          </p>
        </div>
      )}
    </div>
  )
}
