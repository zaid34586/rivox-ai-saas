'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, DollarSign, TrendingUp, Clock, Download, Plus, Filter, AlertCircle, CheckCircle, XCircle, FileText, RefreshCw } from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Commission {
  id: string
  user_id: string
  link_id: string | null
  product_id: string | null
  network: string
  amount: number
  currency: string
  status: 'pending' | 'approved' | 'paid' | 'rejected' | 'cancelled'
  sale_date: string
  approved_at: string | null
  paid_at: string | null
  created_at: string
  affiliate_links?: { short_code: string; products?: { name: string; network: string } } | null
  products?: { name: string; network: string } | null
}

interface EarningsSummary {
  total: number
  pending: number
  approved: number
  paid: number
  thisMonth: number
  lastMonth: number
  byNetwork: { network: string; amount: number; count: number }[]
  byStatus: { status: string; amount: number; count: number }[]
  byDate: { date: string; amount: number }[]
}

export default function EarningsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [summary, setSummary] = useState<EarningsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCommission, setEditingCommission] = useState<Commission | null>(null)
  const [formData, setFormData] = useState({
    network: '',
    amount: '',
    currency: 'INR',
    status: 'pending',
    sale_date: new Date().toISOString().split('T')[0],
    link_id: '',
    product_id: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [days, setDays] = useState(30)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'paid' | 'rejected'>('all')
  const [networkFilter, setNetworkFilter] = useState<string>('all')

  useEffect(() => {
    fetchEarnings()
  }, [days])

  const fetchEarnings = async () => {
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

    const { data: commissionsData } = await supabase
      .from('commissions')
      .select(`
        *,
        affiliate_links:link_id (short_code, products:product_id(name, network)),
        products:product_id (name, network)
      `)
      .eq('user_id', user.id)
      .gte('sale_date', startDate.toISOString())
      .order('sale_date', { ascending: false })

    if (commissionsData) setCommissions(commissionsData)

    // Calculate summary
    const total = commissionsData?.reduce((sum: number, c: Commission) => sum + c.amount, 0) || 0
    const pending = commissionsData?.filter((c: Commission) => c.status === 'pending').reduce((sum: number, c: Commission) => sum + c.amount, 0) || 0
    const approved = commissionsData?.filter((c: Commission) => c.status === 'approved').reduce((sum: number, c: Commission) => sum + c.amount, 0) || 0
    const paid = commissionsData?.filter((c: Commission) => c.status === 'paid').reduce((sum: number, c: Commission) => sum + c.amount, 0) || 0

    const thisMonthStart = new Date()
    thisMonthStart.setDate(1)
    const lastMonthStart = new Date(thisMonthStart)
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1)
    const lastMonthEnd = new Date(thisMonthStart)
    lastMonthEnd.setDate(0)

    const thisMonth = commissionsData?.filter((c: Commission) => new Date(c.sale_date) >= thisMonthStart).reduce((sum: number, c: Commission) => sum + c.amount, 0) || 0
    const lastMonth = commissionsData?.filter((c: Commission) => {
      const d = new Date(c.sale_date)
      return d >= lastMonthStart && d <= lastMonthEnd
    }).reduce((sum: number, c: Commission) => sum + c.amount, 0) || 0

    // By network
    const networkMap = new Map<string, { amount: number; count: number }>()
    commissionsData?.forEach((c: Commission) => {
      const net = c.network || 'Unknown'
      const existing = networkMap.get(net) || { amount: 0, count: 0 }
      existing.amount += c.amount
      existing.count += 1
      networkMap.set(net, existing)
    })
    const byNetwork = Array.from(networkMap.entries())
      .map(([network, data]) => ({ network, ...data }))
      .sort((a, b) => b.amount - a.amount)

    // By status
    const statusMap = new Map<string, { amount: number; count: number }>()
    commissionsData?.forEach((c: Commission) => {
      const existing = statusMap.get(c.status) || { amount: 0, count: 0 }
      existing.amount += c.amount
      existing.count += 1
      statusMap.set(c.status, existing)
    })
    const byStatus = Array.from(statusMap.entries())
      .map(([status, data]) => ({ status, ...data }))

    // By date
    const dateMap = new Map<string, number>()
    commissionsData?.forEach((c: Commission) => {
      const date = c.sale_date.split('T')[0]
      dateMap.set(date, (dateMap.get(date) || 0) + c.amount)
    })
    const byDate = Array.from(dateMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date))

    setSummary({
      total,
      pending,
      approved,
      paid,
      thisMonth,
      lastMonth,
      byNetwork,
      byStatus,
      byDate,
    })

    setLoading(false)
  }

  const filteredCommissions = commissions.filter(c => {
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter
    const matchesNetwork = networkFilter === 'all' || c.network === networkFilter
    return matchesStatus && matchesNetwork
  })

  const getNetworks = () => {
    const nets = new Set(commissions.map(c => c.network).filter(Boolean))
    return Array.from(nets).sort()
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700',
      approved: 'bg-blue-100 text-blue-700',
      paid: 'bg-emerald-100 text-emerald-700',
      rejected: 'bg-red-100 text-red-700',
      cancelled: 'bg-gray-100 text-gray-700',
    }
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>{status}</span>
  }

  const getNetworkBadge = (network: string) => {
    const colors: Record<string, string> = {
      amazon: 'bg-orange-100 text-orange-700',
      flipkart: 'bg-blue-100 text-blue-700',
      clickbank: 'bg-purple-100 text-purple-700',
      meesho: 'bg-pink-100 text-pink-700',
      cuelinks: 'bg-indigo-100 text-indigo-700',
      custom: 'bg-gray-100 text-gray-700',
    }
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[network] || colors.custom}`}>{network}</span>
  }

  const handleOpenModal = (commission?: Commission) => {
    if (commission) {
      setEditingCommission(commission)
      setFormData({
        network: commission.network,
        amount: commission.amount.toString(),
        currency: commission.currency,
        status: commission.status,
        sale_date: commission.sale_date.split('T')[0],
        link_id: commission.link_id || '',
        product_id: commission.product_id || '',
        notes: '',
      })
    } else {
      setEditingCommission(null)
      setFormData({
        network: '',
        amount: '',
        currency: 'INR',
        status: 'pending',
        sale_date: new Date().toISOString().split('T')[0],
        link_id: '',
        product_id: '',
        notes: '',
      })
    }
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.network || !formData.amount) return

    setSubmitting(true)
    let supabase: ReturnType<typeof createClient> | null = null
    try {
      supabase = createClient()
    } catch {
      setSubmitting(false)
      return
    }

    const body = {
      network: formData.network,
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      status: formData.status,
      sale_date: formData.sale_date,
      link_id: formData.link_id || null,
      product_id: formData.product_id || null,
    }

    const url = editingCommission ? `/api/commissions?id=${editingCommission.id}` : '/api/commissions'
    const method = editingCommission ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingCommission ? { id: editingCommission.id, ...body } : body),
    })

    const data = await res.json()
    setSubmitting(false)

    if (!res.ok) {
      alert(data.error || 'Failed to save')
      return
    }

    alert(editingCommission ? 'Commission updated!' : 'Commission added!')
    setShowModal(false)
    setEditingCommission(null)
    fetchEarnings()
  }

  const handleStatusChange = async (commission: Commission, newStatus: Commission['status']) => {
    let supabase: ReturnType<typeof createClient> | null = null
    try {
      supabase = createClient()
    } catch {
      return
    }

    const res = await fetch('/api/commissions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: commission.id, status: newStatus }),
    })

    if (!res.ok) {
      alert('Failed to update status')
      return
    }

    fetchEarnings()
  }

  const exportCSV = () => {
    const headers = ['Date', 'Network', 'Product/Link', 'Amount', 'Currency', 'Status', 'Sale Date']
    const rows = filteredCommissions.map(c => [
      c.sale_date.split('T')[0],
      c.network,
      c.products?.name || c.affiliate_links?.products?.name || c.link_id || c.product_id || '—',
      c.amount.toFixed(2),
      c.currency,
      c.status,
      c.sale_date.split('T')[0],
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `commissions-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const statCards = [
    { name: 'Total Earnings', value: summary ? formatCurrency(summary.total) : '—', icon: DollarSign, color: 'bg-gold', change: summary && summary.lastMonth > 0 ? `${((summary.thisMonth - summary.lastMonth) / summary.lastMonth * 100).toFixed(1)}% vs last month` : '' },
    { name: 'Pending', value: summary ? formatCurrency(summary.pending) : '—', icon: Clock, color: 'bg-gold' },
    { name: 'Approved', value: summary ? formatCurrency(summary.approved) : '—', icon: CheckCircle, color: 'bg-primary' },
    { name: 'Paid', value: summary ? formatCurrency(summary.paid) : '—', icon: TrendingUp, color: 'bg-primary' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Earnings</h1>
          <p className="text-muted-foreground">Track commissions, payouts, and earnings</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Commission
          </Button>
        </div>
      </div>

      {/* Time Range & Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={String(days)} onValueChange={v => setDays(parseInt(v))}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
                <SelectItem value="365">Last Year</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={networkFilter} onValueChange={setNetworkFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Networks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Networks</SelectItem>
                {getNetworks().map(n => (
                  <SelectItem key={n} value={n}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchEarnings} className="ml-auto">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

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
              {stat.change && <p className="text-xs text-muted-foreground">{stat.change}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Earnings Chart */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Earnings Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summary?.byDate.length ? (
            <div className="space-y-2 h-64 overflow-y-auto">
              {summary.byDate.map((item, i) => {
                const maxAmount = Math.max(...summary.byDate.map(d => d.amount))
                const height = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0
                return (
                  <div key={item.date} className="flex items-end gap-2 h-8">
                    <div className="flex-1 text-xs text-muted-foreground">{item.date}</div>
                    <div className="flex items-end h-full flex-1">
                      <div 
                        className="w-full bg-gold rounded-t transition-all"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <div className="w-24 text-right text-sm font-medium">{formatCurrency(item.amount)}</div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-12">No earnings data for this period</p>
          )}
        </CardContent>
      </Card>

      {/* Breakdown Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* By Network */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              By Network
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary?.byNetwork.length ? (
              <div className="space-y-2">
                {summary.byNetwork.map(item => (
                  <div key={item.network} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getNetworkBadge(item.network)}
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(item.amount)}</p>
                      <p className="text-xs text-muted-foreground">{item.count} commissions</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No data</p>
            )}
          </CardContent>
        </Card>

        {/* By Status */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              By Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary?.byStatus.length ? (
              <div className="space-y-2">
                {summary.byStatus.map(item => (
                  <div key={item.status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(item.status)}
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(item.amount)}</p>
                      <p className="text-xs text-muted-foreground">{item.count} commissions</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No data</p>
            )}
          </CardContent>
        </Card>

        {/* This vs Last Month */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Month Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-gold-soft border border-gold/20">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-gold/20 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-gold-deep" />
                    </div>
                    <span className="font-medium">This Month</span>
                  </div>
                  <span className="font-bold text-gold-deep num">{formatCurrency(summary.thisMonth)}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="font-medium">Last Month</span>
                  </div>
                  <span className="font-medium">{formatCurrency(summary.lastMonth)}</span>
                </div>
                <div className="text-center text-sm">
                  {summary.lastMonth > 0 
                    ? `Change: {((summary.thisMonth - summary.lastMonth) / summary.lastMonth * 100).toFixed(1)}%`
                    : 'No previous month data'}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Commissions Table */}
      <Card>
        <CardContent className="p-0">
          {filteredCommissions.length === 0 ? (
            <div className="p-12 text-center">
              <DollarSign className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No commissions yet</h3>
              <p className="text-muted-foreground mb-4">Add your first commission or wait for sales</p>
              <Button onClick={() => handleOpenModal()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Commission
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Date</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Network</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Product / Link</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Amount</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Status</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCommissions.map(commission => (
                    <tr key={commission.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-4 text-sm">{commission.sale_date.split('T')[0]}</td>
                      <td className="p-4">{getNetworkBadge(commission.network)}</td>
                      <td className="p-4">
                        <p className="font-medium text-sm">
                          {commission.products?.name || commission.affiliate_links?.products?.name || 'Manual Entry'}
                        </p>
                        {commission.link_id && (
                          <p className="text-xs text-muted-foreground font-mono">/go/{commission.affiliate_links?.short_code}</p>
                        )}
                      </td>
                      <td className="p-4 font-medium">{formatCurrency(commission.amount)}</td>
                      <td className="p-4">{getStatusBadge(commission.status)}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          {commission.status !== 'paid' && commission.status !== 'cancelled' && (
                            <Select value={commission.status} onValueChange={v => handleStatusChange(commission, v as any)}>
                              <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder={commission.status} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
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

      {/* Add/Edit Commission Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-auto">
            <CardHeader>
              <CardTitle>{editingCommission ? 'Edit Commission' : 'Add Commission'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="network">Network *</Label>
                  <Select value={formData.network} onValueChange={v => setFormData({ ...formData, network: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select network" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="amazon">Amazon Associates</SelectItem>
                      <SelectItem value="flipkart">Flipkart Affiliate</SelectItem>
                      <SelectItem value="clickbank">ClickBank</SelectItem>
                      <SelectItem value="meesho">Meesho</SelectItem>
                      <SelectItem value="cuelinks">Cuelinks</SelectItem>
                      <SelectItem value="custom">Custom / Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={e => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="1000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={formData.currency} onValueChange={v => setFormData({ ...formData, currency: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">INR (₹)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sale_date">Sale Date *</Label>
                  <Input
                    id="sale_date"
                    type="date"
                    value={formData.sale_date}
                    onChange={e => setFormData({ ...formData, sale_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="link_id">Link ID (optional)</Label>
                  <Input
                    id="link_id"
                    value={formData.link_id}
                    onChange={e => setFormData({ ...formData, link_id: e.target.value })}
                    placeholder="Auto-filled if from link"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="product_id">Product ID (optional)</Label>
                  <Input
                    id="product_id"
                    value={formData.product_id}
                    onChange={e => setFormData({ ...formData, product_id: e.target.value })}
                    placeholder="Auto-filled if from product"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any notes about this commission"
                    rows={2}
                  />
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowModal(false); setEditingCommission(null); setFormData({ network: '', amount: '', currency: 'INR', status: 'pending', sale_date: new Date().toISOString().split('T')[0], link_id: '', product_id: '', notes: '' }); }}>
                Cancel
              </Button>
              <Button type="submit" form="earnings-form" disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingCommission ? 'Update' : 'Add')}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  )
}