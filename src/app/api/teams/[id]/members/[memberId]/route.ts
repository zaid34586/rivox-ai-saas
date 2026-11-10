import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; memberId: string }> }) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, memberId } = await params
    const body = await request.json()
    const { role } = body

    if (!role || !['owner', 'admin', 'member'].includes(role)) {
      return NextResponse.json({ error: 'Valid role required' }, { status: 400 })
    }

    // Verify requester is owner/admin
    const { data: requesterMembership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', id)
      .eq('user_id', user.id)
      .single()

    if (!requesterMembership || !['owner', 'admin'].includes(requesterMembership.role)) {
      return NextResponse.json({ error: 'Only admins can change roles' }, { status: 403 })
    }

    // Can't change owner role
    const { data: targetMembership } = await supabase
      .from('team_members')
      .select('role, user_id')
      .eq('id', memberId)
      .eq('team_id', id)
      .single()

    if (!targetMembership) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    if (targetMembership.role === 'owner') {
      return NextResponse.json({ error: 'Cannot change owner role' }, { status: 400 })
    }

    // Admins can't promote to owner
    if (role === 'owner' && requesterMembership.role !== 'owner') {
      return NextResponse.json({ error: 'Only owner can promote to owner' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('team_members')
      .update({ role })
      .eq('id', memberId)
      .eq('team_id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, member: data })
  } catch (error) {
    console.error('Team member update error:', error)
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; memberId: string }> }) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, memberId } = await params

    // Verify requester is owner/admin
    const { data: requesterMembership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', id)
      .eq('user_id', user.id)
      .single()

    if (!requesterMembership || !['owner', 'admin'].includes(requesterMembership.role)) {
      return NextResponse.json({ error: 'Only admins can remove members' }, { status: 403 })
    }

    // Get target membership
    const { data: targetMembership } = await supabase
      .from('team_members')
      .select('role, user_id')
      .eq('id', memberId)
      .eq('team_id', id)
      .single()

    if (!targetMembership) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Can't remove owner
    if (targetMembership.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove owner' }, { status: 400 })
    }

    // Admins can't remove other admins (only owner can)
    if (targetMembership.role === 'admin' && requesterMembership.role !== 'owner') {
      return NextResponse.json({ error: 'Only owner can remove admins' }, { status: 403 })
    }

    // Users can remove themselves (leave team)
    if (targetMembership.user_id === user.id && requesterMembership.role !== 'owner') {
      // Allow self-removal
    }

    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', memberId)
      .eq('team_id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Team member remove error:', error)
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
  }
}