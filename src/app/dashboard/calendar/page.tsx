'use client'

import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isToday, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, CheckCircle, AlertCircle, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'

interface ScheduledPost {
  id: string
  creative_id: string
  platform: string
  account_id: string | null
  caption: string
  media_urls: string[]
  scheduled_at: string
  published_at: string | null
  status: string
  platform_post_id: string | null
  error_message: string | null
  creative: {
    id: string
    headline: string
    body: string
    image_url: string | null
    video_url: string | null
    platform: string
    format: string
    product: {
      name: string
      image_url: string | null
    }
  }
  account: {
    platform: string
    account_name: string
  } | null
}

const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500',
  youtube: 'bg-red-600',
  pinterest: 'bg-red-500',
  x: 'bg-sky-500',
  facebook: 'bg-blue-600',
  tiktok: 'bg-pink-500',
}

const PLATFORM_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>,
  youtube: ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
  pinterest: ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.627 0-12 5.372-12 12 0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146 1.124.347 2.317.535 3.554.535 6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/></svg>,
  x: ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 9.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  facebook: ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  tiktok: ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12.545,0c-1.346,0-2.484,1.365-2.226,2.708c0,0,1.14,4.294,1.5,5.102c.288,.644,0,1.593,0,1.593c.686,3.718,3.981,7.231,8.13,7.489c.118,0,.236,0,.353,0c.057-.234,.09-.469,.11-.704c.08-1.063.123-1.583.123-1.583s-2.826-5.481-3.144-9.134c-.295-3.379-2.108-6.107-4.532-6.107c-.129,0-.259,0-.387,0C12.792.105,12.662,0,12.545,0z"/></svg>,
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [posts, setPosts] = useState<ScheduledPost[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null)

  useEffect(() => {
    fetchPosts()
  }, [currentMonth])

  const fetchPosts = async () => {
    setLoading(true)
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
    
    try {
      const res = await fetch(`/api/scheduled-posts?from=${start}&to=${end}&limit=200`)
      const data = await res.json()
      if (data.success) {
        setPosts(data.posts)
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const monthStart = startOfWeek(startOfMonth(currentMonth))
  const monthEnd = endOfWeek(endOfMonth(currentMonth))
  const weeks = []
  let weekStart = monthStart

  while (weekStart <= monthEnd) {
    const week = []
    for (let i = 0; i < 7; i++) {
      week.push(addDays(weekStart, i))
    }
    weeks.push(week)
    weekStart = addDays(weekStart, 7)
  }

  const getPostsForDay = (date: Date) => {
    const dayStr = format(date, 'yyyy-MM-dd')
    return posts.filter(p => format(parseISO(p.scheduled_at), 'yyyy-MM-dd') === dayStr)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-primary text-primary-foreground'
      case 'scheduled': return 'bg-primary/10 text-primary border border-primary/20'
      case 'publishing': return 'bg-gold/10 text-gold-deep border border-gold/20'
      case 'failed': return 'bg-destructive/10 text-destructive border border-destructive/20'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const PlatformIcon = ({ platform, className }: { platform: string; className?: string }) => {
    const Icon = PLATFORM_ICONS[platform] || PLATFORM_ICONS.instagram
    return <Icon className={className} />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Content Calendar</h1>
          <p className="text-muted-foreground">Schedule and manage your social media posts</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/ads?create=true">
            <Plus className="mr-2 h-4 w-4" />
            Schedule New Post
          </Link>
        </Button>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(d => addDays(startOfMonth(d), -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold">{format(currentMonth, 'MMMM yyyy')}</h2>
        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(d => addDays(startOfMonth(d), 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <Card className="border-border/50">
        <CardHeader className="border-b border-border/50 pb-2">
          <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium text-muted-foreground">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="py-2">{day}</div>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-7">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col min-h-[100px]">
                {week.map((day) => {
                  const dayPosts = getPostsForDay(day)
                  const isCurrentMonth = isSameMonth(day, currentMonth)
                  const isTodayDate = isToday(day)
                  
                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        'relative flex flex-col min-h-[100px] border-r border-b border-border/50 p-1.5',
                        !isCurrentMonth && 'bg-muted/30',
                        isTodayDate && 'bg-primary/5'
                      )}
                    >
                      <div className={cn(
                        'text-sm font-medium mb-1',
                        isTodayDate ? 'text-primary' : isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
                      )}>
                        {format(day, 'd')}
                      </div>
                      
                      <div className="flex flex-col gap-1 overflow-hidden">
                        {dayPosts.slice(0, 3).map((post) => (
                          <div
                            key={post.id}
                            className={cn(
                              'px-1.5 py-1 rounded text-xs truncate cursor-pointer transition-all hover:shadow-md',
                              getStatusColor(post.status)
                            )}
                            onClick={() => setSelectedPost(post)}
                          >
                            <div className="flex items-center gap-1 mb-0.5">
                              <PlatformIcon platform={post.platform} className="h-3 w-3" />
                              <span className="font-medium truncate">{post.creative?.product?.name || 'Post'}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] opacity-80">
                              <Clock className="h-2.5 w-2.5" />
                              <span>{format(parseISO(post.scheduled_at), 'HH:mm')}</span>
                              {post.account && (
                                <>
                                  <span>·</span>
                                  <span className="truncate max-w-[60px]">@{post.account.account_name}</span>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                        {dayPosts.length > 3 && (
                          <div className="px-1.5 py-0.5 text-xs text-center text-muted-foreground bg-muted/50 rounded">
                            +{dayPosts.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Post Detail Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <h3 className="font-semibold">Scheduled Post</h3>
              <Button variant="ghost" size="icon" onClick={() => setSelectedPost(null)}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <PlatformIcon platform={selectedPost.platform} className="h-5 w-5" />
                <span className="font-medium capitalize">{selectedPost.platform}</span>
                <span className={cn('px-2 py-0.5 rounded-full text-xs', getStatusColor(selectedPost.status))}>
                  {selectedPost.status}
                </span>
              </div>
              
              {selectedPost.account && (
                <div className="text-sm text-muted-foreground">
                  @{selectedPost.account.account_name}
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{format(parseISO(selectedPost.scheduled_at), 'MMM d, yyyy')}</span>
                <span>·</span>
                <Clock className="h-4 w-4" />
                <span>{format(parseISO(selectedPost.scheduled_at), 'HH:mm')}</span>
              </div>

              <div className="border border-border/50 rounded-lg p-3">
                <p className="font-medium mb-1">{selectedPost.creative?.product?.name}</p>
                <p className="text-sm text-muted-foreground line-clamp-3">{selectedPost.caption}</p>
              </div>

              {selectedPost.media_urls.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {selectedPost.media_urls.slice(0, 4).map((url, i) => (
                    <img key={i} src={url} alt={`Media ${i}`} className="rounded-lg aspect-square object-cover" />
                  ))}
                </div>
              )}

              {selectedPost.error_message && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  Failed: {selectedPost.error_message}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedPost(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}