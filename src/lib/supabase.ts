import { createBrowserClient } from '@supabase/auth-helpers-nextjs'

function isValidUrl(url: string | undefined): boolean {
  if (!url) return false
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!isValidUrl(supabaseUrl) || !anonKey) {
    throw new Error('Supabase not configured: missing or invalid NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  if (browserClient) return browserClient

  browserClient = createBrowserClient(supabaseUrl as string, anonKey as string)
  return browserClient
}