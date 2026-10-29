import { useCallback, useEffect, useState } from 'react'
import { getSupabase } from '../services/supabase'
import {
  createKioskContent,
  deleteKioskContent,
  fetchKioskContent,
  updateKioskContent,
} from '../services/content'
import type {
  ContentStatus,
  KioskContentFormData,
  KioskContentItem,
} from '../types/content'

export function useKioskContent() {
  const [items, setItems] = useState<KioskContentItem[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const rows = await fetchKioskContent()
    setItems(rows)
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchKioskContent().then((rows) => {
      if (cancelled) return
      setItems(rows)
      setLoading(false)
    })

    const handleLocalUpdate = () => {
      fetchKioskContent().then((rows) => {
        if (!cancelled) setItems(rows)
      })
    }
    window.addEventListener('nu-kiosk-content-updated', handleLocalUpdate)

    const sb = getSupabase()
    if (!sb) {
      return () => {
        cancelled = true
        window.removeEventListener('nu-kiosk-content-updated', handleLocalUpdate)
      }
    }

    const channel = sb
      .channel('kiosk-content-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kiosk_content' },
        () => {
          if (!cancelled) refresh()
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      window.removeEventListener('nu-kiosk-content-updated', handleLocalUpdate)
      sb.removeChannel(channel)
    }
  }, [refresh])

  const createItem = useCallback(async (form: KioskContentFormData) => {
    const created = await createKioskContent(form)
    setItems((prev) => {
      if (prev.some((i) => i.id === created.id)) return prev
      return [created, ...prev]
    })
    return created
  }, [])

  const updateItem = useCallback(
    async (
      id: string,
      updates: Partial<KioskContentFormData> | { status: ContentStatus },
    ) => {
      const updated = await updateKioskContent(id, updates)
      if (updated) {
        setItems((prev) => prev.map((i) => (i.id === id ? updated : i)))
      }
      return updated
    },
    [],
  )

  const removeItem = useCallback(async (id: string) => {
    await deleteKioskContent(id)
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  return {
    items,
    loading,
    refresh,
    createItem,
    updateItem,
    removeItem,
  }
}

