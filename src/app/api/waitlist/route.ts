import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email }: { email?: string } = body

    // Validate input
    if (!email || typeof email !== 'string' || !isValidEmail(email.trim())) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Check for duplicate
    const { data: existing } = await supabase
      .from('waitlist_signups')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'You are already on the waitlist' },
        { status: 409 }
      )
    }

    // Insert signup
    const { error } = await supabase
      .from('waitlist_signups')
      .insert({
        email: email.trim().toLowerCase(),
        source: 'landing_page',
        created_at: new Date().toISOString(),
      })

    if (error) {
      console.error('Waitlist insert error:', error)
      return NextResponse.json(
        { error: 'Could not join the waitlist right now. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "You're on the list — we'll email you when your seat opens.",
    })
  } catch (error) {
    console.error('Waitlist error:', error)
    return NextResponse.json(
      { error: 'Could not join the waitlist right now. Please try again.' },
      { status: 500 }
    )
  }
}
