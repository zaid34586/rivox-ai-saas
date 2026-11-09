import { createServerClient as createSupabaseServerClient, type CookieOptions } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function createServerClient() {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase not configured: missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  try {
    new URL(supabaseUrl)
  } catch {
    throw new Error('Invalid NEXT_PUBLIC_SUPABASE_URL: must be a valid HTTP/HTTPS URL')
  }

  return createSupabaseServerClient(
    supabaseUrl,
    anonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Ignore - Server Component context
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Ignore - Server Component context
          }
        },
      },
    }
  )
}