import { callPortalApi, isNeonConfigured } from './neon'
import type { CommandType, DisplayCommand } from '../types/command'

/** Fetches the most recent N commands across all displays from Neon Postgres. */
export async function fetchRecentCommands(limit = 30): Promise<DisplayCommand[]> {
  if (!isNeonConfigured()) return []
  const rows = await callPortalApi<DisplayCommand[]>({
    action: 'list_commands',
    limit,
  })
  return rows ?? []
}

/**
 * Insert a new command for a display into Neon Postgres. Returns the inserted command.
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
  if (res.ok) {
    const data = (await res.json()) as DisplayCommand
    window.dispatchEvent(new CustomEvent('nu-commands-updated'))
    return data
  }

  const err = await res.json().catch(() => ({ error: res.statusText }))
  throw new Error(err.error || 'Neon database not configured')
}
