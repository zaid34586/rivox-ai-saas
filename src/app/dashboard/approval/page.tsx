'use client'

import { PageSkeleton } from '@/components/ui/skeleton'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Sparkles, CheckCircle, XCircle, Eye, RotateCcw, Filter, RefreshCw, AlertTriangle, Clock, Zap, Gavel, ListChecks } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type ApprovalItem, type ApprovalRule, getStatusBadge } from '@/lib/approval'

export default function ApprovalPage() {
  const [items, setItems] = useState<ApprovalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'queue' | 'rules'>('queue')
  const [typeFilter, setTypeFilter] = useState<'all' | 'ad' | 'image' | 'video'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'auto_approved'>('all')
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [showRuleModal, setShowRuleModal] = useState(false)
  const [editingRule, setEditingRule] = useState<any>(null)
  const [ruleForm, setRuleForm] = useState({
    name: '',
    type: 'quality_threshold' as const,
    minQualityScore: 80,
    platforms: [] as string[],
    action: 'auto_approve' as const,
    priority: 1,
  })

  useEffect(() => {
    fetchQueue()
  }, [typeFilter, statusFilter])

  const fetchQueue = async () => {
    setLoading(true)
    let supabase: ReturnType<typeof createClient> | null = null
    try {
      supabase = createClient()
    } catch { setLoading(false); return }

    const params = new URLSearchParams()
    if (typeFilter !== 'all') params.set('type', typeFilter)
    if (statusFilter !== 'all') params.set('status', statusFilter)

    const res = await fetch(`/api/approval?${params.toString()}`)
    const data = await res.json()
    if (data.success) {
      setItems(data.items)
    }
    setLoading(false)
  }

  const handleSelectAll = () => {
    const filtered = getFilteredItems()
    if (selectedItems.length === filtered.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(filtered.map(i => i.id))
    }
  }

  const handleSelectItem = (id: string) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const handleBulkAction = async (action: 'approve' | 'reject' | 'request_revision') => {
    if (!selectedItems.length) return
    setProcessing('bulk')

    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, item_ids: selectedItems }),
    }
    const response = await fetch('/api/approval', options)

    const data = await response.json()
    setProcessing(null)
    setSelectedItems([])

    if (data.success) {
      alert(`${action}: ${data.processed} items processed`)
      fetchQueue()
    } else {
      alert('Failed to process bulk action')
    }
  }

  const handleSingleAction = async (item: ApprovalItem, action: 'approve' | 'reject' | 'request_revision') => {
    setProcessing(item.id)
    const response = await fetch('/api/approval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, item_ids: [item.id] }),
    })
    setProcessing(null)
    if (response.ok) {
      fetchQueue()
    }
  }

  const getFilteredItems = () => {
    return items.filter(item => {
      const typeMatch = typeFilter === 'all' || item.type === typeFilter
      const statusMatch = statusFilter === 'all' || item.status === statusFilter
      return typeMatch && statusMatch
    })
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ad': return <Sparkles className="h-4 w-4" />
      case 'image': return <Zap className="h-4 w-4" />
      case 'video': return <Clock className="h-4 w-4" />
      default: return <Sparkles className="h-4 w-4" />
    }
  }

  const getRuleActionBadge = (action: string) => {
    const styles: Record<string, string> = {
      auto_approve: 'bg-success-soft text-success-foreground',
      auto_reject: 'bg-error-soft text-error-foreground',
      require_review: 'bg-warning-soft text-warning-foreground',
      flag: 'bg-info-soft text-info-foreground',
    }
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[action] || styles.flag}`}>{action.replace('_', ' ')}</span>
  }

  if (loading) {
    return (
      <PageSkeleton />
    )
  }

  const filteredItems = items.filter(item => {
    const typeMatch = typeFilter === 'all' || item.type === typeFilter
    const statusMatch = statusFilter === 'all' || item.status === statusFilter
    return typeMatch && statusMatch
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gavel className="h-6 w-6 text-primary" />
            Approval Queue
          </h1>
          <p className="text-muted-foreground">Review and approve ads, images, and videos</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value: 'queue' | 'rules') => setActiveTab(value)}>
        <TabsList className="grid w-fit grid-cols-2">
          <TabsTrigger value="queue">
            <ListChecks className="mr-2 h-4 w-4" />
            Queue ({items.filter(i => {
              const typeMatch = typeFilter === 'all' || i.type === typeFilter
              const statusMatch = statusFilter === 'all' || i.status === statusFilter
              return typeMatch && statusMatch
            }).length})
          </TabsTrigger>
          <TabsTrigger value="rules">
            <Zap className="mr-2 h-4 w-4" />
            Auto-Rules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Select value={typeFilter} onValueChange={v => setTypeFilter(v as any)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="ad">Ads</SelectItem>
                    <SelectItem value="image">Images</SelectItem>
                    <SelectItem value="video">Videos</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending Review</SelectItem>
                    <SelectItem value="auto_approved">Auto-Approved</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2 ml-auto">
                  {selectedItems.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{selectedItems.length} selected</span>
                      <Button variant="outline" size="sm" onClick={() => handleBulkAction('approve')} disabled={processing === 'bulk'}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleBulkAction('reject')} disabled={processing === 'bulk'} className="text-error border-error hover:bg-error-soft">
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {items.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="p-12 text-center">
                <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No items in queue</h3>
                <p className="text-muted-foreground mb-4">Generate some ads, images, or videos to see them here</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="p-4 text-left">
                          <input type="checkbox" onChange={handleSelectAll} className="rounded border-input" />
                        </th>
                        <th className="p-4 text-left text-sm font-medium text-muted-foreground">Preview</th>
                        <th className="p-4 text-left text-sm font-medium text-muted-foreground">Content</th>
                        <th className="p-4 text-left text-sm font-medium text-muted-foreground">Type</th>
                        <th className="p-4 text-left text-sm font-medium text-muted-foreground">Score</th>
                        <th className="p-4 text-left text-sm font-medium text-muted-foreground">Status</th>
                        <th className="p-4 text-left text-sm font-medium text-muted-foreground">Created</th>
                        <th className="p-4 text-left text-sm font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.filter(item => {
                        const typeMatch = typeFilter === 'all' || item.type === typeFilter
                        const statusMatch = statusFilter === 'all' || item.status === statusFilter
                        return typeMatch && statusMatch
                      }).map(item => (
                        <tr key={item.id} className={`border-b border-border/50 hover:bg-muted/30 ${selectedItems.includes(item.id) ? 'bg-primary/5' : ''}`}>
                          <td className="p-4">
                            <input 
                              type="checkbox" 
                              checked={selectedItems.includes(item.id)} 
                              onChange={() => handleSelectItem(item.id)} 
                              className="rounded border-input"
                            />
                          </td>
                          <td className="p-4">
                            {item.preview_url && (
                              <img 
                                src={item.preview_url} 
                                alt={item.title} 
                                className="w-16 h-16 object-cover rounded-lg"
                              />
                            )}
                          </td>
                          <td className="p-4">
                            <p className="font-medium text-sm truncate max-w-[200px]">{item.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.metadata.product_name} • {item.metadata.platform} • {item.metadata.format || item.metadata.style || item.metadata.duration ? '—' : ''}
                            </p>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${item.type === 'ad' ? 'bg-muted text-muted-foreground' : item.type === 'image' ? 'bg-success-soft text-success-foreground' : 'bg-info-soft text-info-foreground'}`}>
                              {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={cn(
                              'px-2 py-0.5 rounded-full text-xs font-medium',
                              item.quality_score >= 80 ? 'bg-success-soft text-success-foreground' :
                              item.quality_score >= 60 ? 'bg-info-soft text-info-foreground' :
                              item.quality_score >= 40 ? 'bg-warning-soft text-warning-foreground' :
                              'bg-error-soft text-error-foreground'
                            )}>
                              {item.quality_score}/100
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.status === 'pending' ? 'bg-warning-soft text-warning-foreground' : item.status === 'approved' ? 'bg-success-soft text-success-foreground' : item.status === 'rejected' ? 'bg-error-soft text-error-foreground' : item.status === 'needs_revision' ? 'bg-info-soft text-info-foreground' : 'bg-muted text-muted-foreground'}`}>
                              {item.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {new Date(item.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleSingleAction(item, 'approve')} disabled={processing === item.id} title="Approve">
                                <CheckCircle className="h-4 w-4 text-success" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleSingleAction(item, 'reject')} disabled={processing === item.id} title="Reject" className="text-error hover:text-error">
                                <XCircle className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleSingleAction(item, 'request_revision')} disabled={processing === item.id} title="Request Revision" className="text-info hover:text-info">
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => window.open(item.preview_url, '_blank')} title="Preview">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
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

        <TabsContent value="rules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Auto-Approval Rules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-6">
                Configure rules to automatically approve, reject, or flag content based on quality score, platform, keywords, and more.
              </p>

              <div className="space-y-4">
                {[
                  { name: 'High Quality Auto-Approve', type: 'quality_threshold', conditions: { min_quality_score: 85 }, action: 'auto_approve', priority: 1, is_active: true },
                  { name: 'Low Quality Flag', type: 'quality_threshold', conditions: { min_quality_score: 0 }, action: 'flag', priority: 2, is_active: true },
                  { name: 'TikTok/Reels Require Review', type: 'platform_specific', conditions: { platforms: ['tiktok', 'instagram'] }, action: 'require_review', priority: 3, is_active: true },
                  { name: 'Blocked Keywords Check', type: 'content_type', conditions: { keywords_blocked: ['guaranteed', 'miracle', 'overnight', 'scam', 'fake', '100% risk-free'] }, action: 'auto_reject', priority: 1, is_active: true },
                ].map((rule, index) => (
                  <Card key={index} className="border-border/50">
                    <CardContent className="pt-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Zap className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{rule.name}</h4>
                            <p className="text-sm text-muted-foreground">{rule.type.replace('_', ' ')}</p>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>Priority: {rule.priority}</span>
                            <span>•</span>
                            <span>{rule.is_active ? 'Active' : 'Inactive'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${rule.action === 'auto_approve' ? 'bg-success-soft text-success-foreground' : rule.action === 'auto_reject' ? 'bg-error-soft text-error-foreground' : rule.action === 'require_review' ? 'bg-warning-soft text-warning-foreground' : 'bg-info-soft text-info-foreground'}`}>
                            {rule.action.replace('_', ' ')}
                          </span>
                          <Button variant="outline" size="sm" onClick={() => { setEditingRule(rule); setShowRuleModal(true); }}>
                            Edit
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 p-3 bg-muted/50 rounded-lg text-sm">
                        <strong>Conditions:</strong>{' '}
                        {rule.conditions.min_quality_score !== undefined && (
                          <span className="mx-2">Min Score: {rule.conditions.min_quality_score}</span>
                        )}
                        {rule.conditions.platforms && rule.conditions.platforms.length > 0 && (
                          <span className="mx-2">Platforms: {rule.conditions.platforms.join(', ')}</span>
                        )}
                        {rule.conditions.keywords_blocked && rule.conditions.keywords_blocked.length > 0 && (
                          <span className="mx-2">Blocked: {rule.conditions.keywords_blocked.join(', ')}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Button onClick={() => { setEditingRule(null); setRuleForm({ name: '', type: 'quality_threshold', minQualityScore: 80, platforms: [], action: 'auto_approve', priority: 5 }); setShowRuleModal(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Add New Rule
              </Button>
            </CardContent>
          </Card>

          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                How Auto-Approval Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-success-soft flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-success" />
                </div>
                <p className="text-sm text-muted-foreground"><strong>Auto-Approve:</strong> Content matching rules is approved instantly and moves to "Ready to Publish"</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-warning-soft flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                </div>
                <p className="text-sm text-muted-foreground"><strong>Flag for Review:</strong> Content meets criteria but needs human check (e.g., TikTok/Reels)</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-error-soft flex items-center justify-center">
                  <XCircle className="h-4 w-4 text-error" />
                </div>
                <p className="text-sm text-muted-foreground"><strong>Auto-Reject:</strong> Blocked keywords (guaranteed, miracle, scam, etc.) are rejected immediately</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground"><strong>Auto-Approved badge:</strong> Shows in queue with purple badge — you can still override</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{editingRule ? 'Edit Rule' : 'Create New Rule'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={(e) => { e.preventDefault(); setShowRuleModal(false); }}>
                <div className="space-y-2">
                  <Label>Rule Name</Label>
                  <Input value={ruleForm.name} onChange={e => setRuleForm({...ruleForm, name: e.target.value})} placeholder="High Quality Auto-Approve" />
                </div>
                <div className="space-y-2">
                  <Label>Rule Type</Label>
                  <Select value={ruleForm.type} onValueChange={v => setRuleForm({...ruleForm, type: v as any})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quality_threshold">Quality Threshold</SelectItem>
                      <SelectItem value="platform_specific">Platform Specific</SelectItem>
                      <SelectItem value="content_type">Content/Keywords</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Min Quality Score (0-100)</Label>
                  <Input type="number" min="0" max="100" value={ruleForm.minQualityScore} onChange={e => setRuleForm({...ruleForm, minQualityScore: parseInt(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label>Action</Label>
                  <Select value={ruleForm.action} onValueChange={v => setRuleForm({...ruleForm, action: v as any})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto_approve">Auto Approve</SelectItem>
                      <SelectItem value="auto_reject">Auto Reject</SelectItem>
                      <SelectItem value="require_review">Require Review</SelectItem>
                      <SelectItem value="flag">Flag for Review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority (lower = runs first)</Label>
                  <Input type="number" value={ruleForm.priority} onChange={e => setRuleForm({...ruleForm, priority: parseInt(e.target.value)})} />
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowRuleModal(false); setEditingRule(null); }}>Cancel</Button>
              <Button onClick={() => { setShowRuleModal(false); setEditingRule(null); }}>Save Rule</Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  )
}