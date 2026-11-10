'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Plus, Users, ChevronDown, Settings, LogOut, Building2, UserCheck, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Team {
  team_id: string
  name: string
  slug: string
  role: string
  is_owner: boolean
}

export function TeamSwitcher() {
  const [teams, setTeams] = useState<Team[]>([])
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamSlug, setNewTeamSlug] = useState('')

  useEffect(() => {
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/teams')
      const data = await res.json()
      if (data.success) {
        setTeams(data.teams)
        // Set current team from localStorage or first team
        const saved = localStorage.getItem('currentTeamId')
        if (saved && data.teams.some((t: Team) => t.team_id === saved)) {
          setCurrentTeamId(saved)
        } else if (data.teams.length > 0) {
          setCurrentTeamId(data.teams[0].team_id)
          localStorage.setItem('currentTeamId', data.teams[0].team_id)
        }
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTeamName || !newTeamSlug) return

    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTeamName, slug: newTeamSlug }),
      })
      const data = await res.json()
      if (data.success) {
        setShowCreateDialog(false)
        setNewTeamName('')
        setNewTeamSlug('')
        fetchTeams()
        // Switch to new team
        setCurrentTeamId(data.team.id)
        localStorage.setItem('currentTeamId', data.team.id)
      } else {
        alert(data.error || 'Failed to create team')
      }
    } catch (error) {
      console.error('Failed to create team:', error)
      alert('Failed to create team')
    }
  }

  const handleSwitchTeam = (teamId: string) => {
    setCurrentTeamId(teamId)
    localStorage.setItem('currentTeamId', teamId)
    window.location.reload()
  }

  const currentTeam = teams.find(t => t.team_id === currentTeamId)

  if (loading || teams.length === 0) {
    return (
      <Button variant="ghost" size="icon" disabled className="h-8 w-8">
        <Building2 className="h-4 w-4 animate-pulse" />
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 gap-1 px-2" size="icon">
          <Building2 className="h-4 w-4" />
          {currentTeam && <span className="hidden sm:inline max-w-[120px] truncate">{currentTeam.name}</span>}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-semibold">Workspaces</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {teams.map(team => (
          <DropdownMenuItem
            key={team.team_id}
            onClick={() => handleSwitchTeam(team.team_id)}
            className={cn(
              'flex items-center gap-2',
              currentTeamId === team.team_id && 'bg-primary/10'
            )}
            inset={currentTeamId === team.team_id}
          >
            <Building2 className={cn('h-4 w-4', currentTeamId === team.team_id && 'text-primary')} />
            <span className="flex-1 truncate">{team.name}</span>
            {currentTeamId === team.team_id && <UserCheck className="h-4 w-4 text-primary" />}
            {team.is_owner && (
              <span title="Owner" className="cursor-help">
                <Crown className="h-3 w-3 text-gold" />
              </span>
            )}
            {team.role === 'admin' && !team.is_owner && <span className="text-xs text-muted-foreground">Admin</span>}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Workspace
        </DropdownMenuItem>
        {currentTeam && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => window.location.href = `/dashboard/team/${currentTeam.team_id}`}>
              <Settings className="h-4 w-4 mr-2" />
              Team Settings
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function TeamCreateDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !slug) return

    setLoading(true)
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug }),
      })
      const data = await res.json()
      if (data.success) {
        onClose()
        setName('')
        setSlug('')
        window.location.reload()
      } else {
        alert(data.error || 'Failed to create team')
      }
    } catch (error) {
      alert('Failed to create team')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">Create New Workspace</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Workspace Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="My Agency"
              className="w-full p-2 rounded-lg border border-input bg-background"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Slug (URL)</label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">app.affipilot.com/</span>
              <input
                type="text"
                value={slug}
                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="my-agency"
                className="w-full p-2 rounded-lg border border-input bg-background"
                required
                pattern="[a-z0-9-]+"
              />
            </div>
            <p className="text-xs text-muted-foreground">Lowercase letters, numbers, and hyphens only</p>
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Creating...' : 'Create Workspace'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function useCurrentTeam() {
  const teamId = localStorage.getItem('currentTeamId')
  return teamId
}