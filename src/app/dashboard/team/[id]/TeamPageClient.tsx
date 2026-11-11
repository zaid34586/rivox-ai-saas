'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  Users,
  UserPlus,
  UserCheck,
  Crown,
  Settings,
  Trash2,
  Edit,
  Mail,
  Shield,
  Loader2,
  AlertCircle,
  CheckCircle,
  Building2,
} from 'lucide-react'

interface Team {
  id: string
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  plan: string
  owner_id: string
  settings: Record<string, any>
  created_at: string
}

interface TeamMember {
  member_id: string
  user_id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: string
  joined_at: string
}

interface TeamInvitation {
  id: string
  email: string
  role: string
  invited_by: string
  token: string
  expires_at: string
  created_at: string
}

interface TeamPageClientProps {
  initialTeam: Team
  initialMembers: TeamMember[]
  initialInvitations: TeamInvitation[]
  teamId: string
}

export default function TeamPageClient({
  initialTeam,
  initialMembers,
  initialInvitations,
  teamId,
}: TeamPageClientProps) {
  const [team, setTeam] = useState<Team>(initialTeam)
  const [members, setMembers] = useState<TeamMember[]>(initialMembers)
  const [invitations, setInvitations] = useState<TeamInvitation[]>(initialInvitations)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'members' | 'invitations' | 'settings'>('members')
  const [userRole, setUserRole] = useState<string>('')
  const [currentUserId, setCurrentUserId] = useState<string>('')

  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member')
  const [inviting, setInviting] = useState(false)

  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [editRole, setEditRole] = useState<'admin' | 'member'>('member')
  const [updating, setUpdating] = useState(false)

  const [updatingTeam, setUpdatingTeam] = useState(false)
  const [teamName, setTeamName] = useState(initialTeam.name)
  const [teamDescription, setTeamDescription] = useState(initialTeam.description || '')

  const handleTabChange = (value: 'members' | 'invitations' | 'settings') => {
    setActiveTab(value)
  }

  useEffect(() => {
    fetchCurrentUser()
  }, [])

  const fetchCurrentUser = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCurrentUserId(user.id)
    } catch (error) {
      console.error('Failed to fetch user:', error)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail || !team) return

    setInviting(true)
    try {
      const res = await fetch(`/api/teams/${team.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      const data = await res.json()
      if (data.success) {
        setShowInviteDialog(false)
        setInviteEmail('')
        fetchTeamData()
      } else {
        alert(data.error || 'Failed to invite member')
      }
    } catch (error) {
      alert('Failed to invite member')
    } finally {
      setInviting(false)
    }
  }

  const fetchTeamData = async () => {
    try {
      const supabase = createClient()
      
      // Fetch team
      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single()

      if (teamData) setTeam(teamData)

      // Fetch members
      const { data: membersData } = await supabase.rpc('get_team_members', { team_id: teamId })
      if (membersData) {
        setMembers(membersData)
        const currentMember = membersData.find((m: TeamMember) => m.user_id === currentUserId)
        if (currentMember) {
          setUserRole(currentMember.role)
        }
      }

      // Fetch invitations
      const { data: invitesData } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('team_id', teamId)
        .is('accepted_at', null)
        .order('created_at', { ascending: false })
      
      if (invitesData) setInvitations(invitesData)

    } catch (error) {
      console.error('Failed to fetch team data:', error)
    }
  }

  const handleUpdateRole = async (member: TeamMember) => {
    if (!team) return
    setEditingMember(member)
    setEditRole(member.role as 'admin' | 'member')
  }

  const handleSaveRole = async () => {
    if (!editingMember || !team) return
    setUpdating(true)
    try {
      const res = await fetch(`/api/teams/${team.id}/members/${editingMember.member_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editRole }),
      })
      const data = await res.json()
      if (data.success) {
        setEditingMember(null)
        fetchTeamData()
      } else {
        alert(data.error || 'Failed to update role')
      }
    } catch (error) {
      alert('Failed to update role')
    } finally {
      setUpdating(false)
    }
  }

  const handleRemoveMember = async (member: TeamMember) => {
    if (!team || !confirm(`Remove ${member.full_name || member.email} from the team?`)) return
    try {
      const res = await fetch(`/api/teams/${team.id}/members/${member.member_id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        fetchTeamData()
      } else {
        alert(data.error || 'Failed to remove member')
      }
    } catch (error) {
      alert('Failed to remove member')
    }
  }

  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!team) return
    setUpdatingTeam(true)
    try {
      const res = await fetch(`/api/teams/${team.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: teamName, description: teamDescription }),
      })
      const data = await res.json()
      if (data.success) {
        setTeam(data.team)
        alert('Team updated successfully')
      } else {
        alert(data.error || 'Failed to update team')
      }
    } catch (error) {
      alert('Failed to update team')
    } finally {
      setUpdatingTeam(false)
    }
  }

  const handleLeaveTeam = async () => {
    if (!team || !confirm('Leave this team? You will lose access to all team resources.')) return
    try {
      const memberId = members.find((m: TeamMember) => m.user_id === currentUserId)?.member_id
      if (!memberId) return
      
      const res = await fetch(`/api/teams/${team.id}/members/${memberId}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        window.location.href = '/dashboard'
      } else {
        alert(data.error || 'Failed to leave team')
      }
    } catch (error) {
      alert('Failed to leave team')
    }
  }

  const handleDeleteTeam = async () => {
    if (!team || !confirm('DELETE THIS TEAM? This action cannot be undone. All team data will be permanently deleted.')) return
    if (!confirm('Are you absolutely sure? Type "DELETE" to confirm.')) return
    try {
      const res = await fetch(`/api/teams/${team.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        window.location.href = '/dashboard'
      } else {
        alert(data.error || 'Failed to delete team')
      }
    } catch (error) {
      alert('Failed to delete team')
    }
  }

  const canManage = userRole === 'owner' || userRole === 'admin'
  const isOwner = userRole === 'owner'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            {team.name}
          </h1>
          <p className="text-muted-foreground">{team.slug} · {team.plan} plan</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-fit grid-cols-3">
          <TabsTrigger value="members">
            <Users className="mr-2 h-4 w-4" />
            Members ({members.length})
          </TabsTrigger>
          <TabsTrigger value="invitations">
            <Mail className="mr-2 h-4 w-4" />
            Invitations ({invitations.length})
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* MEMBERS TAB */}
        <TabsContent value="members">
          <div className="flex items-center justify-between">
            <CardTitle>Team Members</CardTitle>
            {canManage && (
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite Member
                </Button>
              </DialogTrigger>
            )}
          </div>

          <Card className="border-border/50">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left p-4 font-medium text-muted-foreground">Member</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Role</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Joined</th>
                      <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map(member => (
                      <tr key={member.member_id} className="border-b border-border/50">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                              {member.full_name?.charAt(0)?.toUpperCase() || member.email.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium">{member.full_name || member.email}</p>
                              <p className="text-sm text-muted-foreground">{member.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={cn(
                            'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                            member.role === 'owner' && 'bg-gold/20 text-gold-deep',
                            member.role === 'admin' && 'bg-primary/10 text-primary',
                            member.role === 'member' && 'bg-muted text-muted-foreground'
                          )}>
                            {member.role === 'owner' && <Crown className="h-3 w-3" />}
                            {member.role === 'admin' && <Shield className="h-3 w-3" />}
                            {member.role === 'member' && <UserCheck className="h-3 w-3" />}
                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {new Date(member.joined_at).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {member.user_id !== currentUserId && canManage && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleUpdateRole(member)}
                                  title="Change role"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveMember(member)}
                                  title="Remove member"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {member.user_id === currentUserId && userRole !== 'owner' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleLeaveTeam}
                                className="text-destructive hover:text-destructive"
                              >
                                Leave Team
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Invite Dialog */}
          <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>Enter their email address and select their role.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleInvite}>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite_email">Email</Label>
                    <Input
                      id="invite_email"
                      type="email"
                      placeholder="member@example.com"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className={cn(
                        'p-3 rounded-lg border cursor-pointer transition-colors',
                        inviteRole === 'admin' ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'
                      )}>
                        <input
                          type="radio"
                          value="admin"
                          checked={inviteRole === 'admin'}
                          onChange={e => setInviteRole('admin')}
                          className="sr-only"
                        />
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          <span className="font-medium">Admin</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Can manage members and team settings</p>
                      </label>
                      <label className={cn(
                        'p-3 rounded-lg border cursor-pointer transition-colors',
                        inviteRole === 'member' ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'
                      )}>
                        <input
                          type="radio"
                          value="member"
                          checked={inviteRole === 'member'}
                          onChange={e => setInviteRole('member')}
                          className="sr-only"
                        />
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4" />
                          <span className="font-medium">Member</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Can access team resources</p>
                      </label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowInviteDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={inviting}>
                    {inviting ? 'Inviting...' : 'Send Invitation'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Edit Role Dialog */}
          <Dialog open={!!editingMember} onOpenChange={open => !open && setEditingMember(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Change Role</DialogTitle>
                <DialogDescription>Update {editingMember?.full_name || editingMember?.email}'s role in the team.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-2">
                  <label className={cn(
                    'p-3 rounded-lg border cursor-pointer transition-colors',
                    editRole === 'admin' ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'
                  )}>
                    <input
                      type="radio"
                      value="admin"
                      checked={editRole === 'admin'}
                      onChange={e => setEditRole('admin')}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      <span className="font-medium">Admin</span>
                    </div>
                  </label>
                  <label className={cn(
                    'p-3 rounded-lg border cursor-pointer transition-colors',
                    editRole === 'member' ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'
                  )}>
                    <input
                      type="radio"
                      value="member"
                      checked={editRole === 'member'}
                      onChange={e => setEditRole('member')}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      <span className="font-medium">Member</span>
                    </div>
                  </label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingMember(null)}>Cancel</Button>
                <Button onClick={handleSaveRole} disabled={updating}>
                  {updating ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* INVITATIONS TAB */}
        <TabsContent value="invitations">
          <div className="flex items-center justify-between">
            <CardTitle>Pending Invitations</CardTitle>
          </div>

          {invitations.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="p-12 text-center">
                <Mail className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No pending invitations</h3>
                <p className="text-muted-foreground mb-4">Invite team members to collaborate on your affiliate campaigns.</p>
                {canManage && (
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Invite Member
                    </Button>
                  </DialogTrigger>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left p-4 font-medium text-muted-foreground">Email</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Role</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Expires</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Sent</th>
                        <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invitations.map(invite => (
                        <tr key={invite.id} className="border-b border-border/50">
                          <td className="p-4 font-medium">{invite.email}</td>
                          <td className="p-4">
                            <span className={cn(
                              'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                              invite.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                            )}>
                              {invite.role.charAt(0).toUpperCase() + invite.role.slice(1)}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {new Date(invite.expires_at).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {new Date(invite.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-right">
                            <Button variant="ghost" size="icon" className="text-destructive" 
                              onClick={async () => {
                                if (!confirm('Cancel this invitation?')) return;
                                try {
                                  await fetch(`/api/team-invitations?token=${invite.token}`, { method: 'DELETE' })
                                  fetchTeamData()
                                } catch { alert('Failed to cancel') }
                              }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
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

        {/* SETTINGS TAB */}
        <TabsContent value="settings">
          {/* Team Info */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Team Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateTeam} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="team_name">Team Name</Label>
                  <Input
                    id="team_name"
                    value={teamName}
                    onChange={e => setTeamName(e.target.value)}
                    placeholder="My Agency"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="team_slug">Slug (URL)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground px-3 py-2 bg-muted rounded-lg">
                      affipilot.com/team/
                    </span>
                    <Input
                      id="team_slug"
                      value={team.slug}
                      readOnly
                      className="bg-muted cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Slug cannot be changed</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="team_description">Description</Label>
                  <textarea
                    id="team_description"
                    value={teamDescription}
                    onChange={e => setTeamDescription(e.target.value)}
                    placeholder="Team description..."
                    className="w-full min-h-[80px] p-3 rounded-lg border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                  />
                </div>
                <Button type="submit" disabled={updatingTeam}>
                  {updatingTeam ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Plan Info */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Plan & Limits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm text-muted-foreground">Current Plan</p>
                  <p className="text-2xl font-bold text-primary capitalize">{team.plan}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Members</p>
                  <p className="text-2xl font-bold">{members.length}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Pending Invites</p>
                  <p className="text-2xl font-bold">{invitations.length}</p>
                </div>
              </div>
              <div className="mt-4 p-4 rounded-lg bg-warning/5 border border-warning/20">
                <p className="text-sm text-warning-foreground">
                  Plan upgrades and billing management coming soon.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          {isOwner && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription>Irreversible actions. Proceed with caution.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                  <div>
                    <p className="font-medium">Leave Team</p>
                    <p className="text-sm text-muted-foreground">You will lose access to all team resources. Ownership must be transferred first.</p>
                  </div>
                  <Button variant="outline" onClick={handleLeaveTeam} className="text-destructive border-destructive hover:bg-destructive/10">
                    Leave Team
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                  <div>
                    <p className="font-medium">Delete Team</p>
                    <p className="text-sm text-muted-foreground">Permanently delete this team and all its data. This cannot be undone.</p>
                  </div>
                  <Button variant="destructive" onClick={handleDeleteTeam}>
                    Delete Team
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}