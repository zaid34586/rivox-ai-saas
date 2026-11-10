import { Suspense } from 'react'
import DashboardLayoutClient from './DashboardLayoutClient'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
      <DashboardLayoutClient>{children}</DashboardLayoutClient>
    </Suspense>
  )
}