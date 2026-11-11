'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Plus, Sparkles, Brain, Image, Video, CheckCircle, XCircle, Eye, Edit, Trash2, Copy, Download, Filter, RefreshCw, ChevronLeft, ChevronRight, Star, Target } from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { AD_HOOKS, type AdHook } from '@/lib/ad-studio'

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
  headline: string
  body: string
  cta: string
  hashtags: string[]
  image_prompt: string
  video_prompt: string
  platform: string
  format: string
  quality_score: number
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'scheduled' | 'published' | 'failed'
  product?: Product
  created_at: string
}

interface AdScript {
  hook: string
  problem: string
  solution: string
  socialProof: string
  cta: string
  fullScript: string
}

export default function AdsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [variants, setVariants] = useState<AdVariant[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState<'generate' | 'library'>('generate')
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [selectedHooks, setSelectedHooks] = useState<string[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram', 'youtube'])
  const [variantCount, setVariantCount] = useState(10)
  const [previewVariant, setPreviewVariant] = useState<AdVariant | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'pending_approval' | 'approved' | 'rejected'>('all')
  const [platformFilter, setPlatformFilter] = useState<string>('all')
  
  // AI Generation options
  const [useAI, setUseAI] = useState(true)
  const [generateImage, setGenerateImage] = useState(true)
  const [generateVideo, setGenerateVideo] = useState(false)
  const [generateVoice, setGenerateVoice] = useState(false)
  const [aiAvailable, setAiAvailable] = useState(false)

  useEffect(() => {
    fetchProducts()
    fetchVariants()
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
      .select(`
        *,
        products:product_id (id, name, image_url, network, smart_score)
      `)
      .order('created_at', { ascending: false })
    if (data) setVariants(data)
    setLoading(false)
  }

  // Check AI availability on mount
  useEffect(() => {
    fetch('/api/ads')
      .then(res => res.json())
      .then(data => setAiAvailable(data.ai_available || false))
      .catch(() => setAiAvailable(false))
  }, [])

  const handleGenerate = async () => {
    if (!selectedProduct) return
    
    setGenerating(true)
    let supabase: ReturnType<typeof createClient> | null = null
    try {
      supabase = createClient()
    } catch { setGenerating(false); return }

    const res = await fetch('/api/ads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: selectedProduct,
        hook_ids: selectedHooks.length > 0 ? selectedHooks : undefined,
        platforms: selectedPlatforms,
        count: variantCount,
        use_ai: useAI,
        generate_image: generateImage,
        generate_video: generateVideo,
        generate_voice: generateVoice,
      }),
    })

    const data = await res.json()
    setGenerating(false)

    if (!res.ok) {
      alert(data.error || 'Failed to generate ads')
      return
    }

    alert(`Generated ${data.count} ad variants! ${data.ai_enabled ? '(AI-powered)' : '(Template-based)'}`)
    fetchVariants()
    setActiveTab('library')
  }

  const handleStatusChange = async (id: string, newStatus: AdVariant['status']) => {
    let supabase: ReturnType<typeof createClient> | null = null
    try {
      supabase = createClient()
    } catch { return }
    
    await fetch('/api/ads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus }),
    })
    fetchVariants()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this ad variant?')) return
    // Would need DELETE endpoint - for now just alert
    alert('Delete endpoint needed')
  }

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  const filteredVariants = variants.filter(v => {
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter
    const matchesPlatform = platformFilter === 'all' || v.platform === platformFilter
    return matchesStatus && matchesPlatform
  })

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      pending_approval: 'bg-amber-100 text-amber-700',
      approved: 'bg-emerald-100 text-emerald-700',
      rejected: 'bg-red-100 text-red-700',
      scheduled: 'bg-blue-100 text-blue-700',
      published: 'bg-violet-100 text-violet-700',
      failed: 'bg-red-100 text-red-700',
    }
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>{status.replace('_', ' ')}</span>
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

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'reel': return <Video className="h-4 w-4" />
      case 'short': return <Video className="h-4 w-4" />
      case 'story': return <Image className="h-4 w-4" />
      case 'pin': return <Image className="h-4 w-4" />
      case 'tweet': return <Target className="h-4 w-4" />
      default: return <Image className="h-4 w-4" />
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-100'
    if (score >= 60) return 'text-blue-600 bg-blue-100'
    if (score >= 40) return 'text-amber-600 bg-amber-100'
    return 'text-red-600 bg-red-100'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Ad Studio
          </h1>
          <p className="text-muted-foreground">AI-powered UGC ad generation</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value: 'generate' | 'library') => setActiveTab(value)}>
        <TabsList className="grid w-fit grid-cols-2">
          <TabsTrigger value="generate">
            <Brain className="mr-2 h-4 w-4" />
            Generate Ads
          </TabsTrigger>
          <TabsTrigger value="library">
            <Image className="mr-2 h-4 w-4" />
            Ad Library
          </TabsTrigger>
        </TabsList>

        {/* GENERATE TAB */}
        <TabsContent value="generate" className="space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Generate New Ad Variants
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Product Selection */}
              <div className="space-y-2">
                <Label>Select Product *</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a product to create ads for" />
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

              {/* Hook Selection */}
              <div className="space-y-2">
                <Label>Hooks (optional - leave empty for AI to pick best)</Label>
                <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto p-2 border rounded-lg bg-muted/30">
                  {AD_HOOKS.map(hook => (
                    <label key={hook.id} className={cn(
                      'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors',
                      selectedHooks.includes(hook.id)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:bg-accent'
                    )}>
                      <input
                        type="checkbox"
                        checked={selectedHooks.includes(hook.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedHooks([...selectedHooks, hook.id])
                          } else {
                            setSelectedHooks(selectedHooks.filter(h => h !== hook.id))
                          }
                        }}
                        className="sr-only"
                      />
                      <span className="flex items-center gap-1">
                        <span className="px-1.5 py-0.5 rounded text-xs bg-muted">{hook.category}</span>
                        {hook.name}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Selected: {selectedHooks.length} hooks. AI will auto-select if none chosen.
                </p>
              </div>

              {/* Platform Selection */}
              <div className="space-y-2">
                <Label>Platforms</Label>
                <div className="flex flex-wrap gap-2">
                  {['instagram', 'youtube', 'pinterest', 'x', 'facebook', 'tiktok'].map(p => (
                    <label key={p} className={cn(
                      'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors border',
                      selectedPlatforms.includes(p)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border hover:bg-accent'
                    )}>
                      <input
                        type="checkbox"
                        checked={selectedPlatforms.includes(p)}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedPlatforms([...selectedPlatforms, p])
                          } else {
                            setSelectedPlatforms(selectedPlatforms.filter(pl => pl !== p))
                          }
                        }}
                        className="sr-only"
                      />
                      <span className="capitalize">{p}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Variant Count */}
              <div className="space-y-2">
                <Label>Variants per Hook/Platform Combo</Label>
                <Select value={String(variantCount)} onValueChange={v => setVariantCount(parseInt(v))}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 (Faster)</SelectItem>
                    <SelectItem value="10">10 (Balanced)</SelectItem>
                    <SelectItem value="15">15 (More Options)</SelectItem>
                    <SelectItem value="20">20 (Maximum)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* AI Generation Options */}
              {aiAvailable && (
                <Card className="border-primary/50 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      AI Generation Options
                    </CardTitle>
                    <CardDescription>Enable real AI generation for media (requires API keys in .env)</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-medium">AI-Powered Generation</Label>
                        <p className="text-sm text-muted-foreground">Use GPT-4o for scripts, Flux for images, Runway for video</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useAI}
                          onChange={e => setUseAI(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ring peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    {useAI && (
                      <div className="grid gap-3 md:grid-cols-3 pt-2 border-t border-border/50">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={generateImage}
                            onChange={e => setGenerateImage(e.target.checked)}
                            className="h-4 w-4 rounded border-input bg-background text-primary focus:ring-2 focus:ring-ring"
                          />
                          <div>
                            <span className="font-medium">Images (Flux)</span>
                            <p className="text-xs text-muted-foreground">~$0.003 each</p>
                          </div>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={generateVideo}
                            onChange={e => setGenerateVideo(e.target.checked)}
                            className="h-4 w-4 rounded border-input bg-background text-primary focus:ring-2 focus:ring-ring"
                          />
                          <div>
                            <span className="font-medium">Video (Runway/Kling)</span>
                            <p className="text-xs text-muted-foreground">~$0.50 per 30s</p>
                          </div>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={generateVoice}
                            onChange={e => setGenerateVoice(e.target.checked)}
                            className="h-4 w-4 rounded border-input bg-background text-primary focus:ring-2 focus:ring-ring"
                          />
                          <div>
                            <span className="font-medium">Voice (ElevenLabs)</span>
                            <p className="text-xs text-muted-foreground">~$0.018 per 1k chars</p>
                          </div>
                        </label>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {!aiAvailable && (
                <Card className="border-warning/50 bg-warning/5">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Brain className="h-6 w-6 text-amber-500" />
                      <div>
                        <h4 className="font-semibold">AI Generation Unavailable</h4>
                        <p className="text-sm text-muted-foreground">
                          Add API keys to <code>.env.local</code> to enable real AI generation:
                        </p>
                        <ul className="mt-2 text-xs text-muted-foreground space-y-1 font-mono">
                          <li>OPENAI_API_KEY=sk-... (for scripts & platform content)</li>
                          <li>REPLICATE_API_TOKEN=r8_... (for images & video)</li>
                          <li>ELEVENLABS_API_KEY=... (for voiceovers)</li>
                        </ul>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Currently using template-based generation (fast, free, no API keys needed)
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

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
                    Generate Ad Variants
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="pt-6">
              <h4 className="font-semibold flex items-center gap-2">
                <Target className="h-4 w-4" />
                Pro Tips for Better Ads
              </h4>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-500" /> Products with images get 3x more engagement</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-500" /> Higher Smart Score products convert better</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-500" /> Mix hook categories (curiosity + problem + social proof)</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-500" /> Reels/Shorts get 5x more reach than static posts</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-500" /> Always include #ad for compliance</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LIBRARY TAB */}
        <TabsContent value="library">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending_approval">Pending Approval</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
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
                <Button variant="outline" onClick={fetchVariants} className="ml-auto">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Variants Grid */}
          {filteredVariants.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="p-12 text-center">
                <Brain className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No ad variants yet</h3>
                <p className="text-muted-foreground mb-4">Generate your first AI ad variants to get started</p>
                <Button onClick={() => setActiveTab('generate')}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Ads
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredVariants.map(variant => (
                <Card key={variant.id} className="border-border/50 hover:shadow-md transition-shadow">
                  <CardContent className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{variant.product?.name || 'Unknown Product'}</p>
                        <p className="text-xs text-muted-foreground">
                          {variant.platform} • {variant.format} • Score: {variant.quality_score}
                        </p>
                      </div>
                      <span className={`${getScoreColor(variant.quality_score)} px-2 py-0.5 rounded-full text-xs font-bold`}>
                        {variant.quality_score}/100
                      </span>
                    </div>

                    {/* Platform & Format Badges */}
                    <div className="flex flex-wrap gap-1">
                      {getPlatformBadge(variant.platform)}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground flex items-center gap-1`}>
                        {getFormatIcon(variant.format)} {variant.format}
                      </span>
                      {getStatusBadge(variant.status)}
                    </div>

                    {/* Hook Preview */}
                    <div className="text-sm text-muted-foreground line-clamp-2">
                      {variant.hook.slice(0, 150)}...
                    </div>

                    {/* Headline */}
                    <div className="font-medium text-sm">{variant.headline}</div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 pt-2 border-t border-border/50">
                      <Button variant="ghost" size="icon" onClick={() => setPreviewVariant(variant)} title="Preview">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard(variant.body)} title="Copy Caption">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleStatusChange(variant.id, variant.status === 'approved' ? 'draft' : 'approved')} title={variant.status === 'approved' ? 'Unapprove' : 'Approve'}>
                        {variant.status === 'approved' ? <XCircle className="h-4 w-4 text-amber-500" /> : <CheckCircle className="h-4 w-4 text-emerald-500" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(variant.id)} title="Delete" className="text-red-500 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination would go here */}
        </TabsContent>
      </Tabs>
    </div>
  )
}