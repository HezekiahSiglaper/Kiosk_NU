import { useEffect, useState } from 'react'
import { getSupabase } from '../services/supabase'
import { isNeonConfigured } from '../services/neon'
import { fetchRecentCommands } from '../services/commands'
import type { DisplayCommand } from '../types/command'

/**
 * Live list of recent display commands.
 */
export function useDisplayCommands(limit = 30) {
  const [commands, setCommands] = useState<DisplayCommand[]>([])

  useEffect(() => {
    const sb = getSupabase()
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

    if (isNeonConfigured()) {
      load()
      window.addEventListener('nu-commands-updated', load)
      const id = setInterval(load, 20_000)
      return () => {
        cancelled = true
        window.removeEventListener('nu-commands-updated', load)
        clearInterval(id)
      }
    }

    if (sb) {
      load()
      const channel = sb
        .channel('commands-changes')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'display_commands' },
          (payload) => {
            if (cancelled) return
            const incoming = (payload as unknown as { new: DisplayCommand }).new
            setCommands((prev) => [incoming, ...prev].slice(0, limit))
          },
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'display_commands' },
          (payload) => {
            if (cancelled) return
            const updated = (payload as unknown as { new: DisplayCommand }).new
            setCommands((prev) => {
              const idx = prev.findIndex((c) => c.id === updated.id)
              if (idx === -1) return prev
              const next = prev.slice()
              next[idx] = updated
              return next
            })
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

  return commands
}
