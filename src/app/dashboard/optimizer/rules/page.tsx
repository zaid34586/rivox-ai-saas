'use client'

import { PageSkeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Plus, Shield, Edit, Trash2, Zap } from 'lucide-react'
interface OptimizerRule {
  id: string
  name: string
  description: string | null
  is_active: boolean
  trigger_type: string
  trigger_value: number
  trigger_operator: string
  action_type: string
  action_params: Record<string, any>
  cooldown_hours: number
  priority: number
  evaluation_window_hours: number
  trigger_count: number
  last_triggered_at: string | null
  created_at: string
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

export default function RulesPage() {
  const [rules, setRules] = useState<OptimizerRule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRules()
  }, [])

  const fetchRules = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/optimizer/rules')
      const data = await res.json()
      if (data.success) setRules(data.rules)
    } catch (error) {
      console.error('Failed to fetch rules:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (rule: OptimizerRule) => {
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

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this rule?')) return
    try {
      const res = await fetch(`/api/optimizer/rules/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setRules(rules.filter(r => r.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete rule:', error)
    }
  }

  if (loading) {
    return (
      <PageSkeleton />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Optimizer Rules
          </h1>
          <p className="text-muted-foreground">Manage automated optimization rules</p>
        </div>
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
            <Zap className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No rules yet</h3>
            <p className="text-muted-foreground mb-6">Create your first optimization rule to start automating.</p>
            <Button asChild>
              <Link href="/dashboard/optimizer/rules/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Rule
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
                      <Badge variant={rule.is_active ? 'default' : 'secondary'} className={rule.is_active ? 'bg-success-soft text-success-foreground' : 'bg-muted text-muted-foreground'}>
                        {rule.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="outline">Trigger: {rule.trigger_operator} {rule.trigger_value}</Badge>
                      <Badge variant="outline">{rule.action_type}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-4">
                      <span>Window: {rule.evaluation_window_hours}h</span>
                      <span>Cooldown: {rule.cooldown_hours}h</span>
                      <span>Priority: {rule.priority}</span>
                      <span>Triggered: {rule.trigger_count}x</span>
                      {rule.last_triggered_at && <span>Last: {new Date(rule.last_triggered_at).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggle(rule)}
                    >
                      <Shield className={cn('h-4 w-4', rule.is_active ? 'text-success' : '')} />
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/dashboard/optimizer/rules/${rule.id}`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(rule.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}