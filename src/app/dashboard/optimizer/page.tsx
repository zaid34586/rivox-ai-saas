'use client'

import { PageSkeleton } from '@/components/ui/skeleton'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { Zap, Target, BarChart3, Bell, Wallet, Plus, Shield, AlertTriangle, TrendingUp, TrendingDown, Clock, Brain, Settings, ArrowRight, CheckCircle, XCircle, Zap as ZapIcon } from 'lucide-react'
import { format, isToday, isYesterday } from 'date-fns'

interface OptimizerRule {
  id: string
  name: string
  description: string | null
  is_active: boolean
  trigger_type: string
  trigger_value: number
  trigger_operator: string
  action_type: string
  priority: number
  trigger_count: number
  last_triggered_at: string | null
  created_at: string
  evaluation_window_hours: number
}

interface OptimizerAction {
  id: string
  rule_id: string
  trigger_type: string
  actual_value: number
  action_type: string
  status: string
  result_message: string | null
  created_at: string
  rule?: {
    name: string
    trigger_type: string
    action_type: string
  }
}

interface DailyBriefing {
  id: string
  briefing_date: string
  executive_summary: string
  top_performers: any[]
  underperformers: any[]
  alerts: any[]
  recommendations: any[]
  is_read: boolean
  generated_at: string
}

interface TrendAlert {
  id: string
  alert_type: string
  severity: string
  title: string
  description: string
  source_platform: string | null
  is_read: boolean
  is_dismissed: boolean
  created_at: string
}

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

const TRIGGER_LABELS: Record<string, string> = {
  clicks_no_sales: 'Clicks No Sales',
  epc_below: 'EPC Below',
  roi_below: 'ROI Below',
  daily_budget: 'Daily Budget',
  conversion_rate: 'Conversion Rate',
}

const ACTION_LABELS: Record<string, string> = {
  pause_link: 'Pause Link',
  pause_product: 'Pause Product',
  scale_budget: 'Scale Budget',
  create_lookalike: 'Create Lookalike',
  notify_only: 'Notify Only',
}

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-info-soft text-info-foreground',
  medium: 'bg-warning-soft text-warning-foreground',
  high: 'bg-warning-soft text-warning-foreground',
  critical: 'bg-error-soft text-error-foreground',
}

const PACE_COLORS: Record<string, string> = {
  on_track: 'bg-success-soft text-success-foreground',
  under_pacing: 'bg-info-soft text-info-foreground',
  over_pacing: 'bg-warning-soft text-warning-foreground',
  exhausted: 'bg-error-soft text-error-foreground',
}

export default function OptimizerPage() {
  const [rules, setRules] = useState<OptimizerRule[]>([])
  const [actions, setActions] = useState<OptimizerAction[]>([])
  const [briefings, setBriefings] = useState<DailyBriefing[]>([])
  const [alerts, setAlerts] = useState<TrendAlert[]>([])
  const [budgets, setBudgets] = useState<BudgetTracking[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'rules' | 'actions' | 'briefings' | 'alerts' | 'budgets'>('overview')

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [rulesRes, actionsRes, briefingsRes, alertsRes, budgetsRes] = await Promise.all([
        fetch('/api/optimizer/rules').then(r => r.json()),
        fetch('/api/optimizer/actions?limit=20').then(r => r.json()),
        fetch('/api/optimizer/briefings?limit=10').then(r => r.json()),
        fetch('/api/optimizer/alerts?limit=20').then(r => r.json()),
        fetch('/api/optimizer/budgets').then(r => r.json()),
      ])
      if (rulesRes.success) setRules(rulesRes.rules)
      if (actionsRes.success) setActions(actionsRes.actions)
      if (briefingsRes.success) setBriefings(briefingsRes.briefings)
      if (alertsRes.success) setAlerts(alertsRes.alerts)
      if (budgetsRes.success) setBudgets(budgetsRes.budgets)
    } catch (error) {
      console.error('Failed to fetch optimizer data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRuleToggle = async (rule: OptimizerRule) => {
    try {
      const res = await fetch(`/api/optimizer/rules/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !rule.is_active }),
      })
      if (res.ok) {
        setRules(rules.map(r => r.id === rule.id ? { ...r, is_active: !r.is_active } : r))
      }
    } catch (error) {
      console.error('Failed to toggle rule:', error)
    }
  }

  const handleMarkRead = async (alertIds: string[]) => {
    try {
      await fetch('/api/optimizer/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: alertIds, is_read: true }),
      })
      setAlerts(alerts.map(a => alertIds.includes(a.id) ? { ...a, is_read: true } : a))
    } catch (error) {
      console.error('Failed to mark read:', error)
    }
  }

  const handleDismiss = async (alertIds: string[]) => {
    try {
      await fetch('/api/optimizer/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: alertIds, is_dismissed: true }),
      })
      setAlerts(alerts.map(a => alertIds.includes(a.id) ? { ...a, is_dismissed: true } : a))
    } catch (error) {
      console.error('Failed to dismiss:', error)
    }
  }

  if (loading) {
    return (
      <PageSkeleton />
    )
  }

  const activeRules = rules.filter(r => r.is_active).length
  const unreadAlerts = alerts.filter(a => !a.is_read && !a.is_dismissed).length
  const todayBriefing = briefings.find(b => isToday(new Date(b.briefing_date)))
  const overPacingBudgets = budgets.filter(b => b.pace_status === 'over_pacing' || b.pace_status === 'exhausted').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            AI Optimizer
          </h1>
          <p className="text-muted-foreground">Auto-pause losers, scale winners, daily briefings, and trend alerts</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/optimizer/rules/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Rule
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Rules</CardTitle>
            <ZapIcon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeRules}</div>
            <p className="text-xs text-muted-foreground">{rules.length} total rules</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Actions (24h)</CardTitle>
            <Target className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{actions.length}</div>
            <p className="text-xs text-muted-foreground">Auto-executed actions</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unread Alerts</CardTitle>
            <Bell className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unreadAlerts}</div>
            <p className="text-xs text-muted-foreground">{alerts.length} total alerts</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Budget Status</CardTitle>
            <Wallet className="h-4 w-4 text-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overPacingBudgets > 0 ? overPacingBudgets : 'OK'}</div>
            <p className="text-xs text-muted-foreground">
              {overPacingBudgets > 0 ? `${overPacingBudgets} over pace` : 'All on track'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'overview' | 'rules' | 'actions' | 'briefings' | 'alerts' | 'budgets')} className="space-y-6">
        <TabsList className="grid w-fit grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="briefings">Briefings</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          {/* Today's Briefing */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Today's AI Briefing
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayBriefing ? (
                <div className="space-y-4">
                  <p className="text-muted-foreground">{todayBriefing.executive_summary}</p>
                  
                  {(todayBriefing.top_performers?.length || 0) > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-success" />
                        Top Performers
                      </h4>
                      <ul className="space-y-1">
                        {todayBriefing.top_performers.slice(0, 3).map((p: any, i: number) => (
                          <li key={i} className="text-sm flex items-center gap-2">
                            <span className="font-medium">{p.product_name || p.name}</span>
                            <span className="text-muted-foreground">{p.epc ? `EPC: ${p.epc}` : ''} {p.roi ? `ROI: ${p.roi}%` : ''}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(todayBriefing.recommendations?.length || 0) > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        AI Recommendations
                      </h4>
                      <ul className="space-y-1">
                        {todayBriefing.recommendations.slice(0, 3).map((r: any, i: number) => (
                          <li key={i} className="text-sm text-muted-foreground">• {r.reason || r.action}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Brain className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No briefing for today</h3>
                  <p className="text-muted-foreground mb-4">Generate your daily AI mission briefing</p>
                  <Button onClick={async () => {
                    const res = await fetch('/api/optimizer/briefings', { method: 'POST' })
                    if (res.ok) fetchAll()
                  }}>
                    <Brain className="mr-2 h-4 w-4" />
                    Generate Briefing
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Alerts */}
          {unreadAlerts > 0 && (
            <Card className="border-border/50 border-destructive/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Active Alerts ({unreadAlerts})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {alerts.filter(a => !a.is_read && !a.is_dismissed).slice(0, 5).map(alert => (
                    <div key={alert.id} className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className={SEVERITY_COLORS[alert.severity]}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                        <div>
                          <p className="font-medium">{alert.title}</p>
                          <p className="text-sm text-muted-foreground">{alert.description}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleMarkRead([alert.id])}>
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDismiss([alert.id])}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button variant="link" onClick={() => setActiveTab('alerts')}>
                    View all alerts →
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Budget Warnings */}
          {overPacingBudgets > 0 && (
            <Card className="border-border/50 border-warning/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  Budget Warnings ({overPacingBudgets})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {budgets.filter(b => b.pace_status === 'over_pacing' || b.pace_status === 'exhausted').map(budget => (
                    <div key={budget.id} className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/20">
                      <div>
                        <p className="font-medium">{budget.scope_type === 'global' ? 'Global Budget' : `${budget.scope_type}: ${budget.scope_id}`}</p>
                        <p className="text-sm text-muted-foreground">
                          Spent: {budget.monthly_budget ? `${budget.spent_this_month}/${budget.monthly_budget}` : 'N/A'} 
                          (Projected: {budget.projected_monthly_spend?.toFixed(2) || 'N/A'})
                        </p>
                      </div>
                      <Badge className={PACE_COLORS[budget.pace_status]}>{budget.pace_status.replace('_', ' ')}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <Button variant="outline" asChild onClick={() => setActiveTab('rules')}>
                <Link href="/dashboard/optimizer/rules/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Optimizer Rule
                </Link>
              </Button>
              <Button variant="outline" asChild onClick={() => setActiveTab('briefings')}>
                <Link href="/dashboard/optimizer/briefings">
                  <Brain className="mr-2 h-4 w-4" />
                  Generate Daily Briefing
                </Link>
              </Button>
              <Button variant="outline" asChild onClick={() => setActiveTab('alerts')}>
                <Link href="/dashboard/optimizer/alerts">
                  <Bell className="mr-2 h-4 w-4" />
                  Manage Alerts
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RULES TAB */}
        <TabsContent value="rules" className="space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle>Optimizer Rules</CardTitle>
            <Button asChild>
              <Link href="/dashboard/optimizer/rules/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Rule
              </Link>
            </Button>
          </div>

          {rules.length === 0 ? (
            <Card className="border-border/50 border-dashed">
              <CardContent className="p-12 text-center">
                <ZapIcon className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No optimizer rules yet</h3>
                <p className="text-muted-foreground mb-6">Create rules to auto-pause losers, scale winners, and manage budgets automatically.</p>
                <Button asChild>
                  <Link href="/dashboard/optimizer/rules/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Rule
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {rules.map(rule => (
                <Card key={rule.id} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h4 className="font-medium truncate">{rule.name}</h4>
                          <Badge variant="secondary" className={rule.is_active ? 'bg-success-soft text-success-foreground' : 'bg-muted text-muted-foreground'}>
                            {rule.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge variant="outline">{TRIGGER_LABELS[rule.trigger_type] || rule.trigger_type}</Badge>
                          <Badge variant="outline">{ACTION_LABELS[rule.action_type] || rule.action_type}</Badge>
                        </div>
                        {rule.description && <p className="text-sm text-muted-foreground mt-1">{rule.description}</p>}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Trigger: {rule.trigger_operator} {rule.trigger_value} ({rule.evaluation_window_hours}h window)</span>
                          <span>Action: {ACTION_LABELS[rule.action_type] || rule.action_type}</span>
                          <span>Priority: {rule.priority}</span>
                          <span>Triggered: {rule.trigger_count}x</span>
                          {rule.last_triggered_at && <span>Last: {format(new Date(rule.last_triggered_at), 'MMM d, yyyy')}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRuleToggle(rule)}
                          className={rule.is_active ? 'text-success' : ''}
                        >
                          <Shield className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/dashboard/optimizer/rules/${rule.id}`}>
                            <Settings className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ACTIONS TAB */}
        <TabsContent value="actions" className="space-y-4">
          <CardTitle>Recent Optimizer Actions</CardTitle>

          {actions.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="p-12 text-center">
                <Target className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No actions yet</h3>
                <p className="text-muted-foreground">Automated actions will appear here when rules trigger.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left p-4 font-medium text-muted-foreground">Rule</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Trigger</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Action</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {actions.map(action => (
                        <tr key={action.id} className="border-b border-border/50">
                          <td className="p-4">
                            <p className="font-medium">{action.rule?.name || 'Unknown'}</p>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {TRIGGER_LABELS[action.trigger_type] || action.trigger_type}: {action.actual_value}
                          </td>
                          <td className="p-4">
                            <Badge variant="secondary">{ACTION_LABELS[action.action_type] || action.action_type}</Badge>
                          </td>
                          <td className="p-4">
                            <Badge variant={action.status === 'executed' ? 'default' : action.status === 'failed' ? 'destructive' : 'secondary'}>
                              {action.status}
                            </Badge>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {format(new Date(action.created_at), 'MMM d, HH:mm')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* BRIEFINGS TAB */}
        <TabsContent value="briefings" className="space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle>Daily AI Briefings</CardTitle>
            <Button onClick={async () => {
              const res = await fetch('/api/optimizer/briefings', { method: 'POST' })
              if (res.ok) fetchAll()
            }}>
              <Brain className="mr-2 h-4 w-4" />
              Generate Briefing
            </Button>
          </div>

          {briefings.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="p-12 text-center">
                <Brain className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No briefings yet</h3>
                <p className="text-muted-foreground mb-6">Generate your first AI mission briefing to get daily insights.</p>
                <Button onClick={async () => {
                  const res = await fetch('/api/optimizer/briefings', { method: 'POST' })
                  if (res.ok) fetchAll()
                }}>
                  <Brain className="mr-2 h-4 w-4" />
                  Generate Briefing
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {briefings.map(briefing => (
                <Card key={briefing.id} className={cn('border-border/50', briefing.is_read ? '' : 'border-primary/30')}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={cn('font-medium', isToday(new Date(briefing.briefing_date)) ? 'text-primary' : '')}>
                            {isToday(new Date(briefing.briefing_date)) ? 'Today' : isYesterday(new Date(briefing.briefing_date)) ? 'Yesterday' : format(new Date(briefing.briefing_date), 'MMM d, yyyy')}
                          </span>
                          <span className="text-sm text-muted-foreground">Generated: {format(new Date(briefing.generated_at), 'HH:mm')}</span>
                          {!briefing.is_read && <Badge variant="secondary" className="bg-primary/10 text-primary">Unread</Badge>}
                        </div>
                        <p className="text-muted-foreground mb-3">{briefing.executive_summary}</p>
                        
                        {(briefing.top_performers?.length || 0) > 0 && (
                          <div className="text-sm">
                            <span className="font-medium text-success">Top: </span>
                            {briefing.top_performers.slice(0, 2).map((p: any, i: number) => (
                              <span key={i} className="mr-3">{p.product_name || p.name} (EPC: {p.epc}, ROI: {p.roi}%)</span>
                            ))}
                          </div>
                        )}
                        
                        {(briefing.recommendations?.length || 0) > 0 && (
                          <div className="text-sm mt-2">
                            <span className="font-medium text-primary">AI Recommends: </span>
                            {briefing.recommendations.slice(0, 2).map((r: any, i: number) => (
                              <span key={i} className="mr-3">{r.reason || r.action}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {!briefing.is_read && (
                          <Button variant="ghost" size="sm" onClick={async () => {
                            // Mark as read would need an API endpoint
                            setBriefings(briefings.map(b => b.id === briefing.id ? { ...b, is_read: true } : b))
                          }}>
                            Mark Read
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ALERTS TAB */}
        <TabsContent value="alerts" className="space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle>Trend Alerts</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleMarkRead(alerts.filter(a => !a.is_read).map(a => a.id))}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Mark All Read
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDismiss(alerts.filter(a => !a.is_dismissed).map(a => a.id))}>
                <XCircle className="mr-2 h-4 w-4" />
                Dismiss All
              </Button>
            </div>
          </div>

          {alerts.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="p-12 text-center">
                <Bell className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No alerts</h3>
                <p className="text-muted-foreground">Trend alerts will appear here when new opportunities are detected.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {alerts.filter(a => !a.is_dismissed).map(alert => (
                <Card key={alert.id} className={cn('border-border/50', alert.is_read ? '' : 'border-primary/30')}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className={SEVERITY_COLORS[alert.severity]}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">{alert.alert_type.replace('_', ' ')}</Badge>
                          {alert.source_platform && <Badge variant="outline">{alert.source_platform}</Badge>}
                          <span className="text-xs text-muted-foreground ml-auto">
                            {format(new Date(alert.created_at), 'MMM d, HH:mm')}
                          </span>
                        </div>
                        <h4 className="font-medium mb-1">{alert.title}</h4>
                        <p className="text-sm text-muted-foreground">{alert.description}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {!alert.is_read && (
                          <Button variant="ghost" size="icon" onClick={() => handleMarkRead([alert.id])} title="Mark read">
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleDismiss([alert.id])} title="Dismiss">
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* BUDGETS TAB */}
        <TabsContent value="budgets" className="space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle>Budget Tracking</CardTitle>
            <Button asChild>
              <Link href="/dashboard/optimizer/budgets">
                <Plus className="mr-2 h-4 w-4" />
                Set Budget
              </Link>
            </Button>
          </div>

          {budgets.length === 0 ? (
            <Card className="border-border/50 border-dashed">
              <CardContent className="p-12 text-center">
                <Wallet className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No budgets set</h3>
                <p className="text-muted-foreground mb-6">Set daily, weekly, or monthly budgets to track spending and auto-pause campaigns.</p>
                <Button asChild>
                  <Link href="/dashboard/optimizer/budgets">
                    <Plus className="mr-2 h-4 w-4" />
                    Set Budget
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {budgets.map(budget => (
                <Card key={budget.id} className={cn('border-border/50', budget.pace_status === 'over_pacing' || budget.pace_status === 'exhausted' ? 'border-warning/30' : '')}>
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
                        <Button variant="ghost" size="sm" asChild>
                          <Link href="/dashboard/optimizer/budgets">
                            <Settings className="mr-2 h-4 w-4" />
                            Manage
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}