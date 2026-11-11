'use client'

import { PageSkeleton } from '@/components/ui/skeleton'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Plus, Upload, Download, FileText, AlertCircle, CheckCircle, Trash2, Edit, Eye } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { calculateSmartScore, type ScoreBreakdown } from '@/lib/scoring'

interface Product {
  id: string
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
  gravity_score: number | null
  trend_score: number | null
  smart_score: number
  status: string
  created_at: string
}

const NETWORKS = [
  { value: 'amazon', label: 'Amazon Associates' },
  { value: 'flipkart', label: 'Flipkart Affiliate' },
  { value: 'clickbank', label: 'ClickBank' },
  { value: 'meesho', label: 'Meesho' },
  { value: 'cuelinks', label: 'Cuelinks' },
  { value: 'custom', label: 'Custom / Other' },
]

const CATEGORIES = [
  'Health & Fitness',
  'Beauty & Personal Care',
  'Electronics & Gadgets',
  'Home & Kitchen',
  'Fashion & Accessories',
  'Books & Education',
  'Sports & Outdoors',
  'Automotive',
  'Software & SaaS',
  'Finance & Investing',
  'Other',
]

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    affiliate_url: '',
    network: 'amazon',
    commission_rate: 0,
    commission_type: 'percentage',
    category: '',
    price: '',
    original_price: '',
    rating: '',
    review_count: '',
    gravity_score: '',
    trend_score: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [csvImport, setCsvImport] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvPreview, setCsvPreview] = useState<any[]>([])
  const [importing, setImporting] = useState(false)
  const [scoreBreakdown, setScoreBreakdown] = useState<ScoreBreakdown | null>(null)

  useEffect(() => {
    fetchProducts()
  }, [])

  // Auto-calculate smart score when scoring fields change
  useEffect(() => {
    if (showModal) {
      calculateScore()
    }
  }, [
    showModal,
    formData.commission_rate,
    formData.commission_type,
    formData.gravity_score,
    formData.trend_score,
    formData.rating,
    formData.review_count,
    formData.price,
    formData.original_price,
  ])

  const fetchProducts = async () => {
    let supabase: ReturnType<typeof createClient> | null = null
    try {
      supabase = createClient()
    } catch {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setProducts(data)
    setLoading(false)
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!formData.name.trim()) errors.name = 'Product name is required'
    if (!formData.affiliate_url.trim()) errors.affiliate_url = 'Affiliate URL is required'
    else if (!formData.affiliate_url.startsWith('http')) errors.affiliate_url = 'Valid URL required'
    if (formData.commission_rate <= 0) errors.commission_rate = 'Commission rate must be > 0'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const calculateScore = () => {
    const inputs = {
      commission_rate: formData.commission_rate,
      commission_type: formData.commission_type as 'percentage' | 'fixed',
      gravity_score: formData.gravity_score ? parseFloat(String(formData.gravity_score)) : null,
      trend_score: formData.trend_score ? parseFloat(String(formData.trend_score)) : null,
      rating: formData.rating ? parseFloat(String(formData.rating)) : null,
      review_count: formData.review_count ? parseInt(String(formData.review_count)) : null,
      price: formData.price ? parseFloat(String(formData.price)) : null,
      original_price: formData.original_price ? parseFloat(String(formData.original_price)) : null,
    }
    const result = calculateSmartScore(inputs)
    setScoreBreakdown(result)
    return result.total
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      image_url: '',
      affiliate_url: '',
      network: 'amazon',
      commission_rate: 0,
      commission_type: 'percentage',
      category: '',
      price: '',
      original_price: '',
      rating: '',
      review_count: '',
      gravity_score: '',
      trend_score: '',
    })
    setFormErrors({})
    setScoreBreakdown(null)
    setEditingProduct(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setSubmitting(true)
    let supabase: ReturnType<typeof createClient> | null = null
    try {
      supabase = createClient()
    } catch {
      setSubmitting(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSubmitting(false)
      return
    }

    const payload = {
      user_id: user.id,
      name: formData.name,
      description: formData.description || null,
      image_url: formData.image_url || null,
      affiliate_url: formData.affiliate_url,
      network: formData.network,
      commission_rate: formData.commission_rate,
      commission_type: formData.commission_type,
      category: formData.category || null,
      price: formData.price ? parseFloat(formData.price) : null,
      original_price: formData.original_price ? parseFloat(formData.original_price) : null,
      rating: formData.rating ? parseFloat(formData.rating) : null,
      review_count: formData.review_count ? parseInt(formData.review_count) : null,
      gravity_score: formData.gravity_score ? parseFloat(formData.gravity_score) : null,
      trend_score: formData.trend_score ? parseFloat(formData.trend_score) : null,
      smart_score: calculateScore(),
      status: 'active' as const,
    }

    let error: any = null
    if (editingProduct) {
      const result = await supabase
        .from('products')
        .update(payload)
        .eq('id', editingProduct.id)
      error = result.error
    } else {
      const result = await supabase
        .from('products')
        .insert(payload)
      error = result.error
    }

    setSubmitting(false)

    if (error) {
      alert('Error: ' + error.message)
      return
    }

    resetForm()
    setShowModal(false)
    fetchProducts()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return

    let supabase: ReturnType<typeof createClient> | null = null
    try {
      supabase = createClient()
    } catch {
      return
    }

    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) {
      alert('Error: ' + error.message)
      return
    }
    fetchProducts()
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description || '',
      image_url: product.image_url || '',
      affiliate_url: product.affiliate_url,
      network: product.network,
      commission_rate: product.commission_rate,
      commission_type: product.commission_type,
      category: product.category || '',
      price: product.price?.toString() || '',
      original_price: product.original_price?.toString() || '',
      rating: product.rating?.toString() || '',
      review_count: product.review_count?.toString() || '',
      gravity_score: product.gravity_score?.toString() || '',
      trend_score: product.trend_score?.toString() || '',
    })
    // Calculate score for existing product
    setTimeout(() => calculateScore(), 0)
    setShowModal(true)
  }

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setCsvFile(file)
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.trim().split('\n')
      if (lines.length < 2) {
        alert('CSV must have header + at least 1 row')
        return
      }
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
      const rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
        const obj: Record<string, string> = {}
        headers.forEach((h, i) => { obj[h] = values[i] || '' })
        return obj
      })
      setCsvPreview(rows)
      setCsvImport(true)
    }
    reader.readAsText(file)
  }

  const handleCsvImport = async () => {
    if (!csvFile) return

    setImporting(true)
    let supabase: ReturnType<typeof createClient> | null = null
    try {
      supabase = createClient()
    } catch {
      setImporting(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setImporting(false)
      return
    }

    const rows = csvPreview.map(row => ({
      user_id: user.id,
      name: row.name || row.product_name || row.title || '',
      description: row.description || null,
      image_url: row.image_url || row.image || null,
      affiliate_url: row.affiliate_url || row.url || row.link || '',
      network: row.network || 'custom',
      commission_rate: parseFloat(row.commission_rate || row.commission || '0'),
      commission_type: row.commission_type || 'percentage',
      category: row.category || null,
      price: row.price ? parseFloat(row.price) : null,
      original_price: row.original_price ? parseFloat(row.original_price) : null,
      rating: row.rating ? parseFloat(row.rating) : null,
      review_count: row.review_count ? parseInt(row.review_count) : null,
      gravity_score: row.gravity_score ? parseFloat(row.gravity_score) : null,
      trend_score: row.trend_score ? parseFloat(row.trend_score) : null,
      status: 'active' as const,
    })).filter(r => r.name && r.affiliate_url)

    if (rows.length === 0) {
      alert('No valid rows found. Check column names.')
      setImporting(false)
      return
    }

    const { error } = await supabase.from('products').insert(rows)
    setImporting(false)

    if (error) {
      alert('Import error: ' + error.message)
      return
    }

    alert(`Imported ${rows.length} products!`)
    setCsvImport(false)
    setCsvFile(null)
    setCsvPreview([])
    fetchProducts()
  }

  const downloadTemplate = () => {
    const headers = [
      'name',
      'description',
      'image_url',
      'affiliate_url',
      'network',
      'commission_rate',
      'commission_type',
      'category',
      'price',
      'original_price',
      'rating',
      'review_count',
      'gravity_score',
      'trend_score',
    ]
    const sample = [
      'Wireless Headphones',
      'Premium noise-cancelling headphones with 30hr battery',
      'https://example.com/image.jpg',
      'https://amazon.in/dp/B0XXXXX?tag=yourtag-21',
      'amazon',
      '8',
      'percentage',
      'Electronics & Gadgets',
      '2999',
      '4999',
      '4.5',
      '1250',
      '85',
      '90',
    ]
    const csv = [headers.join(','), sample.join(',')].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'products-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-success-soft text-success-foreground',
      paused: 'bg-warning-soft text-warning-foreground',
      archived: 'bg-muted text-muted-foreground',
    }
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.active}`}>{status}</span>
  }

  const getNetworkBadge = (network: string) => {
    const colors: Record<string, string> = {
      amazon: 'bg-warning-soft text-warning-foreground',
      flipkart: 'bg-info-soft text-info-foreground',
      clickbank: 'bg-muted text-muted-foreground',
      meesho: 'bg-muted text-muted-foreground',
      cuelinks: 'bg-info-soft text-info-foreground',
      custom: 'bg-muted text-muted-foreground',
    }
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[network] || colors.custom}`}>{network}</span>
  }

  if (loading) {
    return (
      <PageSkeleton />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-muted-foreground">Manage your affiliate products</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setCsvImport(true); downloadTemplate(); }}>
            <Download className="mr-2 h-4 w-4" />
            CSV Template
          </Button>
          <Button variant="outline" onClick={() => { resetForm(); setShowModal(true); }}>
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button onClick={() => { resetForm(); setShowModal(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* CSV Import Modal */}
      {csvImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-auto">
            <CardHeader>
              <CardTitle>Import Products from CSV</CardTitle>
              <CardDescription>
                Upload a CSV file with your products. Download template for correct format.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Click to upload or drag & drop</p>
                  <p className="text-xs text-muted-foreground">.csv files only</p>
                </label>
              </div>

              {csvPreview.length > 0 && (
                <div className="space-y-2">
                  <p className="font-medium">Preview ({csvPreview.length} rows):</p>
                  <div className="max-h-60 overflow-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted">
                          {Object.keys(csvPreview[0]).map(h => (
                            <th key={h} className="p-2 text-left">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.slice(0, 5).map((row, i) => (
                          <tr key={i}>
                            {Object.values(row).map((v: unknown, j) => (
                              <td key={j} className="p-2 border-t">{String(v)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {csvPreview.length > 5 && <p className="text-xs text-muted-foreground">Showing 5 of {csvPreview.length} rows</p>}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setCsvImport(false); setCsvFile(null); setCsvPreview([]); }}>
                Cancel
              </Button>
              <Button onClick={handleCsvImport} disabled={importing || csvPreview.length === 0}>
                {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Import Products'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {showModal && !csvImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-auto">
            <CardHeader>
              <CardTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Wireless Headphones"
                    className={formErrors.name ? 'border-error focus:border-error focus:ring-error' : ''}
                  />
                  {formErrors.name && <p className="text-sm text-error">{formErrors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Product description for AI ad generation"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image_url">Image URL</Label>
                  <Input
                    id="image_url"
                    value={formData.image_url}
                    onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="affiliate_url">Affiliate URL *</Label>
                  <Input
                    id="affiliate_url"
                    value={formData.affiliate_url}
                    onChange={e => setFormData({ ...formData, affiliate_url: e.target.value })}
                    placeholder="https://amazon.in/dp/B0XXXXX?tag=yourtag-21"
                    className={formErrors.affiliate_url ? 'border-error focus:border-error focus:ring-error' : ''}
                  />
                  {formErrors.affiliate_url && <p className="text-sm text-error">{formErrors.affiliate_url}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="network">Network *</Label>
                    <Select value={formData.network} onValueChange={v => setFormData({ ...formData, network: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select network" />
                      </SelectTrigger>
                      <SelectContent>
                        {NETWORKS.map(n => (
                          <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="commission_type">Commission Type *</Label>
                    <Select value={formData.commission_type} onValueChange={v => setFormData({ ...formData, commission_type: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="commission_rate">Commission Rate *</Label>
                  <Input
                    id="commission_rate"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.commission_rate}
                    onChange={e => setFormData({ ...formData, commission_rate: parseFloat(e.target.value) || 0 })}
                    placeholder={formData.commission_type === 'percentage' ? '8.5' : '50'}
                    className={formErrors.commission_rate ? 'border-error focus:border-error focus:ring-error' : ''}
                  />
                  {formErrors.commission_rate && <p className="text-sm text-error">{formErrors.commission_rate}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Current Price (₹)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={e => setFormData({ ...formData, price: e.target.value })}
                      placeholder="2999"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="original_price">Original Price (₹)</Label>
                    <Input
                      id="original_price"
                      type="number"
                      step="0.01"
                      value={formData.original_price}
                      onChange={e => setFormData({ ...formData, original_price: e.target.value })}
                      placeholder="4999"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rating">Rating (0-5)</Label>
                    <Input
                      id="rating"
                      type="number"
                      step="0.1"
                      min="0"
                      max="5"
                      value={formData.rating}
                      onChange={e => setFormData({ ...formData, rating: e.target.value })}
                      placeholder="4.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="review_count">Review Count</Label>
                    <Input
                      id="review_count"
                      type="number"
                      value={formData.review_count}
                      onChange={e => setFormData({ ...formData, review_count: e.target.value })}
                      placeholder="1250"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gravity_score">Gravity Score (0-100)</Label>
                    <Input
                      id="gravity_score"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={formData.gravity_score}
                      onChange={e => setFormData({ ...formData, gravity_score: e.target.value })}
                      placeholder="85"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trend_score">Trend Score (0-100)</Label>
                    <Input
                      id="trend_score"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={formData.trend_score}
                      onChange={e => setFormData({ ...formData, trend_score: e.target.value })}
                      placeholder="90"
                    />
                  </div>
                </div>

                {/* Smart Score Breakdown */}
                {scoreBreakdown && (
                  <Card className="border-primary/50 bg-primary/5 mt-4">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between text-base">
                        <span className="flex items-center gap-2">
                          <span className="h-5 w-5" />
                          Smart Score Analysis
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                          scoreBreakdown.total >= 80 ? 'bg-success-soft text-success-foreground' :
                          scoreBreakdown.total >= 60 ? 'bg-info-soft text-info-foreground' :
                          scoreBreakdown.total >= 40 ? 'bg-warning-soft text-warning-foreground' :
                          'bg-error-soft text-error-foreground'
                        }`}>
                          {scoreBreakdown.total}/100
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex justify-between py-1 border-b border-border/50">
                          <span className="text-muted-foreground">Commission (25%)</span>
                          <span className="font-medium">{scoreBreakdown.commission}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border/50">
                          <span className="text-muted-foreground">Gravity (25%)</span>
                          <span className="font-medium">{scoreBreakdown.gravity}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border/50">
                          <span className="text-muted-foreground">Trend (20%)</span>
                          <span className="font-medium">{scoreBreakdown.trend}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border/50">
                          <span className="text-muted-foreground">Social Proof (15%)</span>
                          <span className="font-medium">{scoreBreakdown.social_proof}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border/50">
                          <span className="text-muted-foreground">Price Advantage (15%)</span>
                          <span className="font-medium">{scoreBreakdown.price_advantage}</span>
                        </div>
                        <div className="flex justify-between py-1 font-semibold text-lg">
                          <span>Total</span>
                          <span className={`text-primary ${scoreBreakdown.total >= 80 ? 'text-success' : ''}`}>
                            {scoreBreakdown.total}/100
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

              </form>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowModal(false); resetForm(); }}>
                Cancel
              </Button>
              <Button type="submit" form="product-form" disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingProduct ? 'Update' : 'Create')}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          {products.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No products yet</h3>
              <p className="text-muted-foreground mb-4">Add your first affiliate product to start earning</p>
              <Button onClick={() => { resetForm(); setShowModal(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Product</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Network</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Commission</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Smart Score</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Status</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(product => (
                    <tr key={product.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {product.image_url && (
                            <img src={product.image_url} alt={product.name} className="h-12 w-12 rounded-lg object-cover" />
                          )}
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-xs">{product.affiliate_url}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">{getNetworkBadge(product.network)}</td>
                      <td className="p-4">
                        {product.commission_type === 'percentage'
                          ? `${product.commission_rate}%`
                          : formatCurrency(product.commission_rate)}
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-medium',
                          product.smart_score >= 70 ? 'bg-success-soft text-success-foreground' :
                          product.smart_score >= 40 ? 'bg-warning-soft text-warning-foreground' :
                          'bg-error-soft text-error-foreground'
                        )}>
                          {product.smart_score}/100
                        </span>
                      </td>
                      <td className="p-4">{getStatusBadge(product.status)}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(product)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)}>
                            <Trash2 className="h-4 w-4 text-error" />
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