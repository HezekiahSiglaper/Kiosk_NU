import { useEffect, useState } from 'react'
import { isNeonConfigured } from '../services/neon'
import { fetchRecentEvents } from '../services/events'
import type { DisplayEvent } from '../types/event'

const SECURITY_EVENT_TYPES = new Set([
  'security_warning',
  'security_critical',
  'kiosk_escape_detected',
  'focus_lost',
  'auto_recovery_triggered',
])

/**
 * Live list of recent security events from Neon Postgres,
 * polled every 20 seconds and filtered by security event type.
 *
 * Returns up to `limit` events sorted newest first.
 */
export function useSecurityEvents(limit = 30) {
  const [events, setEvents] = useState<DisplayEvent[]>([])

  useEffect(() => {
    if (!isNeonConfigured()) return
    let cancelled = false

    async function refresh() {
      if (cancelled) return
      const all = await fetchRecentEvents(200)
      if (cancelled) return
      setEvents(all.filter((e) => SECURITY_EVENT_TYPES.has(e.event_type)).slice(0, limit))
    }

    refresh().catch((err) => {
      if (!cancelled) console.warn('fetchRecentEvents (security) failed', err)
    })
    const id = setInterval(() => {
      refresh().catch((err) => {
        if (!cancelled) console.warn('fetchRecentEvents (security) failed', err)
      })
    }, 20_000)

    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [limit])

  return events
}
