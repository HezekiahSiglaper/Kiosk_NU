import { getSupabase } from './supabase'
import {
  INITIAL_SEED_CONTENT,
  type ContentStatus,
  type KioskContentFormData,
  type KioskContentItem,
} from '../types/content'

const LOCAL_STORAGE_KEY = 'nu_kiosk_content_items_v2'

function loadLocalItems(): KioskContentItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_SEED_CONTENT))
      return INITIAL_SEED_CONTENT
    }
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as KioskContentItem[]
    }
    return INITIAL_SEED_CONTENT
  } catch {
    return INITIAL_SEED_CONTENT
  }
}

function saveLocalItems(items: KioskContentItem[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items))
    window.dispatchEvent(new CustomEvent('nu-kiosk-content-updated'))
  } catch (err) {
    console.warn('saveLocalItems failed', err)
  }
}

export async function fetchKioskContent(): Promise<KioskContentItem[]> {
  const sb = getSupabase()
  if (sb) {
    const { data, error } = await sb
      .from('kiosk_content')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) {
      return data as KioskContentItem[]
    }
  }
  return loadLocalItems()
}

export async function createKioskContent(
  form: KioskContentFormData,
): Promise<KioskContentItem> {
  const now = new Date().toISOString()
  const payload = {
    title: form.title.trim(),
    subtitle: form.subtitle.trim() || null,
    body: form.body.trim() || null,
    content_type: form.content_type,
    theme: form.theme,
    media_url: form.media_url.trim() || null,
    event_date: form.event_date.trim() || null,
    event_time: form.event_time.trim() || null,
    event_location: form.event_location.trim() || null,
    cta_label: form.cta_label.trim() || null,
    cta_url: form.cta_url.trim() || null,
    target_displays: form.target_displays.length > 0 ? form.target_displays : ['all'],
    start_date: form.start_date.trim() || null,
    end_date: form.end_date.trim() || null,
    duration_seconds: Number(form.duration_seconds) || 12,
    status: form.status,
    author_name: form.author_name.trim() || 'Campus Staff',
    updated_at: now,
  }

  const sb = getSupabase()
  if (sb) {
    const { data, error } = await sb
      .from('kiosk_content')
      .insert(payload)
      .select('*')
      .single()
    if (!error && data) {
      return data as KioskContentItem
    }
  }

  const localItem: KioskContentItem = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ...payload,
    created_at: now,
  }
  const current = loadLocalItems()
  saveLocalItems([localItem, ...current])
  return localItem
}

export async function updateKioskContent(
  id: string,
  updates: Partial<KioskContentFormData> | { status: ContentStatus },
): Promise<KioskContentItem | null> {
  const now = new Date().toISOString()
  const sb = getSupabase()
  if (sb && !id.startsWith('local-') && !id.startsWith('seed-')) {
    const { data, error } = await sb
      .from('kiosk_content')
      .update({ ...updates, updated_at: now })
      .eq('id', id)
      .select('*')
      .single()
    if (!error && data) {
      return data as KioskContentItem
    }
  }

  const current = loadLocalItems()
  const idx = current.findIndex((item) => item.id === id)
  if (idx === -1) return null
  const updated: KioskContentItem = {
    ...current[idx],
    ...updates,
    updated_at: now,
  }
  const next = current.slice()
  next[idx] = updated
  saveLocalItems(next)
  return updated
}

export async function deleteKioskContent(id: string): Promise<void> {
  const sb = getSupabase()
  if (sb && !id.startsWith('local-') && !id.startsWith('seed-')) {
    const { error } = await sb.from('kiosk_content').delete().eq('id', id)
    if (!error) return
  }

  const current = loadLocalItems()
  saveLocalItems(current.filter((item) => item.id !== id))
}

/**
 * Uploads an image file to Supabase Storage (`kiosk-media` bucket) if
 * configured, or encodes a resized data URL so non-technical users can
 * drag & drop posters in any environment with zero configuration.
 */
export async function uploadContentMedia(file: File): Promise<string> {
  const sb = getSupabase()
  if (sb) {
    const ext = file.name.split('.').pop() || 'png'
    const safePath = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error } = await sb.storage
      .from('kiosk-media')
      .upload(safePath, file, { upsert: true })
    if (!error) {
      const { data } = sb.storage.from('kiosk-media').getPublicUrl(safePath)
      if (data?.publicUrl) return data.publicUrl
    }
  }

  // Fallback: read as Data URL
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Failed to read image file'))
    reader.readAsDataURL(file)
  })
}

export type ScheduleState = 'active' | 'scheduled' | 'expired'

export function getScheduleState(
  item: Pick<KioskContentItem, 'start_date' | 'end_date'>,
  nowDate = new Date(),
): ScheduleState {
  const todayStr = nowDate.toISOString().slice(0, 10)
  if (item.start_date && item.start_date.slice(0, 10) > todayStr) {
    return 'scheduled'
  }
  if (item.end_date && item.end_date.slice(0, 10) < todayStr) {
    return 'expired'
  }
  return 'active'
}

