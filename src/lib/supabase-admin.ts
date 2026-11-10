import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Service-role client for server-only use.
 * Bypasses RLS — use ONLY where anonymous access is required
 * (e.g. resolving /go/<shortCode> redirects for logged-out visitors).
 * Never expose this client to the browser.
 */
let adminClient: SupabaseClient | null = null

export function createAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase admin not configured: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  if (adminClient) return adminClient

  adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
  return adminClient
}
