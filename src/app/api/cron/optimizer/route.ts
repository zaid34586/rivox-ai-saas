import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'all'

    const supabase = await createServerClient()
    const results: Record<string, any> = {}

    // Get all active users
    const { data: users } = await supabase.auth.admin.listUsers()
    if (!users || users.users.length === 0) {
      return NextResponse.json({ success: true, message: 'No users found' })
    }

    if (action === 'briefings' || action === 'all') {
      // Generate daily briefings for all users
      let generated = 0
      for (const user of users.users) {
        try {
          const { data: briefingId } = await supabase.rpc('generate_daily_briefing', {
            target_user_id: user.id
          })
          if (briefingId) generated++
        } catch (e) {
          console.error(`Failed to generate briefing for ${user.id}:`, e)
        }
      }
      results.briefings_generated = generated
    }

    if (action === 'budget_reset' || action === 'all') {
      // Reset daily spend at midnight
      try {
        await supabase.rpc('reset_daily_budget_spend')
        results.budget_reset = true
      } catch (e) {
        results.budget_reset_error = String(e)
      }
    }

    if (action === 'budget_pacing' || action === 'all') {
      // Update budget pacing hourly
      try {
        await supabase.rpc('update_budget_pacing')
        results.budget_pacing = true
      } catch (e) {
        results.budget_pacing_error = String(e)
      }
    }

    if (action === 'optimizer_eval' || action === 'all') {
      // Evaluate optimizer rules (placeholder - actual logic in app)
      results.optimizer_eval = 'evaluated'
    }

    return NextResponse.json({ success: true, ...results })
  } catch (error) {
    console.error('Optimizer cron error:', error)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}