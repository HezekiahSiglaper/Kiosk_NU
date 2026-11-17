import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useKioskContent } from '../hooks/useKioskContent'
import { fetchDisplays } from '../services/displays'
import {
  getScheduleState,
  validateAndUploadMedia,
  type ImageCheckReport,
} from '../services/content'
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
  IconEdit,
  IconExternal,
  IconImage,
  IconTrash,
} from '../components/icons'
import {
  DEFAULT_CAMPUS_DISPLAYS,
  EMPTY_CONTENT_FORM,
  type CampusDisplayOption,
  type ContentStatus,
  type ContentTheme,
  type KioskContentFormData,
  type KioskContentItem,
} from '../types/content'

type CampusTemplate = {
  id: string
  name: string
  category: string
  desc: string
  theme: ContentTheme
  preset: Partial<KioskContentFormData>
}

const CAMPUS_TEMPLATE_LIBRARY: CampusTemplate[] = [
  {
    id: 'tpl-chapel',
    name: 'Chapel & Ministry Gathering',
    category: 'Spiritual Life',
    desc: 'Locked Midnight Gold layout with service time, location & QR link',
    theme: 'midnight',
    preset: {
      content_type: 'event',
      theme: 'midnight',
      subtitle: 'CAMPUS MINISTRIES',
      title: 'Pursuit Worship & Prayer Night',
      body: 'Join the Northwest community for acoustic worship, prayer, and hot cider in the lobby starting at 7:30 PM.',
      event_date: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
      event_time: '8:00 PM – 9:30 PM',
      event_location: 'Butterfield Chapel',
      cta_label: 'Chapel Schedule',
      cta_url: 'https://www.northwestu.edu/chapel',
      duration_seconds: 15,
    },
  },
  {
    id: 'tpl-club',
    name: 'Student Club / Campus Event',
    category: 'Student Life',
    desc: 'Kirkland Sky layout with protected headline, RSVP QR code & event box',
    theme: 'sky',
    preset: {
      content_type: 'event',
      theme: 'sky',
      subtitle: 'STUDENT ACTIVITIES BOARD',
      title: 'Harvest Fest on the Barton Green',
      body: 'Live music, food trucks, caramel apples, and lawn games. Free admission with your NU Student ID!',
      event_date: new Date(Date.now() + 86400000 * 4).toISOString().slice(0, 10),
      event_time: '6:00 PM – 9:00 PM',
      event_location: 'Barton Green & Eagle Field',
      cta_label: 'Scan to RSVP',
      cta_url: 'https://www.northwestu.edu/events',
      duration_seconds: 15,
    },
  },
  {
    id: 'tpl-athletics',
    name: 'Eagle Athletics Game Day',
    category: 'Athletics',
    desc: 'Eagle Navy & Gold layout for home matches, tip-off times & spirit nights',
    theme: 'navy-gold',
    preset: {
      content_type: 'event',
      theme: 'navy-gold',
      subtitle: 'EAGLE ATHLETICS · HOME MATCH',
      title: 'Varsity Volleyball vs. Corban',
      body: 'Wear navy and gold! First 100 students receive free Eagle rally towels at the Pavilion entrance.',
      event_date: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
      event_time: '7:00 PM Tip-Off',
      event_location: 'Kristi Brodin Pavilion',
      cta_label: 'Game Schedule',
      cta_url: 'https://nueagles.com',
      duration_seconds: 15,
    },
  },
  {
    id: 'tpl-faculty',
    name: 'Faculty / Department Notice',
    category: 'Academics',
    desc: 'Evergreen layout for advising deadlines, clinicals, and speaker lectures',
    theme: 'evergreen',
    preset: {
      content_type: 'announcement',
      theme: 'evergreen',
      subtitle: 'ACADEMIC SUCCESS & REGISTRAR',
      title: 'Spring Semester Registration Opens Monday',
      body: 'Meet with your faculty advisor this week to clear your registration hold and review your degree audit.',
      event_date: '',
      event_time: '8:00 AM – 5:00 PM',
      event_location: 'Barton Hall · Advising',
      cta_label: 'Book Advising',
      cta_url: 'https://eagle.northwestu.edu',
      duration_seconds: 15,
    },
  },
]

const LOCKED_THEMES: { id: ContentTheme; name: string; swatch: string }[] = [
  { id: 'midnight', name: 'Midnight Gold', swatch: 'from-[#00263d] to-[#fbd945]' },
  { id: 'navy-gold', name: 'Eagle Navy', swatch: 'from-[#034C87] to-[#ffbc2d]' },
  { id: 'evergreen', name: 'NU Evergreen', swatch: 'from-[#04505c] to-[#44ba82]' },
  { id: 'sky', name: 'Kirkland Sky', swatch: 'from-[#0068bb] to-[#95c5ea]' },
]

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
      subtitle: user.department.split('(')[0].trim().slice(0, 32),
      target_displays: defaultTargets,
      start_date: new Date().toISOString().slice(0, 10),
      author_name: `${user.full_name} · ${user.department.split('(')[0].trim()}`,
    }
  }, [user])

  const [form, setForm] = useState<KioskContentFormData>(defaultFormForUser)
  const [creationTab, setCreationTab] = useState<'import' | 'template' | 'url'>('import')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tpl-chapel')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageReport, setImageReport] = useState<ImageCheckReport | null>(null)
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
  const builderTopRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!editingId) {
      setForm(defaultFormForUser)
    }
  }, [defaultFormForUser, editingId])

  const showToast = (text: string) => {
    setToast(text)
    setTimeout(() => {
      setToast((prev) => (prev === text ? null : prev))
    }, 4500)
  }

  const updateField = <K extends keyof KioskContentFormData>(
    key: K,
    value: KioskContentFormData[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSelectTemplate = (tpl: CampusTemplate) => {
    setSelectedTemplateId(tpl.id)
    setCreationTab('template')
    setForm((prev) => ({
      ...prev,
      ...tpl.preset,
      target_displays: prev.target_displays,
      start_date: prev.start_date,
      end_date: prev.end_date,
      author_name: prev.author_name,
    }))
    showToast(`Applied "${tpl.name}" layout-protected template.`)
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
      const { url, report } = await validateAndUploadMedia(file)
      setImageReport(report)
      if (!report.valid || !url) {
        showToast(report.messages[0] || 'Image failed validation checks.')
        return
      }
      const cleanName = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
      setForm((prev) => ({
        ...prev,
        content_type: creationTab === 'template' ? prev.content_type : 'poster',
        media_url: url,
        title: prev.title.trim() || cleanName.slice(0, 65),
      }))
      showToast(
        report.status === 'pass'
          ? `✓ Image passed all checks (${report.dimensionsText})!`
          : `Uploaded "${file.name}" with a layout advisory.`,
      )
    } catch {
      showToast('Could not read that image file. Please try a PNG, JPG, or WebP.')
    } finally {
      setUploadingImage(false)
    }
  }

  const canPublishSelectionDirectly = canDirectlyPublishTo(form.target_displays)

  const validateBeforeSave = (): boolean => {
    if (creationTab !== 'template' && !form.media_url.trim()) {
      showToast('Please upload a poster image or select a Campus Template in Step 1.')
      return false
    }
    if (creationTab === 'template' && !form.title.trim()) {
      showToast('Please enter a Headline in your template.')
      return false
    }
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      showToast('Take-Down Date cannot be earlier than the Go-Live Date.')
      return false
    }
    return true
  }

  const handlePostSlide = async (desiredStatus: ContentStatus) => {
    if (!validateBeforeSave()) return

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
        title: effectiveTitle.slice(0, 65),
        subtitle: form.subtitle.slice(0, 32),
        body: form.body.slice(0, 180),
        content_type:
          creationTab === 'template'
            ? form.content_type === 'poster'
              ? 'announcement'
              : form.content_type
            : creationTab === 'url'
              ? 'media'
              : 'poster',
        status: effectiveStatus,
      }

      if (editingId) {
        await updateItem(editingId, payload)
        showToast(
          effectiveStatus === 'published'
            ? 'Updated slide and published live!'
            : 'Updated slide in approval queue!',
        )
      } else {
        await createItem(payload)
        showToast(
          effectiveStatus === 'published'
            ? 'Posted live to your kiosk(s)!'
            : 'Submitted to the kiosk owner for approval!',
        )
      }

      if (effectiveStatus === 'published' && isSupabaseConfigured()) {
        const targets = payload.target_displays.includes('all')
          ? campusDisplays.map((d) => d.id)
          : payload.target_displays
        targets.slice(0, 5).forEach((id) => {
          sendCommand(id, 'reload').catch(() => {})
        })
      }

      setForm(defaultFormForUser)
      setEditingId(null)
      setImageReport(null)
    } finally {
      setSaving(false)
    }
  }

  const handleSplitPublishAndRequest = async () => {
    if (!user || !validateBeforeSave()) return

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
      const basePayload: KioskContentFormData = {
        ...form,
        title: effectiveTitle.slice(0, 65),
        subtitle: form.subtitle.slice(0, 32),
        body: form.body.slice(0, 180),
        content_type:
          creationTab === 'template'
            ? form.content_type === 'poster'
              ? 'announcement'
              : form.content_type
            : creationTab === 'url'
              ? 'media'
              : 'poster',
      }
      if (ownedSelected.length > 0) {
        await createItem({
          ...basePayload,
          target_displays: ownedSelected,
          status: 'published',
        })
      }
      if (unownedSelected.length > 0) {
        await createItem({
          ...basePayload,
          target_displays: unownedSelected,
          status: 'pending_review',
        })
      }
      showToast(
        `Posted live to your ${ownedSelected.length} kiosk(s) & requested approval for ${unownedSelected.length} other kiosk(s)!`,
      )
      setForm(defaultFormForUser)
      setEditingId(null)
      setImageReport(null)
    } finally {
      setSaving(false)
    }
  }

  const handleEditItem = (item: KioskContentItem) => {
    setEditingId(item.id)
    const isTemplate = Boolean(item.body || item.event_date || item.event_location || item.cta_url)
    setCreationTab(isTemplate ? 'template' : 'import')
    setImageReport(null)
    setForm({
      title: item.title,
      subtitle: item.subtitle || '',
      body: item.body || '',
      content_type: item.content_type,
      theme: item.theme,
      media_url: item.media_url || '',
      event_date: item.event_date || '',
      event_time: item.event_time || '',
      event_location: item.event_location || '',
      cta_label: item.cta_label || '',
      cta_url: item.cta_url || '',
      target_displays: item.target_displays.length > 0 ? item.target_displays : ['all'],
      start_date: item.start_date || '',
      end_date: item.end_date || '',
      duration_seconds: item.duration_seconds || 15,
      status: item.status,
      author_name: item.author_name || '',
    })
    builderTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
    <div className="space-y-10" ref={builderTopRef}>
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

      {/* Main 2-Column Layout: Left = Builder / Uploader + Publishing Tools, Right = Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <div className="nu-eyebrow">Campus Signage Studio</div>
              <h1 className="text-3xl font-serif text-nu-wisp mt-1">
                {editingId ? 'Edit Kiosk Slide & Schedule' : 'Add Content to Your Kiosk'}
              </h1>
              <p className="text-sm text-nu-skylight mt-1">
                Import a finished graphic with automatic quality checks, or use a
                layout-protected Northwest University template.
              </p>
            </div>
            {editingId && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditingId(null)
                  setForm(defaultFormForUser)
                  setImageReport(null)
                }}
              >
                Cancel Edit
              </Button>
            )}
          </div>

          {/* =================================================================
              STEP 1: IMAGE UPLOAD (WITH CHECKS) OR LAYOUT-PROTECTED TEMPLATES
             ================================================================= */}
          <div className="nu-card p-6 space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-nu-tour text-nu-midnight font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <h2 className="text-lg font-serif text-nu-wisp">
                  Choose Image Upload or Campus Template
                </h2>
              </div>

              {/* 3 Mode Tabs */}
              <div className="flex items-center gap-1 bg-nu-midnight/80 p-1 rounded-full border border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setCreationTab('import')
                    setForm((prev) => ({
                      ...prev,
                      content_type: 'poster',
                      body: '',
                      event_date: '',
                      event_time: '',
                      event_location: '',
                      cta_url: '',
                    }))
                  }}
                  className={[
                    'px-3 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5',
                    creationTab === 'import'
                      ? 'bg-nu-tour text-nu-midnight'
                      : 'text-nu-skylight hover:text-nu-wisp',
                  ].join(' ')}
                >
                  <IconImage size={12} />
                  Upload Poster
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreationTab('template')
                    if (!form.body && !form.event_location) {
                      handleSelectTemplate(CAMPUS_TEMPLATE_LIBRARY[0])
                    }
                  }}
                  className={[
                    'px-3 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5',
                    creationTab === 'template'
                      ? 'bg-nu-tour text-nu-midnight'
                      : 'text-nu-skylight hover:text-nu-wisp',
                  ].join(' ')}
                >
                  🔒 Template Library
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreationTab('url')
                    setForm((prev) => ({
                      ...prev,
                      content_type: 'media',
                      body: '',
                    }))
                  }}
                  className={[
                    'px-3 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5',
                    creationTab === 'url'
                      ? 'bg-nu-tour text-nu-midnight'
                      : 'text-nu-skylight hover:text-nu-wisp',
                  ].join(' ')}
                >
                  <IconExternal size={12} />
                  Paste Link
                </button>
              </div>
            </div>

            {/* TAB A: UPLOAD FINISHED POSTER WITH BUILT-IN CHECKS */}
            {creationTab === 'import' && (
              <div className="space-y-4">
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    handleFileUpload(e.dataTransfer.files?.[0])
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={[
                    'cursor-pointer rounded-2xl border-2 border-dashed p-7 text-center transition-colors',
                    form.media_url
                      ? 'border-nu-leaf/60 bg-nu-leaf/[0.06]'
                      : 'border-nu-sky/35 hover:border-nu-tour bg-nu-midnight/50',
                  ].join(' ')}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    name="poster_file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files?.[0])}
                  />
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/15 flex items-center justify-center text-nu-tour mx-auto mb-3">
                    <IconImage size={24} />
                  </div>
                  <div className="text-base font-semibold text-nu-wisp">
                    {uploadingImage
                      ? 'Running built-in image checks...'
                      : form.media_url
                        ? '✓ Image Uploaded — Click or drop to replace'
                        : 'Drag & drop your poster image here, or click to browse'}
                  </div>
                  <div className="text-xs text-nu-skylight mt-1">
                    Built-in checks verify PNG/JPG/WebP format, ≤ 10 MB size, and 9:16 (1080×1920) vertical resolution
                  </div>
                </div>

                {/* Built-in Image Validation Report Card */}
                {imageReport && (
                  <div
                    className={[
                      'p-4 rounded-2xl border text-xs space-y-2',
                      imageReport.status === 'pass'
                        ? 'bg-nu-leaf/10 border-nu-leaf/40 text-nu-wisp'
                        : 'bg-nu-amber/12 border-nu-amber/50 text-nu-wisp',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span
                        className={[
                          'font-bold uppercase tracking-wider text-[11px]',
                          imageReport.status === 'pass' ? 'text-nu-leaf' : 'text-nu-tour',
                        ].join(' ')}
                      >
                        {imageReport.status === 'pass'
                          ? '✓ Built-In Image Checks Passed'
                          : '⚠️ Image Check Advisory'}
                      </span>
                      <span className="font-mono text-[11px] text-nu-skylight">
                        {imageReport.dimensionsText} · {imageReport.orientationText} ·{' '}
                        {imageReport.fileSizeText}
                      </span>
                    </div>
                    <ul className="space-y-1 text-nu-skylight">
                      {imageReport.messages.map((msg, i) => (
                        <li key={i}>{msg}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-nu-skylight mb-1.5">
                    Slide Name (Internal Reference Label)
                  </label>
                  <input
                    type="text"
                    name="slide_title"
                    autoComplete="off"
                    maxLength={65}
                    value={form.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    placeholder="e.g., Chapel Worship Night Poster - Oct 28"
                    className="w-full rounded-xl bg-nu-midnight/90 border border-white/15 px-3.5 py-2.5 text-sm text-nu-wisp placeholder:text-nu-skylight/40 focus:outline-none focus:border-nu-tour"
                  />
                </div>
              </div>
            )}

            {/* TAB B: CAMPUS TEMPLATE LIBRARY WITH LAYOUT PROTECTIONS */}
            {creationTab === 'template' && (
              <div className="space-y-5">
                {/* Layout Protection Banner */}
                <div className="p-3.5 rounded-xl bg-nu-blue/15 border border-nu-sky/30 flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-xs text-nu-wisp">
                    <strong className="text-nu-tour">🔒 Layout Protection Active:</strong>{' '}
                    Typography, margins, university header, and brand color contrast are
                    locked so your slide stays consistent with campus standards.
                  </div>
                </div>

                {/* Ready-to-Use Campus Templates Grid */}
                <div>
                  <label className="block text-xs font-semibold text-nu-skylight mb-2">
                    Select a Campus Template
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {CAMPUS_TEMPLATE_LIBRARY.map((tpl) => {
                      const active = selectedTemplateId === tpl.id
                      return (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => handleSelectTemplate(tpl)}
                          className={[
                            'p-3.5 rounded-xl border text-left transition-colors flex flex-col justify-between gap-1.5',
                            active
                              ? 'bg-nu-tour/15 border-nu-tour text-nu-wisp'
                              : 'bg-white/[0.03] border-white/10 text-nu-skylight hover:bg-white/[0.06]',
                          ].join(' ')}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-serif font-bold text-sm text-nu-wisp">
                              {tpl.name}
                            </span>
                            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-nu-tour shrink-0">
                              {tpl.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-nu-skylight/80 leading-snug">
                            {tpl.desc}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Locked Color Palette Selector */}
                <div>
                  <label className="block text-xs font-semibold text-nu-skylight mb-2">
                    Approved University Color Palette
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {LOCKED_THEMES.map((t) => {
                      const active = form.theme === t.id
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => updateField('theme', t.id)}
                          className={[
                            'p-2 rounded-xl border text-left flex items-center gap-2 transition-colors',
                            active
                              ? 'border-nu-tour bg-nu-tour/15 text-nu-wisp'
                              : 'border-white/10 bg-white/[0.03] text-nu-skylight',
                          ].join(' ')}
                        >
                          <span
                            className={`w-4 h-4 rounded-full bg-gradient-to-br ${t.swatch} border border-white/30 shrink-0`}
                          />
                          <span className="text-xs font-semibold truncate">{t.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Protected Text Fields with Enforced Character Caps */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-nu-skylight">
                        Department / Category Badge
                      </label>
                      <span className="text-[10px] font-mono text-nu-skylight/70">
                        {form.subtitle.length}/32
                      </span>
                    </div>
                    <input
                      type="text"
                      name="template_subtitle"
                      autoComplete="off"
                      maxLength={32}
                      value={form.subtitle}
                      onChange={(e) => updateField('subtitle', e.target.value)}
                      className="w-full rounded-xl bg-nu-midnight/90 border border-white/15 px-3 py-2 text-xs text-nu-wisp focus:outline-none focus:border-nu-tour"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-nu-skylight">
                        Headline <span className="text-nu-tour">*</span>
                      </label>
                      <span className="text-[10px] font-mono text-nu-skylight/70">
                        {form.title.length}/65
                      </span>
                    </div>
                    <input
                      type="text"
                      name="template_title"
                      autoComplete="off"
                      maxLength={65}
                      value={form.title}
                      onChange={(e) => updateField('title', e.target.value)}
                      className="w-full rounded-xl bg-nu-midnight/90 border border-white/15 px-3 py-2 text-xs text-nu-wisp focus:outline-none focus:border-nu-tour"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-nu-skylight">
                      Body Message (Layout-Protected to 3 Lines)
                    </label>
                    <span className="text-[10px] font-mono text-nu-skylight/70">
                      {form.body.length}/180
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    name="template_body"
                    autoComplete="off"
                    maxLength={180}
                    value={form.body}
                    onChange={(e) => updateField('body', e.target.value)}
                    className="w-full rounded-xl bg-nu-midnight/90 border border-white/15 px-3 py-2 text-xs text-nu-wisp focus:outline-none focus:border-nu-tour"
                  />
                </div>

                {/* Event Date, Time, Location & Optional QR Link */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-nu-skylight mb-1">
                      Event Date
                    </label>
                    <input
                      type="date"
                      name="event_date"
                      autoComplete="off"
                      value={form.event_date}
                      onChange={(e) => updateField('event_date', e.target.value)}
                      className="w-full rounded-xl bg-nu-midnight/90 border border-white/15 px-3 py-2 text-xs text-nu-wisp focus:outline-none focus:border-nu-tour"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-nu-skylight mb-1">
                      Time Window
                    </label>
                    <input
                      type="text"
                      name="event_time"
                      autoComplete="off"
                      maxLength={30}
                      value={form.event_time}
                      onChange={(e) => updateField('event_time', e.target.value)}
                      placeholder="7:00 PM – 8:30 PM"
                      className="w-full rounded-xl bg-nu-midnight/90 border border-white/15 px-3 py-2 text-xs text-nu-wisp focus:outline-none focus:border-nu-tour"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-nu-skylight mb-1">
                      Campus Location ({form.event_location.length}/40)
                    </label>
                    <input
                      type="text"
                      name="event_location"
                      autoComplete="off"
                      maxLength={40}
                      value={form.event_location}
                      onChange={(e) => updateField('event_location', e.target.value)}
                      placeholder="Butterfield Chapel"
                      className="w-full rounded-xl bg-nu-midnight/90 border border-white/15 px-3 py-2 text-xs text-nu-wisp focus:outline-none focus:border-nu-tour"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] text-nu-skylight mb-1">
                      Optional QR Code Link (RSVP / Info URL)
                    </label>
                    <input
                      type="url"
                      name="cta_url"
                      autoComplete="off"
                      value={form.cta_url}
                      onChange={(e) => updateField('cta_url', e.target.value)}
                      placeholder="https://www.northwestu.edu/..."
                      className="w-full rounded-xl bg-nu-midnight/90 border border-white/15 px-3 py-2 text-xs text-nu-wisp focus:outline-none focus:border-nu-tour"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <input
                      ref={fileInputRef}
                      type="file"
                      name="template_image"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e.target.files?.[0])}
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        icon={<IconImage size={13} />}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {form.media_url ? 'Replace Template Photo' : '+ Add Photo to Template'}
                      </Button>
                      {form.media_url && (
                        <button
                          type="button"
                          onClick={() => {
                            updateField('media_url', '')
                            setImageReport(null)
                          }}
                          className="text-xs text-nu-amber hover:underline"
                        >
                          Remove Photo
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB C: PASTE SHARE LINK / URL */}
            {creationTab === 'url' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-nu-skylight mb-1.5">
                    Canva / Google Slides / Direct Image or Web URL
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
                </div>
                <div>
                  <label className="block text-xs font-semibold text-nu-skylight mb-1.5">
                    Slide Name (Internal Reference Label)
                  </label>
                  <input
                    type="text"
                    name="slide_title_url"
                    autoComplete="off"
                    maxLength={65}
                    value={form.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    placeholder="e.g., Admissions Welcome Slide"
                    className="w-full rounded-xl bg-nu-midnight/90 border border-white/15 px-3.5 py-2.5 text-sm text-nu-wisp focus:outline-none focus:border-nu-tour"
                  />
                </div>
              </div>
            )}
          </div>

          {/* =================================================================
              STEP 2: PUBLISHING TOOLS (GO-LIVE DATE, TAKE-DOWN DATE & KIOSKS)
             ================================================================= */}
          <div className="nu-card p-6 space-y-5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-nu-tour text-nu-midnight font-bold text-xs flex items-center justify-center">
                  2
                </span>
                <div>
                  <h2 className="text-lg font-serif text-nu-wisp">
                    Publishing Tools & Schedule
                  </h2>
                  <p className="text-xs text-nu-skylight">
                    Choose which kiosks display this page and schedule when it goes live and
                    when it comes down.
                  </p>
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

            {/* Publishing Schedule Controls: Go-Live Date + Take-Down Date + Rotation Duration */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-nu-tour flex items-center gap-1.5">
                  <IconClock size={13} />
                  Content Publishing Schedule (Go-Live & Take-Down)
                </span>
                <span className="text-[11px] text-nu-skylight">
                  {form.start_date || 'Immediate'} → {form.end_date || 'Until Removed'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-nu-skylight mb-1">
                    When Content Goes Live
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    autoComplete="off"
                    value={form.start_date}
                    onChange={(e) => updateField('start_date', e.target.value)}
                    className="w-full rounded-xl bg-nu-midnight/90 border border-white/15 px-3 py-2 text-xs text-nu-wisp focus:outline-none focus:border-nu-tour"
                  />
                  <span className="text-[10px] text-nu-skylight/65">
                    Start date on kiosk screens
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-nu-skylight mb-1">
                    When Content Comes Down
                  </label>
                  <input
                    type="date"
                    name="end_date"
                    autoComplete="off"
                    min={form.start_date || undefined}
                    value={form.end_date}
                    onChange={(e) => updateField('end_date', e.target.value)}
                    className="w-full rounded-xl bg-nu-midnight/90 border border-white/15 px-3 py-2 text-xs text-nu-wisp focus:outline-none focus:border-nu-tour"
                  />
                  <span className="text-[10px] text-nu-skylight/65">
                    Auto-removes after this date
                  </span>
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
                    <option value={15}>15 seconds (Standard)</option>
                    <option value={20}>20 seconds</option>
                    <option value={30}>30 seconds</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Post Button Bar */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              {canPublishSelectionDirectly ? (
                <Button
                  type="button"
                  variant="primary"
                  disabled={saving}
                  icon={<IconCheck size={15} />}
                  onClick={() => handlePostSlide('published')}
                >
                  {saving
                    ? 'Saving...'
                    : editingId
                      ? 'Save Schedule & Publish'
                      : 'Publish to My Kiosk(s)'}
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
                    Publish to My Kiosk(s) & Request Others
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
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditingId(null)
                  setForm(defaultFormForUser)
                  setImageReport(null)
                }}
              >
                Reset
              </Button>
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Live Preview of How Your Page Will Look */}
        <div className="lg:col-span-5 lg:sticky lg:top-8">
          <div className="nu-card p-6 flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-4">
              <div>
                <div className="nu-eyebrow">Live Kiosk Page Preview</div>
                <div className="text-xs text-nu-skylight mt-0.5">
                  Target:{' '}
                  <span className="text-nu-wisp font-semibold">
                    {targetSummaryLabel}
                  </span>
                </div>
              </div>
              <span className="nu-pill">
                {creationTab === 'template' ? '🔒 Protected Layout' : '1080×1920'}
              </span>
            </div>

            <KioskSlidePreview
              slide={form}
              kioskName={targetSummaryLabel}
              orientation="portrait"
            />

            <div className="w-full mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-nu-skylight/80">
              <span>
                Go-Live: <strong className="text-nu-wisp">{form.start_date || 'Immediate'}</strong>
              </span>
              <span>
                Take-Down: <strong className="text-nu-wisp">{form.end_date || 'Manual'}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          CONTENT MANAGEMENT & SCHEDULE QUEUE
         ===================================================================== */}
      <section className="space-y-5 pt-6 border-t border-white/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="nu-eyebrow">Publishing Management</div>
            <h2 className="text-2xl font-serif text-nu-wisp mt-1">
              Scheduled & Live Kiosk Content ({filteredItems.length})
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
              { id: 'published', label: 'Approved / Scheduled', count: counts.published },
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
            No slides match this filter.
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

                  {/* Info & Publishing Controls */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between h-full gap-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {item.status === 'published' ? (
                          sched === 'active' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-nu-leaf/20 text-nu-leaf border border-nu-leaf/40">
                              ● Live Now
                            </span>
                          ) : sched === 'scheduled' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-nu-blue/25 text-nu-sky border border-nu-sky/40">
                              🗓️ Scheduled
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-white/10 text-nu-skylight border border-white/20">
                              Came Down
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-nu-amber/20 text-nu-tour border border-nu-amber/50">
                            Pending Approval
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
                        <div className="flex items-center gap-1 text-[10px] text-nu-skylight/85">
                          <IconClock size={11} className="text-nu-tour shrink-0" />
                          <span className="truncate">
                            Live: {item.start_date || 'Immediate'} → Down:{' '}
                            {item.end_date || 'Manual'}
                          </span>
                        </div>
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
                              Take Down
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={<IconEdit size={12} />}
                            onClick={() => handleEditItem(item)}
                          >
                            Schedule / Edit
                          </Button>
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
