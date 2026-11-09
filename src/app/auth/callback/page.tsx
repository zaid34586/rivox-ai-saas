'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleAuth = async () => {
      const code = searchParams.get('code')
      const error = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')

      if (error) {
        console.error('Auth error:', error, errorDescription)
        router.push(`/auth/login?error=${encodeURIComponent(errorDescription || error)}`)
        return
      }

      if (code) {
        const supabase = createClient()
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

        if (exchangeError) {
          console.error('Session exchange error:', exchangeError)
          router.push(`/auth/login?error=${encodeURIComponent(exchangeError.message)}`)
          return
        }

        router.push('/dashboard')
        router.refresh()
      } else {
        router.push('/auth/login')
      }
    }

    handleAuth()
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}