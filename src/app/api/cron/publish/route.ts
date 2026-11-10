import { NextRequest, NextResponse } from 'next/server'
import { processScheduledPosts, resetDailyPostCounts } from '@/lib/publishing-worker'

// This endpoint is called by cron job (e.g., every 5 minutes)
// Configure in vercel.json or use external cron service

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
    const action = searchParams.get('action') || 'process'

    if (action === 'process') {
      const result = await processScheduledPosts()
      return NextResponse.json({ success: true, ...result })
    } else if (action === 'reset') {
      await resetDailyPostCounts()
      return NextResponse.json({ success: true, message: 'Daily post counts reset' })
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}