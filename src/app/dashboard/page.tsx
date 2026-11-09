'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { formatCurrency, formatNumber } from '@/lib/utils'
import {
  ShoppingBag,
  Video,
  MousePointer,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  Clock,
  Plus,
  Zap,
  Target,
  CheckCircle,
} from 'lucide-react'

interface Stats {
  totalProducts: number
  totalAds: number
  totalClicks: number
  totalCommission: number
  pendingCommission: number
  approvedCommission: number
}

interface LinkData {
  clicks: number
  commission_earned: number
}

interface CommissionData {
  amount: number
  status: string
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    totalAds: 0,
    totalClicks: 0,
    totalCommission: 0,
    pendingCommission: 0,
    approvedCommission: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
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

    const [products, ads, links, commissions] = await Promise.all([
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('ad_creatives').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('affiliate_links').select('clicks, commission_earned').eq('user_id', user.id),
      supabase.from('commissions').select('amount, status').eq('user_id', user.id),
    ])

    const totalClicks = (links.data || []).reduce((sum: number, l: LinkData) => sum + l.clicks, 0)
    const totalCommission = (commissions.data || []).reduce((sum: number, c: CommissionData) => sum + c.amount, 0)
    const pendingCommission = (commissions.data || [])
      .filter((c: CommissionData) => c.status === 'pending')
      .reduce((sum: number, c: CommissionData) => sum + c.amount, 0)
    const approvedCommission = (commissions.data || [])
      .filter((c: CommissionData) => c.status === 'approved')
      .reduce((sum: number, c: CommissionData) => sum + c.amount, 0)

    setStats({
      totalProducts: products.count || 0,
      totalAds: ads.count || 0,
      totalClicks,
      totalCommission,
      pendingCommission,
      approvedCommission,
    })
    setLoading(false)
  }

  const statCards = [
    {
      name: 'Products',
      value: stats.totalProducts,
      icon: ShoppingBag,
      color: 'bg-emerald-500',
      href: '/dashboard/products',
      change: '+2 this week',
    },
    {
      name: 'Ad Creatives',
      value: stats.totalAds,
      icon: Video,
      color: 'bg-violet-500',
      href: '/dashboard/ads',
      change: '+5 this week',
    },
    {
      name: 'Total Clicks',
      value: formatNumber(stats.totalClicks),
      icon: MousePointer,
      color: 'bg-blue-500',
      href: '/dashboard/analytics',
      change: '+12% vs last week',
    },
    {
      name: 'Total Earnings',
      value: formatCurrency(stats.totalCommission),
      icon: DollarSign,
      color: 'bg-amber-500',
      href: '/dashboard/analytics',
      change: formatCurrency(stats.approvedCommission) + ' approved',
    },
  ]

  const quickActions = [
    { name: 'Add Product', href: '/dashboard/products?add=true', icon: Plus, color: 'bg-emerald-500' },
    { name: 'Create Ads', href: '/dashboard/ads?create=true', icon: Video, color: 'bg-violet-500' },
    { name: 'View Calendar', href: '/dashboard/calendar', icon: Target, color: 'bg-blue-500' },
    { name: 'Run Autopilot', href: '/dashboard/autopilot', icon: Zap, color: 'bg-amber-500' },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-background to-teal-500/10 p-6 sm:p-8 border border-border/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Welcome back! 👋</h1>
            <p className="mt-1 text-muted-foreground">
              Here&apos;s what&apos;s happening with your affiliate autopilot today.
            </p>
          </div>
          <div className="flex gap-3">
            <Button asChild variant="outline">
              <Link href="/dashboard/products?add=true">
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/ads?create=true">
                <Video className="mr-2 h-4 w-4" />
                Create Ads
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.name} className="border-border/50 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.name}</CardTitle>
              <div className={`h-10 w-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                <stat.icon className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions + Earnings Breakdown */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card className="lg:col-span-1 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {quickActions.map((action) => (
                <Button
                  key={action.name}
                  variant="outline"
                  className="w-full justify-start gap-3"
                  asChild
                >
                  <Link href={action.href}>
                    <div className={`h-9 w-9 rounded-lg ${action.color} flex items-center justify-center`}>
                      <action.icon className="h-5 w-5 text-white" />
                    </div>
                    <span>{action.name}</span>
                  </Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Earnings Breakdown */}
        <Card className="lg:col-span-2 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-500" />
              Earnings Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-emerald-50 p-4 border border-emerald-100">
                <div className="text-sm text-emerald-700">Pending</div>
                <div className="text-2xl font-bold text-emerald-900">{formatCurrency(stats.pendingCommission)}</div>
                <div className="text-xs text-emerald-600">Awaiting approval</div>
              </div>
              <div className="rounded-lg bg-blue-50 p-4 border border-blue-100">
                <div className="text-sm text-blue-700">Approved</div>
                <div className="text-2xl font-bold text-blue-900">{formatCurrency(stats.approvedCommission)}</div>
                <div className="text-xs text-blue-600">Ready for payout</div>
              </div>
              <div className="rounded-lg bg-primary/10 p-4 border border-primary/20">
                <div className="text-sm text-primary">Total</div>
                <div className="text-2xl font-bold text-primary">{formatCurrency(stats.totalCommission)}</div>
                <div className="text-xs text-primary/80">All time earnings</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started / Next Steps */}
      {stats.totalProducts === 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Ready to start earning?</h3>
                <p className="text-muted-foreground mt-1">
                  Add your first affiliate product and let AI create winning ads for you.
                </p>
              </div>
              <Button size="lg" asChild>
                <Link href="/dashboard/products?add=true">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Product
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}