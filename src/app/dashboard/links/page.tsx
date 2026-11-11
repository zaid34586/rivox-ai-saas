'use client'

import { PageSkeleton } from '@/components/ui/skeleton'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Copy, ExternalLink, Trash2, Plus, Search, CheckCircle } from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Link {
  id: string
  user_id: string
  product_id: string
  short_code: string
  original_url: string
  tracking_params: Record<string, string>
  clicks: number
  conversions: number
  commission_earned: number
  status: 'active' | 'paused' | 'expired'
  created_at: string
  product?: {
    name: string
    network: string
  }
}

interface Product {
  id: string
  name: string
  network: string
}

export default function LinksPage() {
  const [links, setLinks] = useState<Link[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [customCode, setCustomCode] = useState('')
  const [sub1, setSub1] = useState('')
  const [sub2, setSub2] = useState('')
  const [sub3, setSub3] = useState('')
  const [sub4, setSub4] = useState('')
  const [creating, setCreating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'expired'>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    let supabase: ReturnType<typeof createClient> | null = null
    try {
      supabase = createClient()
    } catch {
      setLoading(false)
      return
    }

    const [linksRes, productsRes] = await Promise.all([
      supabase
        .from('affiliate_links')
        .select(`
          *,
          products:product_id (name, network)
        `)
        .order('created_at', { ascending: false }),
      supabase
        .from('products')
        .select('id, name, network')
        .eq('status', 'active')
        .order('name'),
    ])

    if (linksRes.data) setLinks(linksRes.data)
    if (productsRes.data) setProducts(productsRes.data)
    setLoading(false)
  }

  const filteredLinks = links.filter(link => {
    const matchesSearch = link.product?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.short_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.original_url.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || link.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct) return

    setCreating(true)
    let supabase: ReturnType<typeof createClient> | null = null
    try {
      supabase = createClient()
    } catch {
      setCreating(false)
      return
    }

    const trackingParams: Record<string, string> = {}
    if (sub1) trackingParams.sub1 = sub1
    if (sub2) trackingParams.sub2 = sub2
    if (sub3) trackingParams.sub3 = sub3
    if (sub4) trackingParams.sub4 = sub4

    const body: Record<string, any> = {
      product_id: selectedProduct,
      tracking_params: trackingParams,
    }
    if (customCode) body.short_code = customCode

    const res = await fetch('/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    setCreating(false)

    if (!res.ok) {
      alert(data.error || 'Failed to create link')
      return
    }

    alert('Link created successfully!')
    setShowModal(false)
    setSelectedProduct('')
    setCustomCode('')
    setSub1('')
    setSub2('')
    setSub3('')
    setSub4('')
    fetchData()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this link?')) return

    let supabase: ReturnType<typeof createClient> | null = null
    try {
      supabase = createClient()
    } catch {
      return
    }

    const { error } = await supabase.from('affiliate_links').delete().eq('id', id)
    if (error) {
      alert('Error: ' + error.message)
      return
    }
    fetchData()
  }

  const handleToggleStatus = async (link: Link) => {
    let supabase: ReturnType<typeof createClient> | null = null
    try {
      supabase = createClient()
    } catch {
      return
    }

    const newStatus = link.status === 'active' ? 'paused' : 'active'
    const { error } = await supabase
      .from('affiliate_links')
      .update({ status: newStatus })
      .eq('id', link.id)

    if (error) {
      alert('Error: ' + error.message)
      return
    }
    fetchData()
  }

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-success-soft text-success-foreground',
      paused: 'bg-warning-soft text-warning-foreground',
      expired: 'bg-muted text-muted-foreground',
    }
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.active}`}>{status}</span>
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const shortUrl = (code: string) => `${baseUrl}/go/${code}`

  if (loading) {
    return (
      <PageSkeleton />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tracking Links</h1>
          <p className="text-muted-foreground">Manage your affiliate tracking links</p>
        </div>
        <Button onClick={() => { setSelectedProduct(''); setShowModal(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Create Link
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by product, code, or URL..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create Tracking Link</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateLink} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="product">Product *</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.network})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="custom_code">Custom Short Code (optional)</Label>
                  <Input
                    id="custom_code"
                    value={customCode}
                    onChange={e => setCustomCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                    placeholder="auto-generated if empty"
                    maxLength={20}
                  />
                </div>

                <div className="border-t pt-4">
                  <Label className="font-medium">Tracking Parameters (optional)</Label>
                  <p className="text-xs text-muted-foreground">Added as subid, subid2, etc. to affiliate URL</p>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div className="space-y-2">
                      <Label htmlFor="sub1">sub1 (Creative ID)</Label>
                      <Input id="sub1" value={sub1} onChange={e => setSub1(e.target.value)} placeholder="creative_123" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sub2">sub2 (Channel)</Label>
                      <Input id="sub2" value={sub2} onChange={e => setSub2(e.target.value)} placeholder="instagram" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sub3">sub3 (Campaign)</Label>
                      <Input id="sub3" value={sub3} onChange={e => setSub3(e.target.value)} placeholder="summer_sale" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sub4">sub4 (Custom)</Label>
                      <Input id="sub4" value={sub4} onChange={e => setSub4(e.target.value)} placeholder="custom_value" />
                    </div>
                  </div>
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" form="create-link-form" disabled={creating || !selectedProduct}>
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Create Link'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {filteredLinks.length === 0 ? (
            <div className="p-12 text-center">
              <ExternalLink className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No links yet</h3>
              <p className="text-muted-foreground mb-4">Create your first tracking link to start earning</p>
              <Button onClick={() => setShowModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Link
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Product</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Short Link</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Tracking Params</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Clicks</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Conversions</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Earnings</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Status</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLinks.map(link => (
                    <tr key={link.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{link.product?.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{link.product?.network}</p>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-sm">
                        <div className="flex items-center gap-2">
                          <span>{shortUrl(link.short_code)}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyToClipboard(shortUrl(link.short_code), link.id)}
                            className="h-7 w-7"
                          >
                            {copiedId === link.id ? (
                              <CheckCircle className="h-4 w-4 text-success" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                      <td className="p-4 text-sm">
                        {Object.entries(link.tracking_params).map(([k, v]) => (
                          <span key={k} className="px-1.5 py-0.5 bg-muted rounded text-xs mr-1">
                            {k}: {v}
                          </span>
                        ))}
                        {Object.keys(link.tracking_params).length === 0 && (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-4 font-mono">{formatNumber(link.clicks)}</td>
                      <td className="p-4 font-mono">{formatNumber(link.conversions)}</td>
                      <td className="p-4 font-medium">{formatCurrency(link.commission_earned)}</td>
                      <td className="p-4">{getStatusBadge(link.status)}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleStatus(link)}
                            className="h-7 w-7"
                          >
                            {link.status === 'active' ? (
                              <span className="text-warning">⏸</span>
                            ) : (
                              <span className="text-success">▶</span>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(link.id)}
                            className="h-7 w-7 text-error"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}