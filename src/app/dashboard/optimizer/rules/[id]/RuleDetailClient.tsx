'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, ArrowLeft, Save, Shield, Trash2, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

const TRIGGER_TYPES = [
  { value: 'clicks_no_sales', label: 'Clicks No Sales' },
  { value: 'epc_below', label: 'EPC Below' },
  { value: 'roi_below', label: 'ROI Below' },
  { value: 'daily_budget', label: 'Daily Budget Exceeded' },
  { value: 'conversion_rate', label: 'Conversion Rate Below' },
] as const

const ACTION_TYPES = [
  { value: 'pause_link', label: 'Pause Link' },
  { value: 'pause_product', label: 'Pause Product' },
  { value: 'scale_budget', label: 'Scale Budget' },
  { value: 'create_lookalike', label: 'Create Lookalike' },
  { value: 'notify_only', label: 'Notify Only' },
] as const

const OPERATORS = [
  { value: '>=', label: '>=' },
  { value: '<=', label: '<=' },
  { value: '>', label: '>' },
  { value: '<', label: '<' },
  { value: '=', label: '=' },
] as const

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

interface RuleDetailClientProps {
  initialRule: OptimizerRule
  ruleId: string
}

export default function RuleDetailClient({ initialRule, ruleId }: RuleDetailClientProps) {
  const [rule, setRule] = useState<OptimizerRule>(initialRule)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState<{
    name: string
    description: string
    trigger_type: string
    trigger_value: number
    trigger_operator: string
    evaluation_window_hours: number
    action_type: string
    action_params: Record<string, any>
    cooldown_hours: number
    priority: number
  }>({
    name: '',
    description: '',
    trigger_type: 'clicks_no_sales',
    trigger_value: 100,
    trigger_operator: '>=',
    evaluation_window_hours: 24,
    action_type: 'pause_link',
    action_params: {},
    cooldown_hours: 24,
    priority: 100,
  })

  useEffect(() => {
    if (initialRule) {
      setRule(initialRule)
      setFormData({
        name: initialRule.name,
        description: initialRule.description || '',
        trigger_type: initialRule.trigger_type,
        trigger_value: initialRule.trigger_value,
        trigger_operator: initialRule.trigger_operator,
        evaluation_window_hours: initialRule.evaluation_window_hours,
        action_type: initialRule.action_type,
        action_params: initialRule.action_params || {},
        cooldown_hours: initialRule.cooldown_hours,
        priority: initialRule.priority,
      })
    }
  }, [initialRule])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    
    if (!formData.name.trim()) setErrors({ name: 'Name is required' })
    if (!formData.trigger_value || formData.trigger_value <= 0) setErrors({ trigger_value: 'Valid trigger value required' })
    if (!formData.action_type) setErrors({ action_type: 'Action type required' })
    
    if (Object.keys(errors).length > 0) return

    setSaving(true)
    try {
      const res = await fetch(`/api/optimizer/rules/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (data.success) {
        // Refresh the rule data
        const refreshRes = await fetch(`/api/optimizer/rules/${ruleId}`)
        const refreshData = await refreshRes.json()
        if (refreshData.success) {
          setRule(refreshData.rule)
        }
      } else {
        setErrors({ submit: data.error || 'Failed to update rule' })
      }
    } catch (error) {
      setErrors({ submit: 'Failed to update rule' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this rule permanently?')) return
    try {
      const res = await fetch(`/api/optimizer/rules/${ruleId}`, { method: 'DELETE' })
      if (res.ok) {
        window.location.href = '/dashboard/optimizer/rules'
      }
    } catch (error) {
      console.error('Failed to delete rule:', error)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            {rule?.name || 'Loading...'}
          </h1>
          <p className="text-muted-foreground">Edit optimizer rule</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Name and describe your optimization rule</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Rule Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Pause links with 100 clicks and no sales"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What does this rule do? When should it trigger?"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Trigger Conditions</CardTitle>
            <CardDescription>When should this rule fire?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Trigger Type *</Label>
                <Select value={formData.trigger_type} onValueChange={v => setFormData({ ...formData, trigger_type: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select trigger" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGER_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Operator *</Label>
                <Select value={formData.trigger_operator} onValueChange={v => setFormData({ ...formData, trigger_operator: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select operator" />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATORS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="trigger_value">Trigger Value *</Label>
                <Input
                  id="trigger_value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.trigger_value}
                  onChange={e => setFormData({ ...formData, trigger_value: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="evaluation_window_hours">Evaluation Window (hours)</Label>
                <Input
                  id="evaluation_window_hours"
                  type="number"
                  min="1"
                  max="168"
                  value={formData.evaluation_window_hours}
                  onChange={e => setFormData({ ...formData, evaluation_window_hours: parseInt(e.target.value) || 24 })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Action to Take</CardTitle>
            <CardDescription>What should happen when triggered?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Action Type *</Label>
              <Select value={formData.action_type} onValueChange={v => setFormData({ ...formData, action_type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map(a => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.action_type === 'scale_budget' && (
              <div className="space-y-2">
                <Label>Budget Increase %</Label>
                <Input
                  type="number"
                  min="1"
                  max="500"
                  placeholder="50"
                  value={formData.action_params?.budget_increase_pct || 50}
                  onChange={e => setFormData({ 
                    ...formData, 
                    action_params: { ...formData.action_params, budget_increase_pct: parseInt(e.target.value) || 50 } 
                  })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="cooldown_hours">Cooldown Period (hours)</Label>
              <Input
                id="cooldown_hours"
                type="number"
                min="1"
                max="168"
                value={formData.cooldown_hours}
                onChange={e => setFormData({ ...formData, cooldown_hours: parseInt(e.target.value) || 24 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority (lower = higher priority)</Label>
              <Input
                id="priority"
                type="number"
                min="1"
                max="1000"
                value={formData.priority}
                onChange={e => setFormData({ ...formData, priority: parseInt(e.target.value) || 100 })}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Shield className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>Irreversible action. The rule will be permanently deleted.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Rule
            </Button>
          </CardContent>
        </Card>

        {errors.submit && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {errors.submit}
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button type="submit" className="flex-1" size="lg" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}