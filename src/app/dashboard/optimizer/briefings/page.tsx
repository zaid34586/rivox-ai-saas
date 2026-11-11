'use client'

import { PageSkeleton } from '@/components/ui/skeleton'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { 
  Brain, 
  Loader2, 
  TrendingUp, 
  Target, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  ArrowRight,
  Plus
} from 'lucide-react'
import { format, isToday, isYesterday } from 'date-fns'

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

export default function BriefingsPage() {
  const [briefings, setBriefings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetchBriefings()
  }, [])

  const fetchBriefings = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/optimizer/briefings?limit=30')
      const data = await res.json()
      if (data.success) setBriefings(data.briefings)
    } catch (error) {
      console.error('Failed to fetch briefings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/optimizer/briefings', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        fetchBriefings()
      }
    } catch (error) {
      console.error('Failed to generate briefing:', error)
    } finally {
      setGenerating(false)
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
            <Brain className="h-6 w-6 text-primary" />
            Daily AI Briefings
          </h1>
          <p className="text-muted-foreground">AI-generated daily mission briefings with insights and recommendations</p>
        </div>
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Brain className="mr-2 h-4 w-4" />
              Generate Briefing
            </>
          )}
        </Button>
      </div>

      {briefings.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="p-12 text-center">
            <Brain className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No briefings yet</h3>
            <p className="text-muted-foreground mb-6">Generate your first AI mission briefing to get daily insights.</p>
            <Button onClick={async () => {
              const res = await fetch('/api/optimizer/briefings', { method: 'POST' })
              if (res.ok) window.location.reload()
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
                      <div className="text-sm mb-2">
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
                      <Button variant="ghost" size="sm" onClick={() => {
                        // Would need API to mark as read
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
    </div>
  )
}