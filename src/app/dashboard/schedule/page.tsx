'use client'

import { PageSkeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format, addHours, startOfHour } from 'date-fns'
import { Calendar, Clock, ChevronLeft, ChevronRight, Send, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdCreative {
  id: string
  headline: string
  body: string
  image_url: string | null
  video_url: string | null
  platform: string
  format: string
  product: {
    name: string
    image_url: string | null
    affiliate_url: string
  }
  status: string
  quality_score: number
}

interface SocialAccount {
  id: string
  platform: string
  account_name: string
  daily_post_limit: number
  posts_today: number
  is_active: boolean
}

const PLATFORMS = ['instagram', 'youtube', 'pinterest', 'x', 'facebook', 'tiktok'] as const

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  youtube: 'YouTube Shorts',
  pinterest: 'Pinterest',
  x: 'X (Twitter)',
  facebook: 'Facebook',
  tiktok: 'TikTok',
}

export default function SchedulePage() {
  const [creatives, setCreatives] = useState<AdCreative[]>([])
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [scheduling, setScheduling] = useState(false)
  const [selectedCreative, setSelectedCreative] = useState<AdCreative | null>(null)
  const [formData, setFormData] = useState({
    platform: '' as string,
    account_id: '' as string,
    caption: '',
    scheduled_at: '',
    media_urls: [] as string[],
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [creativeIdFromUrl, setCreativeIdFromUrl] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (creativeIdFromUrl) {
      const creative = creatives.find(c => c.id === creativeIdFromUrl)
      if (creative) {
        selectCreative(creative)
      }
    }
  }, [creativeIdFromUrl, creatives])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [creativesRes, accountsRes] = await Promise.all([
        fetch('/api/ads?status=approved&status=draft'),
        fetch('/api/social-accounts'),
      ])
      const [creativesData, accountsData] = await Promise.all([
        creativesRes.json(),
        accountsRes.json(),
      ])
      if (creativesData.success) setCreatives(creativesData.variants)
      if (accountsData.success) setAccounts(accountsData.accounts)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectCreative = (creative: AdCreative) => {
    setSelectedCreative(creative)
    const mediaUrls = []
    if (creative.image_url) mediaUrls.push(creative.image_url)
    if (creative.video_url) mediaUrls.push(creative.video_url)
    
    const defaultCaption = `${creative.headline}\n\n${creative.body}\n\n#ad #affiliate`
    
    setFormData({
      platform: creative.platform,
      account_id: '',
      caption: defaultCaption,
      scheduled_at: format(addHours(startOfHour(new Date()), 1), "yyyy-MM-dd'T'HH:mm"),
      media_urls: mediaUrls,
    })
    setErrors({})
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    
    if (!formData.platform) setErrors({ platform: 'Select a platform' })
    if (!formData.account_id) setErrors({ account_id: 'Select an account' })
    if (!formData.caption.trim()) setErrors({ caption: 'Caption is required' })
    if (!formData.scheduled_at) setErrors({ scheduled_at: 'Select a date/time' })
    
    if (Object.keys(errors).length > 0) return

    setScheduling(true)
    try {
      const res = await fetch('/api/scheduled-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creative_id: selectedCreative?.id,
          platform: formData.platform,
          account_id: formData.account_id,
          caption: formData.caption,
          media_urls: formData.media_urls,
          scheduled_at: formData.scheduled_at,
        }),
      })
      const data = await res.json()
      if (data.success) {
        alert('Post scheduled successfully!')
        window.location.href = '/dashboard/calendar'
      } else {
        setErrors({ submit: data.error || 'Failed to schedule post' })
      }
    } catch (error) {
      console.error('Failed to schedule:', error)
      setErrors({ submit: 'Failed to schedule post' })
    } finally {
      setScheduling(false)
    }
  }

  const getAccountsForPlatform = (platform: string) => {
    return accounts.filter(a => a.platform === platform && a.is_active)
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
          <h1 className="text-2xl font-bold">Schedule Post</h1>
          <p className="text-muted-foreground">Schedule an approved ad creative for publishing</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/calendar">
            <Calendar className="mr-2 h-4 w-4" />
            View Calendar
          </Link>
        </Button>
      </div>

      {/* Creative Selection */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>1. Select Ad Creative</CardTitle>
        </CardHeader>
        <CardContent>
          {creatives.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p>No approved/draft ad creatives found. Create some in <Link href="/dashboard/ads" className="text-primary underline">Ad Studio</Link>.</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {creatives.map((creative) => (
                <Button
                  key={creative.id}
                  variant={selectedCreative?.id === creative.id ? 'default' : 'outline'}
                  className="w-full justify-start gap-3 p-3 h-auto text-left"
                  onClick={() => selectCreative(creative)}
                >
                  {(creative.image_url || creative.video_url) && (
                    <div className="h-16 w-16 rounded-lg bg-muted/50 flex-shrink-0 overflow-hidden">
                      {creative.image_url ? (
                        <img src={creative.image_url} alt="" className="h-full w-full object-cover" />
                      ) : creative.video_url ? (
                        <video src={creative.video_url} className="h-full w-full object-cover" muted />
                      ) : null}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{creative.product?.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{PLATFORM_LABELS[creative.platform]} · {creative.format}</p>
                    <p className="text-xs text-muted-foreground">{creative.headline.slice(0, 60)}...</p>
                  </div>
                  {selectedCreative?.id === creative.id && (
                    <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <CheckCircle className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Form */}
      {selectedCreative && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>2. Schedule Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Platform */}
              <div className="space-y-2">
                <Label htmlFor="platform">Platform</Label>
                <Select
                  value={formData.platform}
                  onValueChange={v => setFormData({ ...formData, platform: v, account_id: '' })}
                  disabled={!!selectedCreative}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map(p => (
                      <SelectItem key={p} value={p}>{PLATFORM_LABELS[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.platform && <p className="text-sm text-destructive">{errors.platform}</p>}
              </div>

              {/* Account */}
              <div className="space-y-2">
                <Label htmlFor="account_id">Social Account</Label>
                {formData.platform ? (
                  <>
                    <Select value={formData.account_id} onValueChange={v => setFormData({ ...formData, account_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select connected account" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAccountsForPlatform(formData.platform).map(acc => (
                          <SelectItem key={acc.id} value={acc.id}>
                            @{acc.account_name} ({acc.posts_today}/{acc.daily_post_limit} today)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {getAccountsForPlatform(formData.platform).length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No connected accounts for this platform. <Link href="/dashboard/social-accounts" className="text-primary underline">Connect one</Link>.
                      </p>
                    )}
                    {errors.account_id && <p className="text-sm text-destructive">{errors.account_id}</p>}
                  </>
                ) : (
                  <Select>
                    <SelectTrigger disabled>
                      <SelectValue placeholder="Select platform first" />
                    </SelectTrigger>
                  </Select>
                )}
              </div>

              {/* Caption */}
              <div className="space-y-2">
                <Label htmlFor="caption">Caption</Label>
                <textarea
                  id="caption"
                  className="w-full min-h-[120px] p-3 rounded-lg border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                  value={formData.caption}
                  onChange={e => setFormData({ ...formData, caption: e.target.value })}
                  placeholder="Write your caption..."
                />
                {errors.caption && <p className="text-sm text-destructive">{errors.caption}</p>}
              </div>

              {/* Media Preview */}
              {formData.media_urls.length > 0 && (
                <div className="space-y-2">
                  <Label>Media</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {formData.media_urls.map((url, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden">
                        {url.includes('.mp4') || url.includes('.mov') ? (
                          <video src={url} className="h-full w-full object-cover" muted />
                        ) : (
                          <img src={url} alt={`Media ${i}`} className="h-full w-full object-cover" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Schedule Time */}
              <div className="space-y-2">
                <Label htmlFor="scheduled_at">Schedule For</Label>
                <Input
                  id="scheduled_at"
                  type="datetime-local"
                  value={formData.scheduled_at}
                  onChange={e => setFormData({ ...formData, scheduled_at: e.target.value })}
                  min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                />
                <p className="text-sm text-muted-foreground">
                  Minimum 1 hour from now. Posts are published automatically by the autopilot.
                </p>
                {errors.scheduled_at && <p className="text-sm text-destructive">{errors.scheduled_at}</p>}
              </div>

              {errors.submit && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  {errors.submit}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1" size="lg" disabled={scheduling}>
                  {scheduling ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Schedule Post
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => setSelectedCreative(null)}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Change Creative
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Product Info */}
      {selectedCreative && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Product Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              {selectedCreative.product?.image_url && (
                <img src={selectedCreative.product.image_url} alt="" className="h-20 w-20 rounded-lg object-cover" />
              )}
              <div className="flex-1">
                <h4 className="font-medium">{selectedCreative.product?.name}</h4>
                <p className="text-sm text-muted-foreground">Affiliate link will be added automatically</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}