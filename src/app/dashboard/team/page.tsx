'use client'

import { PageSkeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Building2, ChevronRight } from 'lucide-react'

interface Team {
  team_id: string
  name: string
  slug: string
  role: string
  is_owner: boolean
}

export default function TeamListPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamSlug, setNewTeamSlug] = useState('')
  const [creating, setCreating] = useState(false)
  const router = useRouter()

  // Fetch teams function - declared before useEffect
  const fetchTeams = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/teams')
      const data = await res.json()
      if (data.success) {
        setTeams(data.teams)
      }
    } catch {
      setLoading(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const run = async () => {
      await fetchTeams()
    }
    run()
  }, [])

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTeamName || !newTeamSlug) return

    setCreating(true)
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
        router.push(`/dashboard/team/${data.team.id}`)
      } else {
        alert(data.error || 'Failed to create team')
      }
    } catch (error) {
      alert('Failed to create team')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <PageSkeleton />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Workspaces
          </h1>
          <p className="text-muted-foreground">Manage your teams and workspaces</p>
        </div>
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Workspace
          </Button>
        </DialogTrigger>
      </div>

      {/* Teams Grid */}
      {teams.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="p-12 text-center">
            <Building2 className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No workspaces yet</h3>
            <p className="text-muted-foreground mb-6">Create your first workspace to start collaborating with your team.</p>
            <Button onClick={() => setShowCreateDialog(true)} size="lg">
              <Plus className="mr-2 h-4 w-4" />
              Create Workspace
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map(team => (
            <Card key={team.team_id} className="border-border/60 bg-card/50 hover:border-emerald-500/40 hover:bg-emerald-600/10 transition-colors duration-300 group">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-emerald-600/10 flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-emerald-500" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{team.name}</CardTitle>
                      <CardDescription>
        {team.role === 'owner' ? 'Owner' : team.role === 'admin' ? 'Admin' : 'Member'}
        {team.is_owner && <span className="ml-2 px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-500 rounded-full">Owner</span>}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  asChild
                  variant="outline"
                  className="w-full justify-between"
                >
                  <Link href={`/dashboard/team/${team.team_id}`}>
                    <span>Open Workspace</span>
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Workspace</DialogTitle>
            <DialogDescription>Give your workspace a name and URL slug.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTeam}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="team_name">Workspace Name</Label>
                <Input
                  id="team_name"
                  placeholder="My Agency"
                  value={newTeamName}
                  onChange={e => setNewTeamName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team_slug">Slug (URL)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground px-3 py-2 bg-emerald-600/10 rounded-lg">
                    affipilot.com/team/
                  </span>
                  <Input
                    id="team_slug"
                    placeholder="my-agency"
                    value={newTeamSlug}
                    onChange={e => setNewTeamSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    required
                    pattern="[a-z0-9-]+"
                  />
                  <p className="text-xs text-muted-foreground">Lowercase letters, numbers, and hyphens only</p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? 'Creating...' : 'Create Workspace'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}