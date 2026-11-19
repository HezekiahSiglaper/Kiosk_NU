import { useEffect, useState } from 'react'
import { isNeonConfigured } from '../services/neon'
import { fetchRecentEvents } from '../services/events'
import type { DisplayEvent } from '../types/event'

/**
 * Live list of recent display events from Neon Postgres.
 */
export function useDisplayEvents(limit = 50) {
  const [events, setEvents] = useState<DisplayEvent[]>([])

  useEffect(() => {
    if (!isNeonConfigured()) return
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

    load()
    const id = setInterval(load, 20_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [limit])

  return events
}
