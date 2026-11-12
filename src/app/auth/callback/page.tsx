import { Suspense } from 'react'
import AuthCallbackClient from './_components/AuthCallbackClient'

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
      <AuthCallbackClient />
    </Suspense>
  )
}
