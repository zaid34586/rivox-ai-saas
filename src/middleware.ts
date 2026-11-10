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

// Content Security Policy
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https: https://picsum.photos https://*.supabase.co",
  "media-src 'self' data: blob: https:",
  "connect-src 'self' https://*.supabase.co https://api.openai.com https://api.replicate.com https://api.elevenlabs.io https://vercel.live wss://*.supabase.co",
  "frame-src 'self' https://vercel.live",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ')

// Security headers
function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers)
  
  // CSP
  headers.set('Content-Security-Policy', CSP_DIRECTIVES)
  
  // Prevent MIME type sniffing
  headers.set('X-Content-Type-Options', 'nosniff')
  
  // Prevent clickjacking
  headers.set('X-Frame-Options', 'DENY')
  
  // XSS protection (legacy but still useful)
  headers.set('X-XSS-Protection', '1; mode=block')
  
  // Referrer policy
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Permissions policy
  headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
  )
  
  // HSTS (only in production)
  if (process.env.NODE_ENV === 'production') {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }
  
  // Remove server header
  headers.delete('Server')
  headers.delete('X-Powered-By')
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

// In-memory rate limiting (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

function getRateLimitKey(request: NextRequest, prefix: string): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown'
  return `${prefix}:${ip}`
}

function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const record = rateLimitStore.get(key)
  
  if (!record || record.resetTime < Date.now()) {
    rateLimitStore.set(key, { count: 1, resetTime: Date.now() + windowMs })
    return { allowed: true, remaining: maxRequests - 1, resetTime: Date.now() + windowMs }
  }
  
  record.count++
  const allowed = record.count <= maxRequests
  const remaining = Math.max(0, maxRequests - record.count)
  
  return { allowed, remaining, resetTime: record.resetTime }
}

export async function middleware(request: NextRequest) {
  // Add security headers to all responses
  const response = NextResponse.next()
  const securedResponse = addSecurityHeaders(response)
  
  // Apply rate limiting based on path
  const ipKey = getRateLimitKey(request, 'global')
  
  // Stricter rate limits for auth endpoints
  if (request.nextUrl.pathname.startsWith('/auth/') && !request.nextUrl.pathname.startsWith('/auth/callback')) {
    const result = checkRateLimit(`${ipKey}:auth`, 10, 60 * 1000)
    if (!result.allowed) {
      return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
        },
      })
    }
  }
  
  // Stricter rate limits for AI generation endpoints
  if (request.nextUrl.pathname.startsWith('/api/ads') || request.nextUrl.pathname.startsWith('/api/ai/')) {
    const result = checkRateLimit(`${ipKey}:ai`, 5, 60 * 1000)
    if (!result.allowed) {
      return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
        },
      })
    }
  }
  
  // General API rate limit
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const result = checkRateLimit(`${ipKey}:api`, 60, 60 * 1000)
    if (!result.allowed) {
      return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
        },
      })
    }
  }
  
  // Skip auth check if Supabase not configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!isValidUrl(supabaseUrl) || !anonKey) {
    // Supabase not configured — allow all requests (dev mode)
    return securedResponse
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
  
  // /go/<code> — anonymous visitors open short tracking links
  const isGoPath = pathname.startsWith('/go/')
  
  // Redirect authenticated users away from auth pages
  if (session && isPublicPath) {
    const redirectResponse = NextResponse.redirect(new URL('/dashboard', request.url))
    return addSecurityHeaders(redirectResponse)
  }
  
  // API routes: return JSON 401 (never redirect — clients expect JSON).
  // /api/clicks POST is a public beacon (anonymous click recording);
  // its own handler enforces auth where needed (GET requires user).
  if (pathname.startsWith('/api')) {
    const isPublicApi = pathname === '/api/clicks'
    if (!session && !isPublicApi && !isPublicPath) {
      const errorResponse = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      return addSecurityHeaders(errorResponse)
    }
    return securedResponse
  }
  
  // Redirect unauthenticated users to login (pages only)
  if (!session && !isPublicPath && !isRootPath && !isGoPath) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    const redirectResponse = NextResponse.redirect(loginUrl)
    return addSecurityHeaders(redirectResponse)
  }
  
  return securedResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.jpg$|.*\\.jpeg$|.*\\.webp$).*)',
  ],
}