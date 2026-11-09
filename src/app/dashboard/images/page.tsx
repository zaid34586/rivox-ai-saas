'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Plus, Image, Sparkles, Download, Trash2, CheckCircle, XCircle, Eye, Copy, Filter, RefreshCw, Settings, Palette, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { IMAGE_STYLES, type ImageStyleConfig } from '@/lib/image-gen'

interface Product {
  id: string
  name: string
  image_url: string | null
  network: string
  smart_score: number
}

interface AdVariant {
  id: string
  product_id: string
  hook: string
  platform: string
  format: string
  product?: Product
}

interface GeneratedImage {
  id: string
  product_id: string
  variant_id: string | null
  prompt: string
  image_url: string
  width: number
  height: number
  style: string
  platform: string
  provider: string
  status: 'generated' | 'selected' | 'rejected' | 'published'
  selected: boolean
  created_at: string
  product?: Product
  variant?: AdVariant
}

export default function ImagesPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [variants, setVariants] = useState<AdVariant[]>([])
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState<'generate' | 'library'>('generate')
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [selectedVariant, setSelectedVariant] = useState<string>('')
  const [selectedStyle, setSelectedStyle] = useState<string>('lifestyle')
  const [selectedPlatform, setSelectedPlatform] = useState<string>('instagram')
  const [imageCount, setImageCount] = useState(4)
  const [customPrompt, setCustomPrompt] = useState('')
  const [styleFilter, setStyleFilter] = useState<string>('all')
  const [platformFilter, setPlatformFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'generated' | 'selected' | 'rejected' | 'published'>('all')
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null)

  useEffect(() => {
    fetchProducts()
    fetchVariants()
    fetchImages()
  }, [])

  const fetchProducts = async () => {
    let supabase: ReturnType<typeof createClient> | null = null
    try {
      supabase = createClient()
    } catch { return }
    const { data } = await supabase
      .from('products')
      .select('id, name, image_url, network, smart_score')
      .eq('status', 'active')
      .order('smart_score', { ascending: false })
    if (data) setProducts(data)
  }

  const fetchVariants = async () => {
    let supabase: ReturnType<typeof createClient> | null = null
    try {
      supabase = createClient()
    } catch { return }
    const { data } = await supabase
      .from('ad_creatives')
      .select('id, product_id, hook, platform, format, products:product_id(id, name)')
      .in('status', ['approved', 'pending_approval'])
      .order('created_at', { ascending: false })
    if (data) setVariants(data)
  }

  const fetchImages = async () => {
    let supabase: ReturnType<typeof createClient> | null = null
    try {
      supabase = createClient()
    } catch { return }
    const { data } = await supabase
      .from('generated_images')
      .select(`
        *,
        products:product_id (id, name, image_url, network),
        ad_creatives:variant_id (id, hook, platform, format, products:product_id(name))
      `)
      .order('created_at', { ascending: false })
    if (data) setImages(data)
    setLoading(false)
  }

  const handleGenerate = async () => {
    if (!selectedProduct) return
    
    setGenerating(true)
    let supabase: ReturnType<typeof createClient> | null = null
    try {
      supabase = createClient()
    } catch { setGenerating(false); return }

    const res = await fetch('/api/images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: selectedProduct,
        variant_id: selectedVariant || undefined,
        style: selectedStyle,
        platform: selectedPlatform,
        count: imageCount,
        customPrompt: customPrompt || undefined,
      }),
    })

    const data = await res.json()
    setGenerating(false)

    if (!res.ok) {
      alert(data.error || 'Failed to generate images')
      return
    }

    alert(`Generated ${data.count} images!`)
    fetchImages()
    setActiveTab('library')
  }

  const handleStatusChange = async (id: string, newStatus: GeneratedImage['status']) => {
    let supabase: ReturnType<typeof createClient> | null = null
    try {
      supabase = createClient()
    } catch { return }
    
    await fetch('/api/images', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus }),
    })
    fetchImages()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this image?')) return
    
    let supabase: ReturnType<typeof createClient> | null = null
    try {
      supabase = createClient()
    } catch { return }
    
    await fetch(`/api/images?id=${id}`, { method: 'DELETE' })
    fetchImages()
  }

  const handleSelect = async (id: string, selected: boolean) => {
    let supabase: ReturnType<typeof createClient> | null = null
    try {
      supabase = createClient()
    } catch { return }
    
    await fetch('/api/images', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, selected }),
    })
    fetchImages()
  }

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    alert('Prompt copied to clipboard!')
  }

  const filteredImages = images.filter(img => {
    const matchesStyle = styleFilter === 'all' || img.style === styleFilter
    const matchesPlatform = platformFilter === 'all' || img.platform === platformFilter
    const matchesStatus = statusFilter === 'all' || img.status === statusFilter
    return matchesStyle && matchesPlatform && matchesStatus
  })

  const getStyleConfig = (style: string) => {
    const configs: Record<string, { name: string; ratio: string }> = {
      photorealistic: { name: 'Photorealistic', ratio: '1:1' },
      lifestyle: { name: 'Lifestyle', ratio: '4:5' },
      'flat-lay': { name: 'Flat Lay', ratio: '1:1' },
      'before-after': { name: 'Before/After', ratio: '16:9' },
      'product-shot': { name: 'Product Shot', ratio: '1:1' },
      'ugc-selfie': { name: 'UGC Selfie', ratio: '9:16' },
      demo: { name: 'Demo', ratio: '9:16' },
    }
    return configs[style] || { name: style, ratio: '1:1' }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      generated: 'bg-gray-100 text-gray-700',
      selected: 'bg-emerald-100 text-emerald-700',
      rejected: 'bg-red-100 text-red-700',
      published: 'bg-blue-100 text-blue-700',
    }
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.generated}`}>{status}</span>
  }

  const getPlatformBadge = (platform: string) => {
    const colors: Record<string, string> = {
      instagram: 'bg-purple-100 text-purple-700',
      youtube: 'bg-red-100 text-red-700',
      pinterest: 'bg-red-100 text-red-700',
      x: 'bg-sky-100 text-sky-700',
      facebook: 'bg-blue-100 text-blue-700',
      tiktok: 'bg-pink-100 text-pink-700',
    }
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[platform] || colors.instagram}`}>{platform}</span>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const stylesList = Object.entries(IMAGE_STYLES).map(([key, config]) => ({
    key,
    name: config.name,
    ratio: config.recommendedRatio,
    useCases: config.useCases.join(', '),
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Image className="h-6 w-6 text-primary" />
            Image Studio
          </h1>
          <p className="text-muted-foreground">AI-powered image generation for ads</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value: 'generate' | 'library') => setActiveTab(value)}>
        <TabsList className="grid w-fit grid-cols-2">
          <TabsTrigger value="generate">
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Images
          </TabsTrigger>
          <TabsTrigger value="library">
            <Layers className="mr-2 h-4 w-4" />
            Image Library
          </TabsTrigger>
        </TabsList>

        {/* GENERATE TAB */}
        <TabsContent value="generate" className="space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Generate New Images
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Product & Variant Selection */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Select Product *</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.network}) - Score: {p.smart_score}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ad Variant (optional - for hook context)</Label>
                  <Select value={selectedVariant} onValueChange={setSelectedVariant}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select variant for hook context" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None - use product only</SelectItem>
                      {variants.map(v => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.product?.name || 'Unknown'} - {v.hook.slice(0, 50)}...
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Style & Platform */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Image Style</Label>
                  <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select style" />
                    </SelectTrigger>
                    <SelectContent>
                      {stylesList.map(s => (
                        <SelectItem key={s.key} value={s.key}>
                          {s.name} ({s.ratio}) - {s.useCases}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Each style optimizes for different use cases and aspect ratios
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Target Platform</Label>
                  <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="pinterest">Pinterest</SelectItem>
                      <SelectItem value="x">X (Twitter)</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Count & Custom Prompt */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Number of Images</Label>
                  <Select value={String(imageCount)} onValueChange={v => setImageCount(parseInt(v))}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="4">4 (Recommended)</SelectItem>
                      <SelectItem value="6">6</SelectItem>
                      <SelectItem value="8">8</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Custom Prompt (optional)</Label>
                  <Input
                    placeholder="Add specific details, colors, mood..."
                    value={customPrompt}
                    onChange={e => setCustomPrompt(e.target.value)}
                  />
                </div>
              </div>

              {/* Advanced Options */}
              <Card className="border-primary/50 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Advanced Options
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Brand Colors (comma separated)</Label>
                      <Input placeholder="#FF6B6B, #4ECDC4, #45B7D1" />
                    </div>
                    <div className="space-y-2">
                      <Label>Logo URL (optional)</Label>
                      <Input placeholder="https://example.com/logo.png" />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="rounded border-input" />
                    <span className="text-sm">Include subtle logo placement</span>
                  </label>
                </CardContent>
              </Card>

              {/* Generate Button */}
              <Button 
                onClick={handleGenerate} 
                disabled={generating || !selectedProduct}
                size="lg"
                className="w-full sm:w-auto"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Images
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Style Guide */}
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Style Guide
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {stylesList.map(s => (
                  <Card key={s.key} className="border-border/50">
                    <CardContent className="pt-4">
                      <p className="font-semibold">{s.name}</p>
                      <p className="text-xs text-muted-foreground">Ratio: {s.ratio}</p>
                      <p className="text-xs text-muted-foreground mt-1">{s.useCases}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LIBRARY TAB */}
        <TabsContent value="library">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Select value={styleFilter} onValueChange={setStyleFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All Styles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Styles</SelectItem>
                    {Object.entries(IMAGE_STYLES).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={platformFilter} onValueChange={setPlatformFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All Platforms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="pinterest">Pinterest</SelectItem>
                    <SelectItem value="x">X (Twitter)</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="generated">Generated</SelectItem>
                    <SelectItem value="selected">Selected</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={fetchImages} className="ml-auto">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Images Grid */}
          {filteredImages.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="p-12 text-center">
                <Image className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No images yet</h3>
                <p className="text-muted-foreground mb-4">Generate your first AI images to get started</p>
                <Button onClick={() => setActiveTab('generate')}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Images
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredImages.map(img => (
                <Card key={img.id} className="border-border/50 hover:shadow-md transition-shadow">
                  <CardContent className="p-3 space-y-3">
                    {/* Image Preview */}
                    <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                      <img 
                        src={img.image_url} 
                        alt={img.prompt.slice(0, 50)} 
                        className="w-full h-full object-cover"
                        onClick={() => setPreviewImage(img)}
                      />
                      {img.selected && (
                        <div className="absolute inset-0 bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center">
                          <CheckCircle className="h-8 w-8 text-emerald-500" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="space-y-1 text-sm">
                      <p className="font-medium truncate">{img.product?.name || 'Unknown Product'}</p>
                      <div className="flex flex-wrap gap-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary`}>
                          {getStyleConfig(img.style).name}
                        </span>
                        {getPlatformBadge(img.platform)}
                        {getStatusBadge(img.status)}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{img.prompt.slice(0, 80)}...</p>
                      <p className="text-xs text-muted-foreground font-mono">{img.width}×{img.height} • {img.provider}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 pt-2 border-t border-border/50">
                      <Button variant="ghost" size="icon" onClick={() => setPreviewImage(img)} title="Preview">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard(img.prompt)} title="Copy Prompt">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleStatusChange(img.id, img.status === 'selected' ? 'generated' : 'selected')}
                        title={img.status === 'selected' ? 'Unselect' : 'Select for use'}
                        className={img.status === 'selected' ? 'text-emerald-500' : ''}
                      >
                        {img.status === 'selected' ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(img.id)} title="Delete" className="text-red-500 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Preview Modal */}
          {previewImage && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setPreviewImage(null)}>
              <div className="relative max-w-4xl max-h-[90vh] w-full bg-background rounded-xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="font-semibold">{previewImage.product?.name || 'Preview'}</h3>
                  <Button variant="ghost" size="icon" onClick={() => setPreviewImage(null)}>
                    <XCircle className="h-5 w-5" />
                  </Button>
                </div>
                <div className="p-4">
                  <img src={previewImage.image_url} alt="" className="max-w-full max-h-[70vh] mx-auto rounded-lg" />
                </div>
                <div className="p-4 border-t space-y-2">
                  <p className="text-sm text-muted-foreground font-mono truncate">{previewImage.prompt}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {getStyleConfig(previewImage.style).name}
                    </span>
                    {getPlatformBadge(previewImage.platform)}
                    {getStatusBadge(previewImage.status)}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => copyToClipboard(previewImage.prompt)}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Prompt
                    </Button>
                    <Button onClick={() => handleStatusChange(previewImage.id, previewImage.status === 'selected' ? 'generated' : 'selected')}>
                      {previewImage.status === 'selected' ? 'Unselect' : 'Select'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}