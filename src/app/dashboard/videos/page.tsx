'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Plus, Film, Sparkles, Download, Trash2, CheckCircle, XCircle, Eye, Copy, Filter, RefreshCw, Mic, Music, Text, Settings, Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { VOICE_OPTIONS, MUSIC_TRACKS, SUBTITLE_STYLES, type VoiceOption } from '@/lib/video-gen'

interface Product {
  id: string
  name: string
  image_url: string | null
  network: string
}

interface AdVariant {
  id: string
  product_id: string
  hook: string
  headline: string
  platform: string
  format: string
  product?: Product
}

interface GeneratedVideo {
  id: string
  variant_id: string
  video_url: string
  thumbnail_url: string | null
  duration: number
  width: number
  height: number
  voice_id: string
  music_track: string
  subtitle_style: string
  aspect_ratio: string
  provider: string
  status: 'generated' | 'selected' | 'rejected' | 'published' | 'rendering' | 'failed'
  selected: boolean
  created_at: string
  variant?: AdVariant
}

export default function VideosPage() {
  const [variants, setVariants] = useState<AdVariant[]>([])
  const [videos, setVideos] = useState<GeneratedVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState<'generate' | 'library'>('generate')
  const [selectedVariant, setSelectedVariant] = useState<string>('')
  const [selectedVoice, setSelectedVoice] = useState<string>('eleven_rachel')
  const [selectedMusic, setSelectedMusic] = useState<string>('upbeat_1')
  const [selectedSubtitleStyle, setSelectedSubtitleStyle] = useState<string>('tiktok')
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>('9:16')
  const [statusFilter, setStatusFilter] = useState<'all' | 'generated' | 'selected' | 'rejected' | 'published' | 'rendering' | 'failed'>('all')
  const [previewVideo, setPreviewVideo] = useState<GeneratedVideo | null>(null)

  useEffect(() => {
    fetchVariants()
    fetchVideos()
  }, [])

  const fetchVariants = async () => {
    let supabase: ReturnType<typeof createClient> | null = null
    try {
      supabase = createClient()
    } catch { return }
    const { data } = await supabase
      .from('ad_creatives')
      .select(`
        id, product_id, hook, headline, platform, format,
        products:product_id (id, name, image_url, network)
      `)
      .in('status', ['approved', 'pending_approval'])
      .order('created_at', { ascending: false })
    if (data) setVariants(data)
  }

  const fetchVideos = async () => {
    let supabase: ReturnType<typeof createClient> | null = null
    try {
      supabase = createClient()
    } catch { return }
    const { data } = await supabase
      .from('generated_videos')
      .select(`
        *,
        ad_creatives:variant_id (id, hook, headline, platform, format, products:product_id(id, name, image_url, network))
      `)
      .order('created_at', { ascending: false })
    if (data) setVideos(data)
    setLoading(false)
  }

  const handleGenerate = async () => {
    if (!selectedVariant) return
    
    setGenerating(true)
    let supabase: ReturnType<typeof createClient> | null = null
    try {
      supabase = createClient()
    } catch { setGenerating(false); return }

    const res = await fetch('/api/videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        variant_id: selectedVariant,
        voice_id: selectedVoice,
        music_track: selectedMusic,
        subtitle_style: selectedSubtitleStyle,
        aspect_ratio: selectedAspectRatio,
      }),
    })

    const data = await res.json()
    setGenerating(false)

    if (!res.ok) {
      alert(data.error || 'Failed to generate video')
      return
    }

    alert('Video generated successfully!')
    fetchVideos()
    setActiveTab('library')
  }

  const handleStatusChange = async (id: string, newStatus: GeneratedVideo['status']) => {
    let supabase: ReturnType<typeof createClient> | null = null
    try {
      supabase = createClient()
    } catch { return }
    
    await fetch('/api/videos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus }),
    })
    fetchVideos()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this video?')) return
    
    let supabase: ReturnType<typeof createClient> | null = null
    try {
      supabase = createClient()
    } catch { return }
    
    await fetch(`/api/videos?id=${id}`, { method: 'DELETE' })
    fetchVideos()
  }

  const handleSelect = async (id: string, selected: boolean) => {
    let supabase: ReturnType<typeof createClient> | null = null
    try {
      supabase = createClient()
    } catch { return }
    
    await fetch('/api/videos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, selected }),
    })
    fetchVideos()
  }

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    alert('Prompt copied to clipboard!')
  }

  const filteredVideos = videos.filter(v => {
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter
    return matchesStatus
  })

  const getVoiceName = (voiceId: string) => {
    const voice = VOICE_OPTIONS.find(v => v.id === voiceId)
    return voice?.name || voiceId
  }

  const getMusicName = (musicId: string) => {
    const music = MUSIC_TRACKS.find(m => m.id === musicId)
    return music?.name || musicId
  }

  const getSubtitleStyleName = (styleId: string) => {
    const style = SUBTITLE_STYLES[styleId as keyof typeof SUBTITLE_STYLES]
    return style?.name || styleId
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      generated: 'bg-gray-100 text-gray-700',
      selected: 'bg-emerald-100 text-emerald-700',
      rejected: 'bg-red-100 text-red-700',
      published: 'bg-blue-100 text-blue-700',
      rendering: 'bg-amber-100 text-amber-700',
      failed: 'bg-red-100 text-red-700',
    }
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.generated}`}>{status}</span>
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Film className="h-6 w-6 text-primary" />
            Video Studio
          </h1>
          <p className="text-muted-foreground">AI-powered video generation: Images + TTS + Subtitles</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value: 'generate' | 'library') => setActiveTab(value)}>
        <TabsList className="grid w-fit grid-cols-2">
          <TabsTrigger value="generate">
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Video
          </TabsTrigger>
          <TabsTrigger value="library">
            <Film className="mr-2 h-4 w-4" />
            Video Library
          </TabsTrigger>
        </TabsList>

        {/* GENERATE TAB */}
        <TabsContent value="generate" className="space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Generate Video from Ad Variant
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Variant Selection */}
              <div className="space-y-2">
                <Label>Select Approved Ad Variant *</Label>
                <Select value={selectedVariant} onValueChange={setSelectedVariant}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an approved ad variant" />
                  </SelectTrigger>
                  <SelectContent>
                    {variants.map(v => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.product?.name || 'Unknown'} - {v.hook.slice(0, 60)}...
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Only approved variants can be turned into videos. The script is extracted from the ad copy.
                </p>
              </div>

              {/* Voice Selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mic className="h-4 w-4" />
                  Voice (TTS)
                </Label>
                <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select voice" />
                  </SelectTrigger>
                  <SelectContent>
                    {VOICE_OPTIONS.map(v => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name} - {v.provider}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Music Selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Music className="h-4 w-4" />
                  Background Music
                </Label>
                <Select value={selectedMusic} onValueChange={setSelectedMusic}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select music track" />
                  </SelectTrigger>
                  <SelectContent>
                    {MUSIC_TRACKS.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} ({m.mood})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Subtitle Style */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Text className="h-4 w-4" />
                  Subtitle Style
                </Label>
                <Select value={selectedSubtitleStyle} onValueChange={setSelectedSubtitleStyle}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subtitle style" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SUBTITLE_STYLES).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.name} - {config.animation} animation
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Aspect Ratio */}
              <div className="space-y-2">
                <Label>Aspect Ratio</Label>
                <Select value={selectedAspectRatio} onValueChange={setSelectedAspectRatio}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="9:16">9:16 (Reels/Shorts/TikTok)</SelectItem>
                    <SelectItem value="16:9">16:9 (YouTube/Horizontal)</SelectItem>
                    <SelectItem value="1:1">1:1 (Square/Feed)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Generate Button */}
              <Button 
                onClick={handleGenerate} 
                disabled={generating || !selectedVariant}
                size="lg"
                className="w-full sm:w-auto"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Video...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Video
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Info Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-5 w-5" />
                  10+ Voices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Multiple TTS voices from ElevenLabs & OpenAI. Different accents, genders, and styles.
                </p>
              </CardContent>
            </Card>
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="h-5 w-5" />
                  6 Music Moods
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Curated royalty-free tracks: upbeat, chill, corporate, emotional, tech, fitness.
                </p>
              </CardContent>
            </Card>
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Text className="h-5 w-5" />
                  4 Subtitle Styles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  TikTok bounce, Reels fade, YouTube slide, Clean minimal. Auto-synced to speech.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* LIBRARY TAB */}
        <TabsContent value="library">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="generated">Generated</SelectItem>
                    <SelectItem value="selected">Selected</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="rendering">Rendering</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={fetchVideos} className="ml-auto">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Videos Grid */}
          {filteredVideos.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="p-12 text-center">
                <Film className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No videos yet</h3>
                <p className="text-muted-foreground mb-4">Generate your first AI video from an approved ad variant</p>
                <Button onClick={() => setActiveTab('generate')}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Video
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredVideos.map(video => (
                <Card key={video.id} className="border-border/50 hover:shadow-md transition-shadow">
                  <CardContent className="p-3 space-y-3">
                    {/* Thumbnail */}
                    <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                      {video.thumbnail_url ? (
                        <img 
                          src={video.thumbnail_url} 
                          alt={video.variant?.hook?.slice(0, 50) || 'Video'} 
                          className="w-full h-full object-cover"
                          onClick={() => setPreviewVideo(video)}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      {video.selected && (
                        <div className="absolute inset-0 bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center">
                          <CheckCircle className="h-8 w-8 text-emerald-500" />
                        </div>
                      )}
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        {formatDuration(video.duration)}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="space-y-1 text-sm">
                      <p className="font-medium truncate">{video.variant?.product?.name || 'Unknown Product'}</p>
                      <div className="flex flex-wrap gap-1">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {video.aspect_ratio}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                          {getVoiceName(video.voice_id)}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                          {getMusicName(video.music_track)}
                        </span>
                        {getStatusBadge(video.status)}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {video.variant?.hook?.slice(0, 80)}...
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{video.width}×{video.height}</span>
                        <span>•</span>
                        <span>{video.provider}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 pt-2 border-t border-border/50">
                      <Button variant="ghost" size="icon" onClick={() => setPreviewVideo(video)} title="Preview">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard(video.video_url)} title="Copy URL">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleStatusChange(video.id, video.status === 'selected' ? 'generated' : 'selected')}
                        title={video.status === 'selected' ? 'Unselect' : 'Select for use'}
                        className={video.status === 'selected' ? 'text-emerald-500' : ''}
                      >
                        {video.status === 'selected' ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(video.id)} title="Delete" className="text-red-500 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Preview Modal */}
          {previewVideo && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setPreviewVideo(null)}>
              <div className="relative max-w-4xl max-h-[90vh] w-full bg-background rounded-xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="font-semibold">{previewVideo.variant?.product?.name || 'Video Preview'}</h3>
                  <Button variant="ghost" size="icon" onClick={() => setPreviewVideo(null)}>
                    <XCircle className="h-5 w-5" />
                  </Button>
                </div>
                <div className="p-4">
                  <video 
                    src={previewVideo.video_url} 
                    controls 
                    className="max-w-full max-h-[70vh] mx-auto rounded-lg"
                  />
                </div>
                <div className="p-4 border-t space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {previewVideo.aspect_ratio}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                      {getVoiceName(previewVideo.voice_id)}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                      {getMusicName(previewVideo.music_track)}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                      {getSubtitleStyleName(previewVideo.subtitle_style)}
                    </span>
                    {getStatusBadge(previewVideo.status)}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleStatusChange(previewVideo.id, previewVideo.status === 'selected' ? 'generated' : 'selected')}>
                      {previewVideo.status === 'selected' ? 'Unselect' : 'Select'}
                    </Button>
                    <Button onClick={() => window.open(previewVideo.video_url, '_blank')}>
                      <Download className="mr-2 h-4 w-4" />
                      Open Video
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}