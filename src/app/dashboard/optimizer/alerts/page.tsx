'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { 
  Bell, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Filter,
  TrendingUp,
  Zap
} from 'lucide-react'
import { format } from 'date-fns'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'

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

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-blue-100 text-blue-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  new_high_gravity: 'New High Gravity',
  viral_product: 'Viral Product',
  seasonal_spike: 'Seasonal Spike',
  competitor_launch: 'Competitor Launch',
  platform_trend: 'Platform Trend',
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterRead, setFilterRead] = useState<'all' | 'read' | 'unread'>('all')
  const [filterType, setFilterType] = useState<string>('all')

  useEffect(() => {
    fetchAlerts()
  }, [])

  const fetchAlerts = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/optimizer/alerts?limit=50')
      const data = await res.json()
      if (data.success) setAlerts(data.alerts)
    } catch (error) {
      console.error('Failed to fetch alerts:', error)
    } finally {
      setLoading(false)
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

  const filteredAlerts = alerts
    .filter(a => filterRead === 'all' || (filterRead === 'read' ? a.is_read : !a.is_read))
    .filter(a => filterType === 'all' || a.alert_type === filterType)
    .filter(a => !a.is_dismissed)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const unreadCount = alerts.filter(a => !a.is_read && !a.is_dismissed).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            Trend Alerts
          </h1>
          <p className="text-muted-foreground">AI-detected trends and opportunities</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            handleMarkRead(alerts.filter(a => !a.is_read).map(a => a.id))
          }}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Mark All Read
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Select value={filterRead} onValueChange={(v) => setFilterRead(v as 'all' | 'read' | 'unread')}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All alerts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="read">Read</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={(v) => setFilterType(v as string)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="new_high_gravity">New High Gravity</SelectItem>
            <SelectItem value="viral_product">Viral Product</SelectItem>
            <SelectItem value="seasonal_spike">Seasonal Spike</SelectItem>
            <SelectItem value="competitor_launch">Competitor Launch</SelectItem>
            <SelectItem value="platform_trend">Platform Trend</SelectItem>
          </SelectContent>
        </Select>
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
          {alerts.filter(a => !a.is_dismissed)
            .filter(a => filterRead === 'all' || (filterRead === 'read' ? a.is_read : !a.is_read))
            .filter(a => filterType === 'all' || a.alert_type === filterType)
            .map(alert => (
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
    </div>
  )
}