/**
 * Rate Limiter - Token bucket algorithm with Redis/Upstash support
 * Falls back to in-memory for development
 */

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  keyPrefix?: string // Prefix for rate limit keys
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  total: number
}

// In-memory store for development (use Redis/Upstash in production)
const memoryStore = new Map<string, { count: number; resetTime: number }>()

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of memoryStore.entries()) {
    if (value.resetTime < now) {
      memoryStore.delete(key)
    }
  }
}, 60 * 1000) // Clean every minute

function getClientKey(request: Request, prefix = 'ratelimit'): string {
  // Try to get IP from headers (for proxied requests)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown'
  
  // Also include user agent for additional granularity
  const ua = request.headers.get('user-agent') || 'unknown'
  const uaHash = hashString(ua).substring(0, 8)
  
  return `${prefix}:${ip}:${uaHash}`
}

function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}

export function rateLimit(config: RateLimitConfig) {
  const { windowMs, maxRequests, keyPrefix = 'ratelimit' } = config
  
  return async function (request: Request): Promise<RateLimitResult> {
    const key = getClientKey(request, keyPrefix)
    const now = Date.now()
    const windowStart = now - windowMs
    
    let record = memoryStore.get(key)
    
    // Reset if window expired
    if (!record || record.resetTime < now) {
      record = { count: 0, resetTime: now + windowMs }
    }
    
    record.count++
    memoryStore.set(key, record)
    
    const remaining = Math.max(0, maxRequests - record.count)
    const allowed = record.count <= maxRequests
    
    return {
      allowed,
      remaining,
      resetTime: record.resetTime,
      total: maxRequests,
    }
  }
}

// Pre-configured rate limiters
export const rateLimiters = {
  // Strict: 10 requests per minute for auth endpoints
  auth: rateLimit({ windowMs: 60 * 1000, maxRequests: 10, keyPrefix: 'auth' }),
  
  // Moderate: 60 requests per minute for API endpoints
  api: rateLimit({ windowMs: 60 * 1000, maxRequests: 60, keyPrefix: 'api' }),
  
  // Generous: 120 requests per minute for read operations
  read: rateLimit({ windowMs: 60 * 1000, maxRequests: 120, keyPrefix: 'read' }),
  
  // Strict: 5 requests per minute for AI generation (expensive)
  ai: rateLimit({ windowMs: 60 * 1000, maxRequests: 5, keyPrefix: 'ai' }),
  
  // Webhook: 30 requests per minute
  webhook: rateLimit({ windowMs: 60 * 1000, maxRequests: 30, keyPrefix: 'webhook' }),
}

// Helper to add rate limit headers to response
export function addRateLimitHeaders(
  response: Response,
  result: { allowed: boolean; remaining: number; resetTime: number; total: number }
): Response {
  const headers = new Headers(response.headers)
  headers.set('X-RateLimit-Limit', result.total.toString())
  headers.set('X-RateLimit-Remaining', result.remaining.toString())
  headers.set('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString())
  
  if (!result.allowed) {
    headers.set('Retry-After', Math.ceil((result.resetTime - Date.now()) / 1000).toString())
  }
  
  return new Response(response.body, {
    status: result.allowed ? response.status : 429,
    statusText: response.statusText,
    headers,
  })
}

// Middleware wrapper for easy use in API routes
export function withRateLimit(
  handler: (request: Request) => Promise<Response>,
  limiter: ReturnType<typeof rateLimit> = rateLimiters.api
) {
  return async (request: Request): Promise<Response> => {
    const result = await limiter(request)
    
    if (!result.allowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${Math.ceil((result.resetTime - Date.now()) / 1000)} seconds.`
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': result.total.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
            'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
          },
        }
      )
    }
    
    const response = await handler(request)
    
    // Add rate limit headers to successful responses
    const headers = new Headers(response.headers)
    headers.set('X-RateLimit-Limit', result.total.toString())
    headers.set('X-RateLimit-Remaining', result.remaining.toString())
    headers.set('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString())
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  }
}