import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client for Next.js Server Components and Route Handlers.
// Uses process.env directly — safe on the server, not bundled into the client.
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase env vars not set')
  return createClient(url, key)
}
