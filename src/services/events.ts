import { callPortalApi, isNeonConfigured } from './neon'
import type { DisplayEvent, EventType } from '../types/event'

/** Fetches the most recent N events for the Recent Events panel from Neon Postgres. */
export async function fetchRecentEvents(limit = 50): Promise<DisplayEvent[]> {
  if (!isNeonConfigured()) return []
  const rows = await callPortalApi<DisplayEvent[]>({
    action: 'list_events',
    limit,
  })
  return rows ?? []
}

/** Inserts an event row into Neon Postgres. Best-effort: errors are logged, not thrown. */
export async function logEvent(
  eventType: EventType,
  opts: { displayId?: string | null; message?: string | null } = {},
): Promise<void> {
  if (!isNeonConfigured()) return
  await callPortalApi({
    action: 'log_event',
    event_type: eventType,
    display_id: opts.displayId ?? null,
    message: opts.message ?? null,
  })
}
