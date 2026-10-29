import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useKioskContent } from '../hooks/useKioskContent'
import { fetchDisplays } from '../services/displays'
import { uploadContentMedia, getScheduleState } from '../services/content'
import { sendCommand } from '../services/commands'
import { isSupabaseConfigured } from '../services/supabase'
import { KioskSlidePreview } from '../components/KioskSlidePreview'
import { KioskPlaylistModal } from '../components/KioskPlaylistModal'
import { KioskOwnersModal } from '../components/KioskOwnersModal'
import { Button } from '../components/Button'
import {
  IconCheck,
  IconClock,
  IconDisplay,
  IconExternal,
  IconImage,
  IconTrash,
} from '../components/icons'
import {
  DEFAULT_CAMPUS_DISPLAYS,
  EMPTY_CONTENT_FORM,
  type CampusDisplayOption,
  type ContentStatus,
  type KioskContentFormData,
  type KioskContentItem,
} from '../types/content'

export default function ContentPortalPage() {
  const {
    user,
    ownsDisplay,
    canDirectlyPublishTo,
    canManageContentItem,
    getDisplayOwner,
  } = useAuth()
  const { items, loading, createItem, updateItem, removeItem } = useKioskContent()
  const [campusDisplays, setCampusDisplays] = useState<CampusDisplayOption[]>(
    DEFAULT_CAMPUS_DISPLAYS,
  )

  useEffect(() => {
    let cancelled = false
    fetchDisplays().then((rows) => {
      if (!cancelled && rows.length > 0) {
        setCampusDisplays(
          rows.map((d) => ({
            id: d.id,
            name: d.name,
            location: d.location,
            orientation: d.orientation || 'Portrait',
          })),
        )
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const defaultFormForUser = useMemo<KioskContentFormData>(() => {
    if (!user) return EMPTY_CONTENT_FORM
    const defaultTargets =
      user.role === 'super_admin'
        ? ['all']
        : user.assigned_displays.length > 0
          ? user.assigned_displays
          : ['all']
    return {
      ...EMPTY_CONTENT_FORM,
      subtitle: `${user.department.split('(')[0].trim()} · Imported Slide`,
      target_displays: defaultTargets,
      author_name: `${user.full_name} · ${user.department.split('(')[0].trim()}`,
    }
  }, [user])

  const [form, setForm] = useState<KioskContentFormData>(defaultFormForUser)
  const [importMode, setImportMode] = useState<'upload' | 'url'>('upload')
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Library filters
  const [statusFilter, setStatusFilter] = useState<'all' | ContentStatus>('all')
  const [displayFilter, setDisplayFilter] = useState<string>('all')
  const [onlyMyKiosksFilter, setOnlyMyKiosksFilter] = useState<boolean>(false)

  // Modals
  const [playlistModalOpen, setPlaylistModalOpen] = useState(false)
  const [playlistDisplayId, setPlaylistDisplayId] = useState<string>('all')
  const [ownersModalOpen, setOwnersModalOpen] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setForm(defaultFormForUser)
  }, [defaultFormForUser])

  const showToast = (text: string) => {
    setToast(text)
    setTimeout(() => {
      setToast((prev) => (prev === text ? null : prev))
    }, 4000)
  }

  const updateField = <K extends keyof KioskContentFormData>(
    key: K,
    value: KioskContentFormData[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleToggleDisplay = (displayId: string) => {
    if (displayId === 'all') {
      updateField('target_displays', ['all'])
      return
    }
    setForm((prev) => {
      const withoutAll = prev.target_displays.filter((id) => id !== 'all')
      const exists = withoutAll.includes(displayId)
      const next = exists
        ? withoutAll.filter((id) => id !== displayId)
        : [...withoutAll, displayId]
      return {
        ...prev,
        target_displays:
          next.length > 0
            ? next
            : user && user.assigned_displays.length > 0
              ? user.assigned_displays
              : ['all'],
      }
    })
  }

  const handleFileUpload = async (file: File | undefined) => {
    if (!file) return
    setUploadingImage(true)
    try {
      const url = await uploadContentMedia(file)
      const cleanName = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
      setForm((prev) => ({
        ...prev,
        content_type: 'poster',
        media_url: url,
        title: prev.title.trim() || cleanName,
        subtitle: `Uploaded File · ${file.name}`,
      }))
      showToast(`Imported "${file.name}" — ready to post!`)
    } catch {
      showToast('Could not read that file. Please try a PNG, JPG, or WebP image.')
    } finally {
      setUploadingImage(false)
    }
  }

  const canPublishSelectionDirectly = canDirectlyPublishTo(form.target_displays)

  const handlePostSlide = async (desiredStatus: ContentStatus) => {
    if (!form.media_url.trim()) {
      showToast('Please upload a slide image or paste a link in Step 1 first.')
      return
    }

    const effectiveTitle =
      form.title.trim() ||
      `Imported Slide (${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`

    const effectiveStatus: ContentStatus =
      desiredStatus === 'published' && !canPublishSelectionDirectly
        ? 'pending_review'
        : desiredStatus

    setSaving(true)
    try {
      const payload: KioskContentFormData = {
        ...form,
        title: effectiveTitle,
        content_type: importMode === 'url' ? 'media' : 'poster',
        status: effectiveStatus,
      }

      await createItem(payload)
      showToast(
        effectiveStatus === 'published'
          ? 'Posted live to your kiosk(s)!'
          : 'Submitted to the kiosk owner for approval!',
      )

      if (effectiveStatus === 'published' && isSupabaseConfigured()) {
        const targets = payload.target_displays.includes('all')
          ? campusDisplays.map((d) => d.id)
          : payload.target_displays
        targets.slice(0, 5).forEach((id) => {
          sendCommand(id, 'reload').catch(() => {})
        })
      }

      setForm(defaultFormForUser)
    } finally {
      setSaving(false)
    }
  }

  const handleSplitPublishAndRequest = async () => {
    if (!user || !form.media_url.trim()) {
      showToast('Please upload a slide image or paste a link in Step 1 first.')
      return
    }
    const effectiveTitle =
      form.title.trim() ||
      `Imported Slide (${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`

    const allIds = campusDisplays.map((d) => d.id)
    const selectedIds = form.target_displays.includes('all')
      ? allIds
      : form.target_displays
    const ownedSelected = selectedIds.filter((id) => ownsDisplay(id))
    const unownedSelected = selectedIds.filter((id) => !ownsDisplay(id))

    setSaving(true)
    try {
      if (ownedSelected.length > 0) {
        await createItem({
          ...form,
          title: effectiveTitle,
          target_displays: ownedSelected,
          status: 'published',
        })
      }
      if (unownedSelected.length > 0) {
        await createItem({
          ...form,
          title: effectiveTitle,
          target_displays: unownedSelected,
          status: 'pending_review',
        })
      }
      showToast(
        `Posted live to your ${ownedSelected.length} kiosk(s) & requested approval for ${unownedSelected.length} other kiosk(s)!`,
      )
      setForm(defaultFormForUser)
    } finally {
      setSaving(false)
    }
  }

  const handleQuickStatusChange = async (
    item: KioskContentItem,
    status: ContentStatus,
  ) => {
    if (!canManageContentItem(item)) {
      showToast('Only the assigned owner of this kiosk can change its status.')
      return
    }
    await updateItem(item.id, { status })
    showToast(
      status === 'published'
        ? 'Approved and posted live to kiosk!'
        : 'Removed from live kiosk rotation.',
    )
  }

  const counts = useMemo(() => {
    return {
      all: items.length,
      published: items.filter((i) => i.status === 'published').length,
      pending_review: items.filter((i) => i.status === 'pending_review').length,
    }
  }, [items])

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false
      if (displayFilter !== 'all') {
        const matchesDisplay =
          item.target_displays.includes('all') ||
          item.target_displays.includes(displayFilter)
        if (!matchesDisplay) return false
      }
      if (onlyMyKiosksFilter && user && user.role !== 'super_admin') {
        const touchesMine =
          item.target_displays.includes('all') ||
          item.target_displays.some((id) => user.assigned_displays.includes(id))
        if (!touchesMine) return false
      }
      return true
    })
  }, [items, statusFilter, displayFilter, onlyMyKiosksFilter, user])

  const targetSummaryLabel = useMemo(() => {
    if (form.target_displays.includes('all')) return 'All 10 Campus Kiosks'
    const names = form.target_displays
      .map((id) => campusDisplays.find((d) => d.id === id)?.name || id)
      .slice(0, 2)
    const extra = form.target_displays.length - names.length
    return extra > 0 ? `${names.join(', ')} +${extra} more` : names.join(', ')
  }, [form.target_displays, campusDisplays])

  const myDisplayObjects = useMemo(() => {
    if (!user) return []
    if (user.role === 'super_admin') return campusDisplays
    return campusDisplays.filter((d) => user.assigned_displays.includes(d.id))
  }, [user, campusDisplays])

  return (
    <div className="space-y-10">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 nu-card px-5 py-3.5 border border-nu-tour/50 shadow-gold-glow flex items-center gap-3 bg-nu-midnight/95">
          <span className="w-6 h-6 rounded-full bg-nu-leaf/20 text-nu-leaf flex items-center justify-center">
            <IconCheck size={14} />
          </span>
          <span className="text-sm font-medium text-nu-wisp">{toast}</span>
        </div>
      )}

      {/* Kiosk Owner Top Bar */}
      {user && (
        <div className="nu-card p-5 border border-nu-tour/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-nu-tour text-nu-midnight">
                {user.role === 'super_admin' ? 'Super Admin' : 'Kiosk Owner'}
              </span>
              <span className="text-sm font-semibold text-nu-wisp">
                {user.full_name}
              </span>
              <span className="text-xs text-nu-skylight">· {user.department}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-nu-skylight">
              <span className="font-semibold text-nu-wisp">Your Kiosk(s):</span>
              {user.role === 'super_admin' ? (
                <span className="px-2.5 py-0.5 rounded-full bg-nu-leaf/20 text-nu-leaf border border-nu-leaf/40 text-[11px] font-semibold">
                  ★ All 10 Campus Kiosks
                </span>
              ) : (
                myDisplayObjects.map((d) => (
                  <span
                    key={d.id}
                    className="px-2.5 py-0.5 rounded-full bg-nu-leaf/20 text-nu-leaf border border-nu-leaf/40 text-[11px] font-semibold"
                  >
                    ★ {d.name}
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setOwnersModalOpen(true)}
            >
              {user.role === 'super_admin'
                ? 'Manage Kiosk Owners (10)'
                : 'Kiosk Owners Directory'}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={<IconDisplay size={14} />}
              onClick={() => {
                setPlaylistDisplayId(
                  user.role === 'super_admin'
                    ? 'all'
                    : user.assigned_displays[0] || 'all',
                )
                setPlaylistModalOpen(true)
              }}
            >
              Preview Live Kiosk ({counts.published})
            </Button>
          </div>
        </div>
      )}

      {/* Main 2-Column Layout: Left = Simple 2-Step Import & Post, Right = Fullscreen Kiosk Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Columns: Simple Import Workflow */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <div className="nu-eyebrow">Quick Kiosk Uploader</div>
            <h1 className="text-3xl font-serif text-nu-wisp mt-1">
              Import & Post to Your Kiosk
            </h1>
            <p className="text-sm text-nu-skylight mt-1">
              Design your slide in Canva, PowerPoint, or Adobe (1080×1920 vertical),
              then drop the exported graphic or share link below to post it to your kiosk.
            </p>
          </div>

          {/* STEP 1: Import Slide (File Upload or Link) */}
          <div className="nu-card p-6 space-y-5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-nu-tour text-nu-midnight font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <h2 className="text-lg font-serif text-nu-wisp">
                  Import Your Finished Slide
                </h2>
              </div>

              {/* Mode Switcher: Upload File vs Paste URL */}
              <div className="flex items-center gap-1 bg-nu-midnight/80 p-1 rounded-full border border-white/10">
                <button
                  type="button"
                  onClick={() => setImportMode('upload')}
                  className={[
                    'px-3 py-1 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5',
                    importMode === 'upload'
                      ? 'bg-nu-tour text-nu-midnight'
                      : 'text-nu-skylight hover:text-nu-wisp',
                  ].join(' ')}
                >
                  <IconImage size={12} />
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode('url')}
                  className={[
                    'px-3 py-1 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5',
                    importMode === 'url'
                      ? 'bg-nu-tour text-nu-midnight'
                      : 'text-nu-skylight hover:text-nu-wisp',
                  ].join(' ')}
                >
                  <IconExternal size={12} />
                  Paste Link / URL
                </button>
              </div>
            </div>

            {importMode === 'upload' ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  handleFileUpload(e.dataTransfer.files?.[0])
                }}
                onClick={() => fileInputRef.current?.click()}
                className={[
                  'cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors',
                  form.media_url
                    ? 'border-nu-leaf/60 bg-nu-leaf/[0.06]'
                    : 'border-nu-sky/35 hover:border-nu-tour bg-nu-midnight/50',
                ].join(' ')}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  name="poster_file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files?.[0])}
                />
                <div className="w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/15 flex items-center justify-center text-nu-tour mx-auto mb-3">
                  <IconImage size={24} />
                </div>
                <div className="text-base font-semibold text-nu-wisp">
                  {uploadingImage
                    ? 'Importing your slide...'
                    : form.media_url
                      ? '✓ Slide Graphic Imported — Click or drop to replace'
                      : 'Drag & drop your finished poster here, or click to browse'}
                </div>
                <div className="text-xs text-nu-skylight mt-1">
                  Supports PNG, JPG, WebP, GIF exported from Canva, PowerPoint, or Photoshop (1080×1920 recommended)
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-nu-skylight mb-1.5">
                  Canva / Google Slides / Image or Web URL
                </label>
                <input
                  type="url"
                  name="media_url"
                  autoComplete="off"
                  value={form.media_url}
                  onChange={(e) => updateField('media_url', e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl bg-nu-midnight/90 border border-white/15 px-3.5 py-2.5 text-sm text-nu-wisp placeholder:text-nu-skylight/40 focus:outline-none focus:border-nu-tour"
                />
                <p className="text-[11px] text-nu-skylight/70 mt-1.5">
                  Paste a direct image link, published Google Slide, Canva view link, or web page URL.
                </p>
              </div>
            )}

            {/* Simple Slide Label */}
            <div>
              <label className="block text-xs font-semibold text-nu-skylight mb-1.5">
                Slide Name (For Your Reference)
              </label>
              <input
                type="text"
                name="slide_title"
                autoComplete="off"
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="e.g., Chapel Worship Night Poster - Oct 28"
                className="w-full rounded-xl bg-nu-midnight/90 border border-white/15 px-3.5 py-2.5 text-sm text-nu-wisp placeholder:text-nu-skylight/40 focus:outline-none focus:border-nu-tour"
              />
            </div>
          </div>

          {/* STEP 2: Choose Kiosk(s) & Post */}
          <div className="nu-card p-6 space-y-5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-nu-tour text-nu-midnight font-bold text-xs flex items-center justify-center">
                  2
                </span>
                <div>
                  <h2 className="text-lg font-serif text-nu-wisp">
                    Select Kiosk(s) & Post
                  </h2>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {user && user.role !== 'super_admin' && user.assigned_displays.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      updateField('target_displays', user.assigned_displays)
                    }
                    className={[
                      'text-xs font-bold px-3 py-1 rounded-full border transition-colors',
                      !form.target_displays.includes('all') &&
                        canPublishSelectionDirectly
                        ? 'bg-nu-leaf text-nu-midnight border-nu-leaf'
                        : 'bg-nu-leaf/15 text-nu-leaf border-nu-leaf/40 hover:bg-nu-leaf/25',
                    ].join(' ')}
                  >
                    ★ My Kiosk(s) Only ({user.assigned_displays.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => updateField('target_displays', ['all'])}
                  className={[
                    'text-xs font-bold px-3 py-1 rounded-full border transition-colors',
                    form.target_displays.includes('all')
                      ? 'bg-nu-tour text-nu-midnight border-nu-tour'
                      : 'bg-white/5 text-nu-skylight border-white/15 hover:text-nu-wisp',
                  ].join(' ')}
                >
                  All 10 Campus Kiosks
                </button>
              </div>
            </div>

            {/* 10 Kiosks Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {campusDisplays.map((d) => {
                const isOwnedByMe = ownsDisplay(d.id)
                const ownerObj = getDisplayOwner(d.id)
                const selected =
                  form.target_displays.includes('all') ||
                  form.target_displays.includes(d.id)

                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => handleToggleDisplay(d.id)}
                    className={[
                      'p-3 rounded-xl border text-left transition-colors flex items-center justify-between gap-2',
                      selected
                        ? isOwnedByMe
                          ? 'bg-nu-leaf/15 border-nu-leaf text-nu-wisp'
                          : 'bg-nu-blue/25 border-nu-sky text-nu-wisp'
                        : 'bg-white/[0.02] border-white/10 text-nu-skylight/70 hover:bg-white/[0.05]',
                    ].join(' ')}
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold truncate">{d.name}</span>
                        {isOwnedByMe ? (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-nu-leaf/25 text-nu-leaf border border-nu-leaf/40">
                            ★ Your Kiosk
                          </span>
                        ) : (
                          <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-nu-amber/15 text-nu-tour border border-nu-amber/30">
                            Owner: {ownerObj?.full_name.split(' ')[0] || 'Staff'}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-nu-skylight truncate">
                        {d.location}
                      </div>
                    </div>
                    <span
                      className={[
                        'w-5 h-5 rounded-full text-[10px] flex items-center justify-center border shrink-0',
                        selected
                          ? 'bg-nu-leaf/25 border-nu-leaf text-nu-leaf'
                          : 'border-white/20 text-transparent',
                      ].join(' ')}
                    >
                      ✓
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Simple Schedule Options: Remove After Date + Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-white/10">
              <div>
                <label className="block text-xs font-semibold text-nu-skylight mb-1">
                  Auto-Remove After Date (Optional)
                </label>
                <input
                  type="date"
                  name="end_date"
                  autoComplete="off"
                  value={form.end_date}
                  onChange={(e) => updateField('end_date', e.target.value)}
                  className="w-full rounded-xl bg-nu-midnight/90 border border-white/15 px-3 py-2 text-xs text-nu-wisp focus:outline-none focus:border-nu-tour"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-nu-skylight mb-1">
                  Seconds Shown per Rotation
                </label>
                <select
                  name="duration_seconds"
                  value={form.duration_seconds}
                  onChange={(e) =>
                    updateField('duration_seconds', Number(e.target.value))
                  }
                  className="w-full rounded-xl bg-nu-midnight/90 border border-white/15 px-3 py-2 text-xs text-nu-wisp focus:outline-none focus:border-nu-tour"
                >
                  <option value={10}>10 seconds</option>
                  <option value={15}>15 seconds (Recommended)</option>
                  <option value={20}>20 seconds</option>
                  <option value={30}>30 seconds</option>
                </select>
              </div>
            </div>

            {/* Post Button Bar */}
            <div className="pt-3 border-t border-white/10 flex flex-wrap items-center gap-3">
              {canPublishSelectionDirectly ? (
                <Button
                  type="button"
                  variant="primary"
                  disabled={saving}
                  icon={<IconCheck size={15} />}
                  onClick={() => handlePostSlide('published')}
                >
                  {saving ? 'Posting...' : 'Post to My Kiosk(s) Now'}
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={saving}
                    icon={<IconCheck size={15} />}
                    onClick={handleSplitPublishAndRequest}
                  >
                    Post to My Kiosk(s) & Request Others
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={saving}
                    onClick={() => handlePostSlide('pending_review')}
                  >
                    Request Owner Approval Only
                  </Button>
                </>
              )}
              {form.media_url && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setForm(defaultFormForUser)}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Full-Screen Kiosk Preview */}
        <div className="lg:col-span-5 lg:sticky lg:top-8">
          <div className="nu-card p-6 flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-4">
              <div>
                <div className="nu-eyebrow">Kiosk Screen Preview</div>
                <div className="text-xs text-nu-skylight mt-0.5">
                  Target:{' '}
                  <span className="text-nu-wisp font-semibold">
                    {targetSummaryLabel}
                  </span>
                </div>
              </div>
              <span className="nu-pill">1080×1920</span>
            </div>

            <KioskSlidePreview
              slide={form}
              kioskName={targetSummaryLabel}
              orientation="portrait"
            />
          </div>
        </div>
      </div>

      {/* =====================================================================
          POSTED SLIDES & APPROVAL QUEUE
         ===================================================================== */}
      <section className="space-y-5 pt-6 border-t border-white/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="nu-eyebrow">Active Kiosk Queue</div>
            <h2 className="text-2xl font-serif text-nu-wisp mt-1">
              Imported Slides ({filteredItems.length})
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {user && user.role !== 'super_admin' && (
              <button
                type="button"
                onClick={() => setOnlyMyKiosksFilter((p) => !p)}
                className={[
                  'px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors',
                  onlyMyKiosksFilter
                    ? 'bg-nu-leaf text-nu-midnight border-nu-leaf'
                    : 'bg-white/[0.04] text-nu-skylight border-white/15 hover:text-nu-wisp',
                ].join(' ')}
              >
                ★ Only My Kiosks
              </button>
            )}
            <select
              name="display_filter"
              value={displayFilter}
              onChange={(e) => setDisplayFilter(e.target.value)}
              className="rounded-full bg-nu-midnight/90 border border-white/15 px-4 py-2 text-xs text-nu-wisp focus:outline-none focus:border-nu-tour"
            >
              <option value="all">All 10 Campus Kiosks</option>
              {campusDisplays.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.location})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'all', label: 'All Slides', count: counts.all },
              { id: 'published', label: 'Live on Kiosks', count: counts.published },
              {
                id: 'pending_review',
                label: 'Needs Owner Approval',
                count: counts.pending_review,
              },
            ] as const
          ).map((tab) => {
            const active = statusFilter === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={[
                  'px-4 py-2 rounded-full text-xs font-semibold transition-colors flex items-center gap-2 border',
                  active
                    ? 'bg-nu-tour text-nu-midnight border-nu-tour'
                    : 'bg-white/[0.04] text-nu-skylight border-white/10 hover:text-nu-wisp',
                ].join(' ')}
              >
                <span>{tab.label}</span>
                <span
                  className={[
                    'px-2 py-0.5 rounded-full text-[10px] font-bold',
                    active
                      ? 'bg-nu-midnight/20 text-nu-midnight'
                      : tab.id === 'pending_review' && tab.count > 0
                        ? 'bg-nu-amber text-nu-midnight'
                        : 'bg-white/10 text-nu-wisp',
                  ].join(' ')}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Slides Grid */}
        {loading ? (
          <div className="nu-card p-10 text-center text-nu-skylight">
            Loading slides...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="nu-card p-10 text-center text-nu-skylight text-sm">
            No imported slides match this filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredItems.map((item) => {
              const sched = getScheduleState(item)
              const isAll = item.target_displays.includes('all')
              const targetNames = isAll
                ? 'All 10 Campus Kiosks'
                : item.target_displays
                    .map((id) => campusDisplays.find((d) => d.id === id)?.name || id)
                    .join(', ')
              const canManage = canManageContentItem(item)

              return (
                <div
                  key={item.id}
                  className="nu-card p-4 flex gap-4 items-center justify-between border border-white/10"
                >
                  {/* Thumbnail Preview */}
                  <div className="w-[105px] shrink-0 pointer-events-none">
                    <KioskSlidePreview
                      slide={item}
                      compact
                      kioskName={isAll ? 'All Kiosks' : 'Kiosk'}
                    />
                  </div>

                  {/* Info & Actions */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between h-full gap-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {item.status === 'published' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-nu-leaf/20 text-nu-leaf border border-nu-leaf/40">
                            ● Live
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-nu-amber/20 text-nu-tour border border-nu-amber/50">
                            Pending Approval
                          </span>
                        )}
                        {sched === 'expired' && (
                          <span className="text-[10px] text-nu-amber font-semibold">
                            Ended
                          </span>
                        )}
                      </div>

                      <h3 className="font-serif text-base font-bold text-nu-wisp truncate">
                        {item.title}
                      </h3>

                      <div className="text-[11px] text-nu-skylight space-y-0.5">
                        <div className="flex items-center gap-1 truncate">
                          <IconDisplay size={11} className="text-nu-sky shrink-0" />
                          <span className="truncate">{targetNames}</span>
                        </div>
                        {item.end_date && (
                          <div className="flex items-center gap-1">
                            <IconClock size={11} className="text-nu-sky shrink-0" />
                            <span>Until {item.end_date}</span>
                          </div>
                        )}
                        {item.author_name && (
                          <div className="text-[10px] text-nu-skylight/65 truncate">
                            {item.author_name}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/10">
                      {canManage ? (
                        <>
                          {item.status !== 'published' ? (
                            <Button
                              size="sm"
                              variant="primary"
                              icon={<IconCheck size={12} />}
                              onClick={() =>
                                handleQuickStatusChange(item, 'published')
                              }
                            >
                              Approve
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleQuickStatusChange(item, 'draft')}
                            >
                              Remove
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={<IconTrash size={12} />}
                            onClick={() => removeItem(item.id)}
                          >
                            Delete
                          </Button>
                        </>
                      ) : (
                        <span className="text-[10px] text-nu-skylight/60 italic">
                          Managed by kiosk owner
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Live Kiosk Playlist Simulator Modal */}
      <KioskPlaylistModal
        open={playlistModalOpen}
        onClose={() => setPlaylistModalOpen(false)}
        items={items}
        displays={campusDisplays}
        initialDisplayId={playlistDisplayId}
      />

      {/* Kiosk Owners Directory & Assignment Modal */}
      <KioskOwnersModal
        open={ownersModalOpen}
        onClose={() => setOwnersModalOpen(false)}
        displays={campusDisplays}
      />
    </div>
  )
}
