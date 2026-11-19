import { callPortalApi, isNeonConfigured } from './neon'
import { EMPTY_ROSTER, type Display } from '../types/display'

/**
 * Fetches all displays from Neon Postgres (`/api/portal`).
 * Returns `EMPTY_ROSTER` when Neon isn't configured.
 */
export async function fetchDisplays(): Promise<Display[]> {
  if (!isNeonConfigured()) return EMPTY_ROSTER
  const rows = await callPortalApi<Display[]>({ action: 'list_displays' })
  return rows && rows.length > 0 ? rows : EMPTY_ROSTER
}

/**
 * Updates the heartbeat / status fields for a single display in Neon Postgres.
 */
export async function writeHeartbeat(
  id: string,
  fields: Partial<Display>,
): Promise<void> {
  if (!isNeonConfigured()) return
  await callPortalApi({ action: 'heartbeat', id, fields })
}
