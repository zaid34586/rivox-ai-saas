import { createServerClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import TeamPageClient from './TeamPageClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TeamPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createServerClient()

  // Fetch team
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('*')
    .eq('id', id)
    .single()

  if (teamError || !team) {
    notFound()
  }

  // Fetch members
  const { data: members } = await supabase.rpc('get_team_members', { team_id: id })

  // Fetch invitations
  const { data: invitations } = await supabase
    .from('team_invitations')
    .select('*')
    .eq('team_id', id)
    .is('accepted_at', null)
    .order('created_at', { ascending: false })

  return (
    <TeamPageClient
      initialTeam={team}
      initialMembers={members || []}
      initialInvitations={invitations || []}
      teamId={id}
    />
  )
}