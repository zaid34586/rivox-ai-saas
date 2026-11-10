'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Plus, Sparkles, CheckCircle, XCircle, RotateCcw, Filter, RefreshCw, AlertTriangle, Clock, Zap, Gavel, Shield, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { checkCompliance, autoFixCompliance, type ComplianceReport, type ComplianceViolation } from '@/lib/compliance'

interface ComplianceContent {
  text: string
  platform: string
  format: string
  productCategory?: string
  network?: string
  hasAffiliateLink: boolean
  mediaUrls: string[]
}

export default function CompliancePage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'checker' | 'logs' | 'rules'>('checker')
  const [testContent, setTestContent] = useState({
    text: '',
    platform: 'instagram',
    format: 'reel',
    productCategory: 'Health & Fitness',
    network: 'amazon',
    hasAffiliateLink: true,
    mediaUrls: [],
  })
  const [testResult, setTestResult] = useState<ComplianceReport | null>(null)

  useEffect(() => {
    fetchContent()
  }, [])

  const fetchContent = async () => {
    setLoading(true)
    let supabase: ReturnType<typeof createClient> | null = null
    try {
      supabase = createClient()
    } catch { setLoading(false); return }

    const [ads, images, videos] = await Promise.all([
      supabase.from('ad_creatives').select('id, hook, body, platform, format, status, quality_score, products:product_id(name, category, network)').eq('status', 'approved'),
      supabase.from('generated_images').select('id, prompt, image_url, platform, status, quality_score, products:product_id(name, category, network)').eq('status', 'selected'),
      supabase.from('generated_videos').select('id, video_url, thumbnail_url, duration, status, ad_creatives:variant_id(hook, platform, format, products:product_id(name, category, network))').eq('status', 'selected'),
    ])

    const allItems = [
      ...(ads.data || []).map((a: any) => ({ ...a, type: 'ad', content: a.body || a.hook, title: a.hook?.slice(0, 50) + '...' })),
      ...(images.data || []).map((i: any) => ({ ...i, type: 'image', content: i.prompt, title: i.prompt?.slice(0, 50) + '...' })),
      ...(videos.data || []).map((v: any) => ({ ...v, type: 'video', content: v.ad_creatives?.hook, title: v.ad_creatives?.hook?.slice(0, 50) + '...' })),
    ]

    setItems(allItems)
    setLoading(false)
  }

  const runComplianceCheck = async (item: any) => {
    setChecking(item.id)

    const complianceContent: ComplianceContent = {
      text: item.content || '',
      platform: item.platform || 'instagram',
      format: item.format || 'reel',
      productCategory: item.products?.category,
      network: item.products?.network || item.network,
      hasAffiliateLink: true,
      mediaUrls: item.image_url ? [item.image_url] : (item.video_url ? [item.video_url] : []),
    }

    const report = checkCompliance(complianceContent)
    setTestResult({ ...report, contentId: item.id, contentType: item.type })

    if (!report.overallPassed) {
      const fixed = autoFixCompliance({ ...complianceContent })
      setTestResult(prev => prev ? { ...prev, fixedContent: fixed } : null)
    }

    setChecking(null)
  }

  const runAutoFix = () => {
    if (!testResult || !testResult.fixedContent) return

    const fixedContent = testResult.fixedContent!
    const fixedReport = checkCompliance(fixedContent)
    setTestResult(prev => prev ? { ...prev, ...fixedReport, overallPassed: fixedReport.overallPassed, violations: fixedReport.violations, fixedContent: undefined } : null)
  }

  const getSeverityBadge = (severity: string) => {
    const styles: Record<string, string> = {
      error: 'bg-red-100 text-red-700',
      warning: 'bg-amber-100 text-amber-700',
      info: 'bg-blue-100 text-blue-700',
    }
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[severity] || styles.error}`}>{severity}</span>
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Compliance Center
          </h1>
          <p className="text-muted-foreground">FTC, platform, and network policy compliance checker</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value: 'checker' | 'logs' | 'rules') => setActiveTab(value)}>
        <TabsList className="grid w-fit grid-cols-3">
          <TabsTrigger value="checker">
            <Sparkles className="mr-2 h-4 w-4" /> Compliance Checker
          </TabsTrigger>
          <TabsTrigger value="logs">
            <FileText className="mr-2 h-4 w-4" /> Audit Logs
          </TabsTrigger>
          <TabsTrigger value="rules">
            <Gavel className="mr-2 h-4 w-4" /> Rules Reference
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checker" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" /> Test Content
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Select value={testContent.platform} onValueChange={v => setTestContent({...testContent, platform: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="x">X (Twitter)</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="pinterest">Pinterest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Format</Label>
                  <Select value={testContent.format} onValueChange={v => setTestContent({...testContent, format: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reel">Reel</SelectItem>
                      <SelectItem value="post">Post</SelectItem>
                      <SelectItem value="story">Story</SelectItem>
                      <SelectItem value="short">Short</SelectItem>
                      <SelectItem value="tweet">Tweet</SelectItem>
                      <SelectItem value="pin">Pin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Product Category</Label>
                  <Select value={testContent.productCategory} onValueChange={v => setTestContent({...testContent, productCategory: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Health & Fitness">Health & Fitness</SelectItem>
                      <SelectItem value="Beauty & Personal Care">Beauty & Personal Care</SelectItem>
                      <SelectItem value="Electronics & Gadgets">Electronics & Gadgets</SelectItem>
                      <SelectItem value="Home & Kitchen">Home & Kitchen</SelectItem>
                      <SelectItem value="Fashion & Accessories">Fashion & Accessories</SelectItem>
                      <SelectItem value="Finance & Investing">Finance & Investing</SelectItem>
                      <SelectItem value="Supplements">Supplements</SelectItem>
                      <SelectItem value="Skincare">Skincare</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Affiliate Network</Label>
                  <Select value={testContent.network} onValueChange={v => setTestContent({...testContent, network: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select network" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="amazon">Amazon Associates</SelectItem>
                      <SelectItem value="flipkart">Flipkart Affiliate</SelectItem>
                      <SelectItem value="clickbank">ClickBank</SelectItem>
                      <SelectItem value="cuelinks">Cuelinks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content-text">Content Text</Label>
                  <textarea
                    id="content-text"
                    value={testContent.text}
                    onChange={e => setTestContent({...testContent, text: e.target.value})}
                    rows={6}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Paste your caption, script, or content here..."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={testContent.hasAffiliateLink}
                      onChange={e => setTestContent({...testContent, hasAffiliateLink: e.target.checked})}
                      className="rounded border-input"
                    />
                    <span className="text-sm">Has affiliate link</span>
                  </label>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      const content: ComplianceContent = { ...testContent }
                      const report = checkCompliance(content)
                      setTestResult(report)
                      if (!report.overallPassed) {
                        const fixed = autoFixCompliance({ ...content })
                        setTestResult(prev => prev ? { ...prev, fixedContent: fixed } : null)
                      }
                    }}
                    disabled={!testContent.text.trim()}
                    size="lg"
                    className="flex-1"
                  >
                    <Shield className="mr-2 h-4 w-4" /> Check Compliance
                  </Button>
                  {testResult && !testResult.overallPassed && testResult.fixedContent && (
                    <Button variant="outline" onClick={runAutoFix} size="lg">
                      <RotateCcw className="mr-2 h-4 w-4" /> Auto-Fix & Re-check
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" /> Compliance Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                {testResult ? (
                  <div className="space-y-4">
                    <div className={`p-4 rounded-lg ${testResult.overallPassed ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {testResult.overallPassed ? (
                            <CheckCircle className="h-6 w-6 text-emerald-600" />
                          ) : (
                            <XCircle className="h-6 w-6 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold">{testResult.overallPassed ? 'COMPLIANT' : 'NON-COMPLIANT'}</p>
                          <p className="text-sm text-muted-foreground">
                            {testResult.violations.filter(v => v.severity === 'error').length} errors, {testResult.violations.filter(v => v.severity === 'warning').length} warnings
                          </p>
                        </div>
                      </div>
                      {testResult.fixedContent && (
                        <Button variant="outline" size="sm" onClick={runAutoFix}>
                          <RotateCcw className="mr-2 h-4 w-4" /> Apply Auto-Fix
                        </Button>
                      )}
                    </div>

                    {testResult.violations.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold">Violations</h4>
                        <div className="space-y-2">
                          {testResult.violations.map((v, i) => (
                            <Card key={i} className={`border-l-4 ${v.severity === 'error' ? 'border-red-500' : v.severity === 'warning' ? 'border-amber-500' : 'border-blue-500'}`}>
                              <CardContent className="pt-4">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium">{v.ruleName}</span>
                                      {getSeverityBadge(v.severity)}
                                    </div>
                                    <p className="text-sm text-muted-foreground">{v.message}</p>
                                    {v.location && (
                                      <p className="text-xs text-muted-foreground mt-1 font-mono bg-muted p-1 rounded">{v.location}</p>
                                    )}
                                    {v.suggestion && (
                                      <p className="text-xs text-primary mt-1">💡 {v.suggestion}</p>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" /> Audit Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Audit logs would appear here showing all compliance checks performed.
                In production, this would query a compliance_logs database table.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-emerald-600" /> FTC Disclosure
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground">Required for all affiliate/paid content</p>
                <div className="p-2 bg-muted rounded text-xs font-mono">#ad</div>
                <div className="p-2 bg-muted rounded text-xs font-mono">#affiliate</div>
                <div className="p-2 bg-muted rounded text-xs font-mono">#sponsored</div>
                <p className="text-xs text-muted-foreground">Must be clear, conspicuous, and at the beginning of content</p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" /> Banned Claims
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground">These claims are prohibited across all platforms</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li>• "Cure", "cures", "cured" (medical)</li>
                  <li>• "Miracle", "magic"</li>
                  <li>• "Guaranteed", "guarantee"</li>
                  <li>• "Overnight", "instant" results</li>
                  <li>• "100% risk-free/safe/natural"</li>
                  <li>• "FDA approved" (without proof)</li>
                  <li>• "Clinically proven" (without substantiation)</li>
                  <li>• "No side effects"</li>
                  <li>• "Permanent/forever results"</li>
                  <li>• "Secret/hidden formula"</li>
                  <li>• "Best", "#1", "number one" (without proof)</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gavel className="h-5 w-5 text-blue-600" /> Platform Policies
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="space-y-1">
                  <p className="font-medium">Instagram/Facebook:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• No before/after comparisons</li>
                    <li>• No engagement bait (#follow, #like)</li>
                    <li>• Max 2200 chars (IG), 63206 (FB)</li>
                    <li>• Disclosure required for affiliate</li>
                  </ul>
                  <p className="font-medium mt-2">TikTok:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Max 2200 chars</li>
                    <li>• No "link in bio" in caption</li>
                    <li>• Disclosure required</li>
                  </ul>
                  <p className="font-medium mt-2">YouTube:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Before/after allowed</li>
                    <li>• Max 5000 chars description</li>
                    <li>• Disclosure in description</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-purple-600" /> Network Policies
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="space-y-1">
                  <p className="font-medium">Amazon Associates:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• No price/discount/sale/cheap claims</li>
                    <li>• Disclosure required</li>
                  </ul>
                  <p className="font-medium mt-2">ClickBank:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• No "guaranteed income", "easy money"</li>
                    <li>• No "get rich quick" claims</li>
                  </ul>
                  <p className="font-medium mt-2">All Networks:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Clear disclosure required</li>
                    <li>• No misleading claims</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" /> Category-Specific Rules
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="space-y-2">
                  <div>
                    <p className="font-medium">Health & Fitness / Supplements:</p>
                    <ul className="text-xs text-muted-foreground space-y-1 mt-1">
                      <li>• Required disclaimer: "Not intended to diagnose, treat, cure, or prevent disease"</li>
                      <li>• No "cure", "treat", "heal", "FDA approved" without proof</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium">Finance & Investing:</p>
                    <ul className="text-xs text-muted-foreground space-y-1 mt-1">
                      <li>• Required disclaimer: "Not financial advice. Past performance ≠ future results"</li>
                      <li>• No "guaranteed returns", "risk-free", "get rich quick"</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium">Skincare/Beauty:</p>
                    <ul className="text-xs text-muted-foreground space-y-1 mt-1">
                      <li>• No "cure acne", "remove wrinkles permanently", "reverse aging"</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gray-600" /> Character Limits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-1">Platform</th>
                      <th className="pb-1">Limit</th>
                      <th className="pb-1">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/50"><td>Instagram</td><td>2,200</td><td>Caption</td></tr>
                    <tr className="border-b border-border/50"><td>TikTok</td><td>2,200</td><td>Caption</td></tr>
                    <tr className="border-b border-border/50"><td>YouTube</td><td>5,000</td><td>Description</td></tr>
                    <tr className="border-b border-border/50"><td>Facebook</td><td>63,206</td><td>Post</td></tr>
                    <tr><td>X/Twitter</td><td>280</td><td>Post</td></tr>
                    <tr><td>Pinterest</td><td>500</td><td>Pin description</td></tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}