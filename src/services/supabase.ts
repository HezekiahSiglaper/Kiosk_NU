import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { isNeonConfigured } from './neon'

/**
 * Single Supabase client used everywhere in the app.
 * Returns null if the env vars are missing — in that case the dashboard
 * uses Neon (`/api/portal`) or falls back to local URL-polling.
 */
let _client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (_client) return _client
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  _client = createClient(url, key, {
    realtime: { params: { eventsPerSecond: 5 } },
    auth: { persistSession: true },
  })
  return _client
}

export function isSupabaseConfigured(): boolean {
  return (
    isNeonConfigured() ||
    (Boolean(import.meta.env.VITE_SUPABASE_URL) &&
      Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY))
  )
}
