'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const supabase = createClient()

    const code = searchParams.get('code')
    const type = searchParams.get('type')
    const next = searchParams.get('next') || '/dashboard'

    if (code && type) {
      supabase.auth.verifyOtp({
        token_hash: code,
        type: type as 'email' | 'phone' | 'sms' | 'change_email' | 'recovery' | 'invite',
      }).then(() => {
        router.push(next)
      }).catch(() => {
        router.push('/auth/login?error=auth_failed')
      })
    } else {
      supabase.auth.getSession().then(({ data, error }: { data: { session: { user?: { email?: string } } | null }; error: Error | null }) => {
        if (error || !data.session) {
          router.push('/auth/login?error=auth_failed')
          return
        }
        router.push(next)
      })
    }
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <p className="text-sm text-muted-foreground">Signing you in…</p>
      </div>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="text-sm text-muted-foreground">Signing you in…</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}
