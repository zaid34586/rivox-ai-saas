'use client'

import { PageSkeleton } from '@/components/ui/skeleton'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MousePointer, Globe, Monitor, Smartphone, TrendingUp, DollarSign, BarChart3 } from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Summary {
  totalClicks: number
  uniqueClicks: number
  clicksByDate: { date: string; count: number }[]
  clicksByDevice: { device: string; count: number }[]
  clicksByBrowser: { browser: string; count: number }[]
  clicksByCountry: { country: string; count: number }[]
  clicksByReferrer: { referrer: string; count: number }[]
  clicksByUtmSource: { source: string; count: number }[]
  epc: number
}

interface Link {
  id: string
  short_code: string
  product?: { name: string } | null
  clicks: number
  commission_earned: number
}

interface ClickEvent {
  ip_hash: string
  device_type: string
  browser: string
  country: string
  referrer: string | null
  utm_source: string | null
  created_at: string
}

interface CommissionEvent {
  amount: number
  link_id: string
}

interface LinkWithProduct {
  id: string
  short_code: string
  product_id: string
  clicks: number
  commission_earned: number
  products: { name: string } | null
}

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [topLinks, setTopLinks] = useState<Link[]>([])
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  useEffect(() => {
    fetchAnalytics()
  }, [days])

  const fetchAnalytics = async () => {
    setLoading(true)
    let supabase: ReturnType<typeof createClient> | null = null
    try {
      supabase = createClient()
    } catch {
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get user's links
    const { data: links } = await supabase
      .from('affiliate_links')
      .select('id, short_code, product_id, clicks, commission_earned, products:product_id(name)')
      .eq('user_id', user.id)
      .order('clicks', { ascending: false })
      .limit(10)

    const linkIds = (links as LinkWithProduct[] | null)?.map(l => l.id) || []

    if (linkIds.length > 0) {
      // Get clicks via RPC
      const { data: clicks, error: clicksError } = await supabase
        .rpc('get_clicks_for_analytics', {
          p_link_ids: linkIds,
          p_start_date: startDate.toISOString()
        })

      if (clicksError) {
        console.error('Clicks RPC error:', clicksError)
      }

      // Get commissions via RPC
      const { data: commissions, error: commissionsError } = await supabase
        .rpc('get_commissions_for_analytics', {
          p_link_ids: linkIds,
          p_start_date: startDate.toISOString()
        })

      if (commissionsError) {
        console.error('Commissions RPC error:', commissionsError)
      }

      const clicksData = (clicks as ClickEvent[] | null) || []
      const commissionsData = (commissions as CommissionEvent[] | null) || []

      // Calculate summary manually (since we can't import server lib in client)
      const totalClicks = clicksData?.length || 0
      const uniqueIps = new Set(clicksData?.map(c => c.ip_hash) || [])
      const uniqueClicks = uniqueIps.size

      const dateMap = new Map<string, number>()
      clicksData?.forEach(c => {
        const date = c.created_at.split('T')[0]
        dateMap.set(date, (dateMap.get(date) || 0) + 1)
      })
      const clicksByDate = Array.from(dateMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))

      const deviceMap = new Map<string, number>()
      clicksData?.forEach(c => {
        deviceMap.set(c.device_type, (deviceMap.get(c.device_type) || 0) + 1)
      })
      const clicksByDevice = Array.from(deviceMap.entries())
        .map(([device, count]) => ({ device, count }))
        .sort((a, b) => b.count - a.count)

      const browserMap = new Map<string, number>()
      clicksData?.forEach(c => {
        browserMap.set(c.browser, (browserMap.get(c.browser) || 0) + 1)
      })
      const clicksByBrowser = Array.from(browserMap.entries())
        .map(([browser, count]) => ({ browser, count }))
        .sort((a, b) => b.count - a.count)

      const countryMap = new Map<string, number>()
      clicksData?.forEach(c => {
        countryMap.set(c.country, (countryMap.get(c.country) || 0) + 1)
      })
      const clicksByCountry = Array.from(countryMap.entries())
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count)

      const referrerMap = new Map<string, number>()
      clicksData?.forEach(c => {
        const ref = c.referrer || 'Direct'
        referrerMap.set(ref, (referrerMap.get(ref) || 0) + 1)
      })
      const clicksByReferrer = Array.from(referrerMap.entries())
        .map(([referrer, count]) => ({ referrer, count }))
        .sort((a, b) => b.count - a.count)

      const utmSourceMap = new Map<string, number>()
      clicksData?.forEach(c => {
        if (c.utm_source) {
          utmSourceMap.set(c.utm_source, (utmSourceMap.get(c.utm_source) || 0) + 1)
        }
      })
      const clicksByUtmSource = Array.from(utmSourceMap.entries())
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count)

      const totalCommission = commissionsData?.reduce((sum: number, c: CommissionEvent) => sum + c.amount, 0) || 0
      const epc = totalClicks > 0 ? totalCommission / totalClicks : 0

      setSummary({
        totalClicks,
        uniqueClicks,
        clicksByDate,
        clicksByDevice,
        clicksByBrowser,
        clicksByCountry,
        clicksByReferrer,
        clicksByUtmSource,
        epc,
      })
    }

    // Format top links
    const formattedLinks = (links as LinkWithProduct[] | null)?.map(l => ({
      id: l.id,
      short_code: l.short_code,
      product: l.products,
      clicks: l.clicks,
      commission_earned: l.commission_earned,
    })) || []

    setTopLinks(formattedLinks)
    setLoading(false)
  }

  const statCards = [
    {
      name: 'Total Clicks',
      value: summary ? formatNumber(summary.totalClicks) : '—',
      icon: MousePointer,
      color: 'bg-primary',
    },
    {
      name: 'Unique Visitors',
      value: summary ? formatNumber(summary.uniqueClicks) : '—',
      icon: Globe,
      color: 'bg-primary',
    },
    {
      name: 'EPC (Earnings/Click)',
      value: summary ? formatCurrency(summary.epc) : '—',
      icon: DollarSign,
      color: 'bg-gold',
    },
    {
      name: 'Conversion Rate',
      value: summary && summary.totalClicks > 0 
        ? ((topLinks.reduce((sum: number, l: Link) => sum + l.commission_earned, 0) / summary.totalClicks) * 100).toFixed(2) + '%'
        : '—',
      icon: TrendingUp,
      color: 'bg-primary',
    },
  ]

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'mobile': return <Smartphone className="h-4 w-4" />
      case 'desktop': return <Monitor className="h-4 w-4" />
      default: return <MousePointer className="h-4 w-4" />
    }
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
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Track clicks, visitors, and earnings</p>
        </div>
        <Select value={String(days)} onValueChange={v => setDays(parseInt(v))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Time Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 Days</SelectItem>
            <SelectItem value="30">Last 30 Days</SelectItem>
            <SelectItem value="90">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.name} className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.name}</CardTitle>
              <div className={`h-10 w-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                <stat.icon className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Clicks Over Time */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Clicks Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary?.clicksByDate.length ? (
              <div className="space-y-2 h-64 overflow-y-auto">
                {summary.clicksByDate.map((item, i) => {
                  const maxCount = Math.max(...summary.clicksByDate.map(d => d.count))
                  const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0
                  return (
                    <div key={item.date} className="flex items-end gap-2 h-8">
                      <div className="flex-1 text-xs text-muted-foreground">{item.date}</div>
                      <div className="flex items-end h-full flex-1">
                        <div 
                          className="w-full bg-primary rounded-t transition-all"
                          style={{ height: `${height}%` }}
                        />
                      </div>
                      <div className="w-12 text-right text-sm font-medium">{item.count}</div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-12">No click data for this period</p>
            )}
          </CardContent>
        </Card>

        {/* Top Links */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Performing Links
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topLinks.length > 0 ? (
              <div className="space-y-3">
                {topLinks.slice(0, 5).map((link, i) => (
                  <div key={link.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-medium text-sm">{link.product?.name || 'Unknown Product'}</p>
                        <p className="text-xs text-muted-foreground font-mono">/go/{link.short_code}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{link.clicks} clicks</p>
                      <p className="text-sm text-gold-deep num">{formatCurrency(link.commission_earned)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No links with clicks yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Device Breakdown */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              By Device
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary?.clicksByDevice.length ? (
              <div className="space-y-2">
                {summary.clicksByDevice.map(item => (
                  <div key={item.device} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getDeviceIcon(item.device)}
                      <span className="capitalize">{item.device}</span>
                    </div>
                    <span className="font-medium">{item.count} ({summary.totalClicks > 0 ? ((item.count / summary.totalClicks) * 100).toFixed(1) : 0}%)</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No data</p>
            )}
          </CardContent>
        </Card>

        {/* Browser Breakdown */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              By Browser
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary?.clicksByBrowser.length ? (
              <div className="space-y-2">
                {summary.clicksByBrowser.map(item => (
                  <div key={item.browser} className="flex items-center justify-between">
                    <span className="capitalize">{item.browser}</span>
                    <span className="font-medium">{item.count} ({summary.totalClicks > 0 ? ((item.count / summary.totalClicks) * 100).toFixed(1) : 0}%)</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No data</p>
            )}
          </CardContent>
        </Card>

        {/* Referrer Breakdown */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              By Referrer
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary?.clicksByReferrer.length ? (
              <div className="space-y-2">
                {summary.clicksByReferrer.slice(0, 5).map(item => (
                  <div key={item.referrer} className="flex items-center justify-between">
                    <span className="truncate max-w-[150px]">{item.referrer || 'Direct'}</span>
                    <span className="font-medium">{item.count} ({summary.totalClicks > 0 ? ((item.count / summary.totalClicks) * 100).toFixed(1) : 0}%)</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Country & UTM Source */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Top Countries
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary?.clicksByCountry.length ? (
              <div className="space-y-2">
                {summary.clicksByCountry.slice(0, 8).map(item => (
                  <div key={item.country} className="flex items-center justify-between">
                    <span>{item.country}</span>
                    <span className="font-medium">{item.count} ({summary.totalClicks > 0 ? ((item.count / summary.totalClicks) * 100).toFixed(1) : 0}%)</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No data</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              UTM Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary?.clicksByUtmSource.length ? (
              <div className="space-y-2">
                {summary.clicksByUtmSource.map(item => (
                  <div key={item.source} className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded">{item.source}</span>
                    <span className="font-medium">{item.count} ({summary.totalClicks > 0 ? ((item.count / summary.totalClicks) * 100).toFixed(1) : 0}%)</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No UTM data</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}