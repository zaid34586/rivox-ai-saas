'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { 
  Wallet, 
  Loader2, 
  Plus, 
  Settings, 
  Trash2, 
  AlertTriangle,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { format } from 'date-fns'

interface BudgetTracking {
  id: string
  scope_type: string
  scope_id: string | null
  daily_budget: number
  weekly_budget: number
  monthly_budget: number
  spent_today: number
  spent_this_week: number
  spent_this_month: number
  pace_status: string
  projected_monthly_spend: number | null
}

const PACE_COLORS: Record<string, string> = {
  on_track: 'bg-green-100 text-green-700',
  under_pacing: 'bg-blue-100 text-blue-700',
  over_pacing: 'bg-amber-100 text-amber-700',
  exhausted: 'bg-red-100 text-red-700',
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<BudgetTracking[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingBudget, setEditingBudget] = useState<BudgetTracking | null>(null)
  const [formData, setFormData] = useState({
    scope_type: 'global',
    scope_id: '',
    daily_budget: 0,
    weekly_budget: 0,
    monthly_budget: 0,
    auto_pause_on_exhaust: true,
    auto_scale_on_roi: false,
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchBudgets()
  }, [])

  const fetchBudgets = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/optimizer/budgets')
      const data = await res.json()
      if (data.success) setBudgets(data.budgets)
    } catch (error) {
      console.error('Failed to fetch budgets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const url = editingBudget 
        ? `/api/optimizer/budgets?scope_type=${editingBudget.scope_type}&scope_id=${editingBudget.scope_id || ''}`
        : '/api/optimizer/budgets'
      const method = editingBudget ? 'PATCH' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (data.success) {
        setShowDialog(false)
        setEditingBudget(null)
        setFormData({
          scope_type: 'global',
          scope_id: '',
          daily_budget: 0,
          weekly_budget: 0,
          monthly_budget: 0,
          auto_pause_on_exhaust: true,
          auto_scale_on_roi: false,
        })
        // Refresh
        const res = await fetch('/api/optimizer/budgets')
        const data = await res.json()
        if (data.success) setBudgets(data.budgets)
      }
    } catch (error) {
      console.error('Failed to save budget:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this budget?')) return
    try {
      // Would need DELETE endpoint
      alert('Delete endpoint needed')
    } catch (error) {
      console.error('Failed to delete budget:', error)
    }
  }

  const handleEdit = (budget: BudgetTracking) => {
    setEditingBudget(budget)
    setFormData({
      scope_type: budget.scope_type,
      scope_id: budget.scope_id || '',
      daily_budget: budget.daily_budget,
      weekly_budget: budget.weekly_budget,
      monthly_budget: budget.monthly_budget,
      auto_pause_on_exhaust: true,
      auto_scale_on_roi: false,
    })
    setShowDialog(true)
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
            <Wallet className="h-6 w-6 text-primary" />
            Budget Tracking
          </h1>
          <p className="text-muted-foreground">Set and monitor daily, weekly, and monthly budgets</p>
        </div>
        <Button onClick={() => { setEditingBudget(null); setShowDialog(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Set Budget
        </Button>
      </div>

      {budgets.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="p-12 text-center">
            <Wallet className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No budgets set</h3>
            <p className="text-muted-foreground mb-6">Set daily, weekly, or monthly budgets to track spending and auto-pause campaigns.</p>
            <Button onClick={() => setShowDialog(true)} size="lg">
              <Plus className="mr-2 h-4 w-4" />
              Set Budget
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {budgets.map(budget => (
            <Card key={budget.id} className={cn('border-border/50', budget.pace_status === 'over_pacing' || budget.pace_status === 'exhausted' ? 'border-amber/30' : '')}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium">{budget.scope_type === 'global' ? 'Global Budget' : `${budget.scope_type}: ${budget.scope_id?.slice(0, 8)}`}</h4>
                      <Badge variant="secondary" className={PACE_COLORS[budget.pace_status]}>
                        {budget.pace_status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-4 mt-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Daily</p>
                        <p className="font-medium">{budget.daily_budget ? `₹${budget.daily_budget.toLocaleString()}` : '—'} / {budget.daily_budget ? `₹${budget.spent_today.toLocaleString()}` : '—'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Weekly</p>
                        <p className="font-medium">{budget.weekly_budget ? `₹${budget.weekly_budget.toLocaleString()}` : '—'} / {budget.weekly_budget ? `₹${budget.spent_this_week.toLocaleString()}` : '—'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Monthly</p>
                        <p className="font-medium">{budget.monthly_budget ? `₹${budget.monthly_budget.toLocaleString()}` : '—'} / {budget.monthly_budget ? `₹${budget.spent_this_month.toLocaleString()}` : '—'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Projected</p>
                        <p className="font-medium">{budget.projected_monthly_spend ? `₹${budget.projected_monthly_spend.toLocaleString()}` : '—'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(budget)}>
                      <Settings className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(budget.id)} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBudget ? 'Edit Budget' : 'Set New Budget'}</DialogTitle>
            <DialogDescription>Configure your spending limits and auto-pause rules</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="scope_type">Scope</Label>
                <Select value={formData.scope_type} onValueChange={v => setFormData({ ...formData, scope_type: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select scope" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global (All)</SelectItem>
                    <SelectItem value="product">Per Product</SelectItem>
                    <SelectItem value="link">Per Link</SelectItem>
                    <SelectItem value="campaign">Per Campaign</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="scope_id">Scope ID (optional)</Label>
                <Input
                  id="scope_id"
                  placeholder="Product/Link/Campaign ID"
                  value={formData.scope_id}
                  onChange={e => setFormData({ ...formData, scope_id: e.target.value })}
                  disabled={formData.scope_type === 'global'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="daily_budget">Daily Budget (₹)</Label>
                <Input
                  id="daily_budget"
                  type="number"
                  min="0"
                  step="100"
                  value={formData.daily_budget}
                  onChange={e => setFormData({ ...formData, daily_budget: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weekly_budget">Weekly Budget (₹)</Label>
                <Input
                  id="weekly_budget"
                  type="number"
                  min="0"
                  step="100"
                  value={formData.weekly_budget}
                  onChange={e => setFormData({ ...formData, weekly_budget: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthly_budget">Monthly Budget (₹)</Label>
                <Input
                  id="monthly_budget"
                  type="number"
                  min="0"
                  step="100"
                  value={formData.monthly_budget}
                  onChange={e => setFormData({ ...formData, monthly_budget: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="auto_pause_on_exhaust"
                  checked={formData.auto_pause_on_exhaust}
                  onChange={e => setFormData({ ...formData, auto_pause_on_exhaust: e.target.checked })}
                  className="h-4 w-4 rounded border-input bg-background text-primary focus:ring-2 focus:ring-ring"
                />
                <Label htmlFor="auto_pause_on_exhaust">Auto-pause when budget exhausted</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="auto_scale_on_roi"
                  checked={formData.auto_scale_on_roi}
                  onChange={e => setFormData({ ...formData, auto_scale_on_roi: e.target.checked })}
                  className="h-4 w-4 rounded border-input bg-background text-primary focus:ring-2 focus:ring-ring"
                />
                <Label htmlFor="auto_scale_on_roi">Auto-scale budget on positive ROI</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowDialog(false); setEditingBudget(null); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : (editingBudget ? 'Update' : 'Create')} Budget
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}