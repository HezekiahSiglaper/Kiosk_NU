import { getSupabase } from './supabase'
import { callPortalApi, isNeonConfigured } from './neon'
import type { CommandType, DisplayCommand } from '../types/command'

/** Fetches the most recent N commands across all displays (for the history panel). */
export async function fetchRecentCommands(limit = 30): Promise<DisplayCommand[]> {
  if (isNeonConfigured()) {
    const rows = await callPortalApi<DisplayCommand[]>({
      action: 'list_commands',
      limit,
    })
    if (rows) return rows
  }
  const sb = getSupabase()
  if (!sb) return []
  const { data, error } = await sb
    .from('display_commands')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    console.warn('fetchRecentCommands error', error)
    return []
  }
  return (data ?? []) as DisplayCommand[]
}

/**
 * Insert a new command for a display. Returns the inserted command.
 */
export async function sendCommand(
  displayId: string,
  command: CommandType,
  payload: Record<string, unknown> = {},
): Promise<DisplayCommand> {
  if (isNeonConfigured()) {
    const created = await callPortalApi<DisplayCommand>({
      action: 'send_command',
      display_id: displayId,
      command,
      payload,
    })
    if (created) {
      window.dispatchEvent(new CustomEvent('nu-commands-updated'))
      return created
    }
  }

  const res = await fetch('/api/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ display_id: displayId, command, payload }),
  })
  if (res.ok) return (await res.json()) as DisplayCommand

  // Vite dev has no /api folder; fall back to the anon client locally.
  if (res.status === 404) {
    const sb = getSupabase()
    if (!sb) throw new Error('Database not configured')
    const { data, error } = await sb
      .from('display_commands')
      .insert({ display_id: displayId, command, payload })
      .select('*')
      .single()
    if (error) throw error
    return data as DisplayCommand
  }

  const err = await res.json().catch(() => ({ error: res.statusText }))
  throw new Error(err.error || 'Command failed')
}
