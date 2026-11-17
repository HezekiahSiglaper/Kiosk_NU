import { getSupabase } from './supabase'
import { callPortalApi, isNeonConfigured } from './neon'
import { EMPTY_ROSTER, type Display } from '../types/display'

/**
 * Fetches all displays from Neon Postgres (`/api/portal`) or Supabase.
 * Falls back to `EMPTY_ROSTER` when neither is configured.
 */
export async function fetchDisplays(): Promise<Display[]> {
  if (isNeonConfigured()) {
    const rows = await callPortalApi<Display[]>({ action: 'list_displays' })
    if (rows && rows.length > 0) return rows
  }
  const sb = getSupabase()
  if (!sb) return EMPTY_ROSTER
  const { data, error } = await sb.from('displays').select('*').order('name')
  if (error) {
    console.warn('fetchDisplays error', error)
    return EMPTY_ROSTER
  }
  return (data ?? []) as Display[]
}

/**
 * Updates the heartbeat / status fields for a single display.
 */
export async function writeHeartbeat(
  id: string,
  fields: Partial<Display>,
): Promise<void> {
  if (isNeonConfigured()) {
    await callPortalApi({ action: 'heartbeat', id, fields })
    return
  }
  const sb = getSupabase()
  if (!sb) return
  const { error } = await sb.from('displays').update(fields).eq('id', id)
  if (error) console.warn('writeHeartbeat error', error)
}
