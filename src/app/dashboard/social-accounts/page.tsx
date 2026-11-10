"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  Plus,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  Globe,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'

// Custom platform icons as inline SVGs
const PlatformIcons = {
  instagram: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  ),
  youtube: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  ),
  pinterest: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0c-6.627 0-12 5.372-12 12 0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146 1.124.347 2.317.535 3.554.535 6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/>
    </svg>
  ),
  x: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 9.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
  facebook: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ),
  tiktok: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.545,0c-1.346,0-2.484,1.365-2.226,2.708c0,0,1.14,4.294,1.5,5.102c.288,.644,0,1.593,0,1.593c.686,3.718,3.981,7.231,8.13,7.489c.118,0,.236,0,.353,0c.057-.234,.09-.469,.11-.704c.08-1.063.123-1.583.123-1.583s-2.826-5.481-3.144-9.134c-.295-3.379-2.108-6.107-4.532-6.107c-.129,0-.259,0-.387,0C12.792.105,12.662,0,12.545,0z"/>
    </svg>
  ),
} as const

const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: PlatformIcons.instagram, color: 'from-purple-500 via-pink-500 to-orange-500', authUrl: 'https://www.instagram.com/oauth/authorize' },
  { id: 'youtube', name: 'YouTube', icon: PlatformIcons.youtube, color: 'bg-red-600', authUrl: 'https://accounts.google.com/o/oauth2/v2/auth' },
  { id: 'pinterest', name: 'Pinterest', icon: PlatformIcons.pinterest, color: 'bg-red-500', authUrl: 'https://www.pinterest.com/oauth/' },
  { id: 'x', name: 'X (Twitter)', icon: PlatformIcons.x, color: 'bg-sky-500', authUrl: 'https://twitter.com/i/oauth2/authorize' },
  { id: 'facebook', name: 'Facebook', icon: PlatformIcons.facebook, color: 'bg-blue-600', authUrl: 'https://www.facebook.com/v18.0/dialog/oauth' },
  { id: 'tiktok', name: 'TikTok', icon: PlatformIcons.tiktok, color: 'bg-pink-500', authUrl: 'https://www.tiktok.com/v2/auth/authorize/' },
] as const

interface SocialAccount {
  id: string
  platform: string
  account_name: string
  account_id: string
  access_token: string
  refresh_token: string | null
  token_expires_at: string | null
  is_active: boolean
  daily_post_limit: number
  posts_today: number
  last_post_at: string | null
  created_at: string
}

export default function SocialAccountsPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState<string>('instagram')
  const [formData, setFormData] = useState({
    account_name: '',
    account_id: '',
    access_token: '',
    refresh_token: '',
    daily_post_limit: 10,
  })

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/social-accounts')
      const data = await res.json()
      if (data.success) {
        setAccounts(data.accounts)
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = (platformId: string) => {
    setSelectedPlatform(platformId)
    setFormData({
      account_name: '',
      account_id: '',
      access_token: '',
      refresh_token: '',
      daily_post_limit: 10,
    })
    setShowDialog(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setConnecting(selectedPlatform)
    try {
      const res = await fetch('/api/social-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: selectedPlatform, ...formData }),
      })
      const data = await res.json()
      if (data.success) {
        setShowDialog(false)
        fetchAccounts()
      } else {
        alert(data.error || 'Failed to connect account')
      }
    } catch (error) {
      console.error('Failed to connect:', error)
      alert('Failed to connect account')
    } finally {
      setConnecting(null)
    }
  }

  const handleDisconnect = async (accountId: string) => {
    if (!confirm('Disconnect this account? Scheduled posts using this account will fail.')) return
    try {
      const res = await fetch(`/api/social-accounts/${accountId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        fetchAccounts()
      } else {
        alert(data.error || 'Failed to disconnect')
      }
    } catch (error) {
      console.error('Failed to disconnect:', error)
      alert('Failed to disconnect account')
    }
  }

  const handleToggleActive = async (account: SocialAccount) => {
    try {
      const res = await fetch(`/api/social-accounts/${account.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !account.is_active }),
      })
      const data = await res.json()
      if (data.success) {
        fetchAccounts()
      }
    } catch (error) {
      console.error('Failed to toggle:', error)
    }
  }

  const getConnectedAccount = (platformId: string) => {
    return accounts.find(a => a.platform === platformId)
  }

  const PlatformIcon = ({ platform, className, connected }: { platform: string; className?: string; connected?: boolean }) => {
    const p = PLATFORMS.find(p => p.id === platform)
    if (!p) return null
    const Icon = p.icon
    return (
      <div className={cn(
        'inline-flex h-10 w-10 items-center justify-center rounded-xl text-white',
        connected ? '' : 'bg-muted text-muted-foreground',
        className
      )}>
        <Icon className={cn('h-5 w-5', connected && 'text-white')} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Social Accounts</h1>
          <p className="text-muted-foreground">Connect your social media accounts for auto-posting</p>
        </div>
      </div>

      {/* Platform Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {PLATFORMS.map((platform) => {
          const account = getConnectedAccount(platform.id)
          
          return (
            <Card key={platform.id} className={cn(
              'border-border/50 transition-all hover:shadow-md',
              account && 'border-primary/30'
            )}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <PlatformIcon platform={platform.id} connected={!!account} />
                    <div>
                      <CardTitle className="text-lg">{platform.name}</CardTitle>
                      <CardDescription>
                        {account 
                          ? `@${account.account_name} · ${account.posts_today}/${account.daily_post_limit} posts today`
                          : 'Not connected'}
                      </CardDescription>
                    </div>
                  </div>
                  {account && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleToggleActive(account)}
                        disabled={account.posts_today >= account.daily_post_limit && !account.is_active}
                        title={account.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {account.is_active ? (
                          <CheckCircle className="h-4 w-4 text-primary" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDisconnect(account.id)}
                        title="Disconnect"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {account ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Daily Limit</span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${Math.min(100, (account.posts_today / account.daily_post_limit) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono tabular-nums">
                          {account.posts_today}/{account.daily_post_limit}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-medium',
                        account.is_active 
                          ? 'bg-primary/10 text-primary' 
                          : 'bg-muted text-muted-foreground'
                      )}>
                        {account.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {account.last_post_at && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Last Post</span>
                        <span>{new Date(account.last_post_at).toLocaleDateString()}</span>
                      </div>
                    )}

                    {account.token_expires_at && new Date(account.token_expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && (
                      <div className="p-2 rounded bg-warning/10 border border-warning/20 text-warning text-xs flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Token expires soon - reconnect required
                      </div>
                    )}
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => handleConnect(platform.id)}
                    disabled={connecting === platform.id}
                  >
                    {connecting === platform.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Connect {platform.name}
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Connect Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Connect {PLATFORMS.find(p => p.id === selectedPlatform)?.name}</DialogTitle>
            <DialogDescription>
              Enter your account details. For OAuth platforms, you'll need to get an access token from the platform's developer portal.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="account_name">Account Name / Handle</Label>
                <Input
                  id="account_name"
                  placeholder="@yourhandle"
                  value={formData.account_name}
                  onChange={e => setFormData({ ...formData, account_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account_id">Account ID</Label>
                <Input
                  id="account_id"
                  placeholder="1234567890"
                  value={formData.account_id}
                  onChange={e => setFormData({ ...formData, account_id: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="access_token">Access Token</Label>
                <Input
                  id="access_token"
                  type="password"
                  placeholder="Paste your access token"
                  value={formData.access_token}
                  onChange={e => setFormData({ ...formData, access_token: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="refresh_token">Refresh Token (optional)</Label>
                <Input
                  id="refresh_token"
                  type="password"
                  placeholder="Paste your refresh token"
                  value={formData.refresh_token}
                  onChange={e => setFormData({ ...formData, refresh_token: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="daily_post_limit">Daily Post Limit</Label>
                <Input
                  id="daily_post_limit"
                  type="number"
                  min="1"
                  max="50"
                  value={formData.daily_post_limit}
                  onChange={e => setFormData({ ...formData, daily_post_limit: parseInt(e.target.value) || 10 })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={connecting === selectedPlatform}>
                {connecting === selectedPlatform ? 'Connecting...' : 'Connect Account'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}