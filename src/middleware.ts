import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function isValidUrl(url: string | undefined): boolean {
  if (!url) return false
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  // Skip auth check if Supabase not configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!isValidUrl(supabaseUrl) || !anonKey) {
    // Supabase not configured — allow all requests (dev mode)
    return NextResponse.next()
  }

  // Only import createServerClient when needed (after validation)
  const { createServerClient } = await import('@/lib/supabase-server')
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  const pathname = request.nextUrl.pathname

  // Public paths that don't require auth
  const publicPaths = ['/auth/login', '/auth/signup', '/auth/callback', '/auth/forgot-password']
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path))
  const isRootPath = pathname === '/'

  // Redirect authenticated users away from auth pages
  if (session && isPublicPath) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Redirect unauthenticated users to login
  if (!session && !isPublicPath && !isRootPath) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
}