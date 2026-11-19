import { useEffect, useState } from 'react'
import { isNeonConfigured } from '../services/neon'
import { fetchRecentCommands } from '../services/commands'
import type { DisplayCommand } from '../types/command'

/**
 * Live list of recent display commands from Neon Postgres.
 */
export function useDisplayCommands(limit = 30) {
  const [commands, setCommands] = useState<DisplayCommand[]>([])

  useEffect(() => {
    if (!isNeonConfigured()) return
    let cancelled = false

    const load = () => {
      fetchRecentCommands(limit)
        .then((rows) => {
          if (!cancelled) setCommands(rows)
        })
        .catch((err) => {
          if (!cancelled) console.warn('fetchRecentCommands failed', err)
        })
    }

    load()
    window.addEventListener('nu-commands-updated', load)
    const id = setInterval(load, 20_000)
    return () => {
      cancelled = true
      window.removeEventListener('nu-commands-updated', load)
      clearInterval(id)
    }
  }, [limit])

  return commands
}
