import { useEffect, useState } from 'react'
import { getSupabase } from '../services/supabase'
import { isNeonConfigured } from '../services/neon'
import { fetchRecentEvents } from '../services/events'
import type { DisplayEvent } from '../types/event'

/**
 * Live list of recent display events.
 */
export function useDisplayEvents(limit = 50) {
  const [events, setEvents] = useState<DisplayEvent[]>([])

  useEffect(() => {
    const sb = getSupabase()
    let cancelled = false

    const load = () => {
      fetchRecentEvents(limit)
        .then((rows) => {
          if (!cancelled) setEvents(rows)
        })
        .catch((err) => {
          if (!cancelled) console.warn('fetchRecentEvents failed', err)
        })
    }

    if (isNeonConfigured()) {
      load()
      const id = setInterval(load, 20_000)
      return () => {
        cancelled = true
        clearInterval(id)
      }
    }

    if (sb) {
      load()
      const channel = sb
        .channel('events-inserts')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'display_events' },
          (payload) => {
            if (cancelled) return
            const incoming = (payload as unknown as { new: DisplayEvent }).new
            setEvents((prev) => [incoming, ...prev].slice(0, limit))
          },
        )
        .subscribe()

      return () => {
        cancelled = true
        sb.removeChannel(channel)
      }
    }

    return () => {
      cancelled = true
    }
  }, [limit])

  return events
}
