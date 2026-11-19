import { callPortalApi, isNeonConfigured } from './neon'
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

let _seedPromise: Promise<KioskContentItem[]> | null = null

export async function fetchKioskContent(): Promise<KioskContentItem[]> {
  if (isNeonConfigured()) {
    const rows = await callPortalApi<KioskContentItem[]>({ action: 'list_content' })
    if (rows) {
      if (rows.length > 0) return rows
      if (!_seedPromise) {
        _seedPromise = (async () => {
          const seeded: KioskContentItem[] = []
          for (const seed of INITIAL_SEED_CONTENT) {
            const created = await callPortalApi<KioskContentItem>({
              action: 'create_content',
              item: seed,
            })
            if (created) seeded.push(created)
          }
          return seeded
        })()
      }
      const seeded = await _seedPromise
      if (seeded.length > 0) return seeded
      return rows
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

  if (isNeonConfigured()) {
    const created = await callPortalApi<KioskContentItem>({
      action: 'create_content',
      item: payload,
    })
    if (created) {
      window.dispatchEvent(new CustomEvent('nu-kiosk-content-updated'))
      return created
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

  if (isNeonConfigured() && !id.startsWith('local-') && !id.startsWith('seed-')) {
    const updated = await callPortalApi<KioskContentItem>({
      action: 'update_content',
      id,
      updates,
    })
    if (updated) {
      window.dispatchEvent(new CustomEvent('nu-kiosk-content-updated'))
      return updated
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
  if (isNeonConfigured() && !id.startsWith('local-') && !id.startsWith('seed-')) {
    const res = await callPortalApi<{ ok: boolean }>({
      action: 'delete_content',
      id,
    })
    if (res?.ok) {
      window.dispatchEvent(new CustomEvent('nu-kiosk-content-updated'))
      return
    }
  }

  const current = loadLocalItems()
  saveLocalItems(current.filter((item) => item.id !== id))
}

export type ImageCheckReport = {
  valid: boolean
  status: 'pass' | 'warn' | 'error'
  fileName: string
  fileSizeText: string
  dimensionsText: string
  orientationText: string
  messages: string[]
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
])

function readImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth || 1080, height: img.naturalHeight || 1920 })
    img.onerror = () => resolve({ width: 0, height: 0 })
    img.src = dataUrl
  })
}

function formatBytes(bytes: number): string {
  const sizeMb = bytes / (1024 * 1024)
  return sizeMb >= 1
    ? `${sizeMb.toFixed(2)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function estimateDataUrlBytes(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(',')
  if (commaIdx === -1) return dataUrl.length
  return Math.round(((dataUrl.length - commaIdx - 1) * 3) / 4)
}

function loadHtmlImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

async function compressImageForKiosk(
  dataUrl: string,
  mimeType: string,
): Promise<{ url: string; bytes: number; compressed: boolean }> {
  const originalBytes = estimateDataUrlBytes(dataUrl)
  if (mimeType === 'image/svg+xml' || mimeType === 'image/gif') {
    return { url: dataUrl, bytes: originalBytes, compressed: false }
  }

  const img = await loadHtmlImage(dataUrl)
  if (!img || !img.naturalWidth || !img.naturalHeight) {
    return { url: dataUrl, bytes: originalBytes, compressed: false }
  }

  const scale = Math.min(1, 1080 / img.naturalWidth, 1920 / img.naturalHeight)
  const targetW = Math.max(1, Math.round(img.naturalWidth * scale))
  const targetH = Math.max(1, Math.round(img.naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return { url: dataUrl, bytes: originalBytes, compressed: false }
  }
  ctx.drawImage(img, 0, 0, targetW, targetH)

  let candidate = canvas.toDataURL('image/webp', 0.82)
  if (!candidate.startsWith('data:image/webp')) {
    candidate = canvas.toDataURL('image/jpeg', 0.82)
  }

  const candidateBytes = estimateDataUrlBytes(candidate)
  if (candidateBytes > 0 && candidateBytes < originalBytes) {
    return { url: candidate, bytes: candidateBytes, compressed: true }
  }
  return { url: dataUrl, bytes: originalBytes, compressed: false }
}

/**
 * Validates file type, file size, and inspects image resolution & aspect ratio
 * before compressing and encoding as a Data URL for Neon Postgres storage.
 */
export async function validateAndUploadMedia(
  file: File,
): Promise<{ url: string | null; report: ImageCheckReport }> {
  const fileSizeText = formatBytes(file.size)

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return {
      url: null,
      report: {
        valid: false,
        status: 'error',
        fileName: file.name,
        fileSizeText,
        dimensionsText: '—',
        orientationText: 'Unsupported Format',
        messages: [
          `Unsupported file type (${file.type || 'unknown'}). Please upload a PNG, JPG, WebP, or GIF image.`,
        ],
      },
    }
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      url: null,
      report: {
        valid: false,
        status: 'error',
        fileName: file.name,
        fileSizeText,
        dimensionsText: '—',
        orientationText: 'File Too Large',
        messages: [
          `File is ${fileSizeText}, which exceeds the 10 MB maximum for kiosk screens. Please export a compressed PNG or JPG.`,
        ],
      },
    }
  }

  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Failed to read image file'))
    reader.readAsDataURL(file)
  })

  const { width, height } = await readImageDimensions(dataUrl)
  const messages: string[] = []
  let status: 'pass' | 'warn' = 'pass'

  const ratio = height > 0 ? width / height : 9 / 16
  const isPortrait = height >= width
  const isCloseTo9x16 = Math.abs(ratio - 9 / 16) <= 0.12

  if (!isPortrait) {
    status = 'warn'
    messages.push(
      `Landscape image detected (${width}×${height}). Campus kiosks are vertical (1080×1920, 9:16), so edges may be cropped or letterboxed.`,
    )
  } else if (!isCloseTo9x16) {
    status = 'warn'
    messages.push(
      `Portrait image (${width}×${height}) differs slightly from the standard 9:16 (1080×1920) kiosk ratio.`,
    )
  } else {
    messages.push('✓ Aspect ratio matches 9:16 vertical kiosk screen.')
  }

  if (width > 0 && width < 720) {
    status = 'warn'
    messages.push(
      `Low resolution (${width}×${height}px). 1080×1920px is recommended for sharp text on 55" kiosk displays.`,
    )
  } else if (width >= 720) {
    messages.push(`✓ High-definition resolution (${width}×${height}px).`)
  }

  messages.push(`✓ File size & format verified (${fileSizeText}).`)

  const { url: optimizedUrl, bytes: optimizedBytes, compressed } =
    await compressImageForKiosk(dataUrl, file.type)
  if (compressed) {
    messages.push(
      `✓ Auto-optimized for fast Neon & kiosk sync (${formatBytes(optimizedBytes)}).`,
    )
  }

  return {
    url: optimizedUrl,
    report: {
      valid: true,
      status,
      fileName: file.name,
      fileSizeText,
      dimensionsText: width > 0 ? `${width}×${height}px` : 'Vector / SVG',
      orientationText: isPortrait ? '9:16 Portrait' : 'Landscape',
      messages,
    },
  }
}

export async function uploadContentMedia(file: File): Promise<string> {
  const { url, report } = await validateAndUploadMedia(file)
  if (!url) {
    throw new Error(report.messages[0] || 'Invalid image file')
  }
  return url
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
