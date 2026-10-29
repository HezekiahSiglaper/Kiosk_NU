export type ContentType = 'announcement' | 'poster' | 'event' | 'media'

export type ContentStatus = 'draft' | 'pending_review' | 'published' | 'archived'

export type ContentTheme = 'midnight' | 'navy-gold' | 'evergreen' | 'sky'

export type KioskContentItem = {
  id: string
  title: string
  subtitle: string | null
  body: string | null
  content_type: ContentType
  theme: ContentTheme
  media_url: string | null
  event_date: string | null
  event_time: string | null
  event_location: string | null
  cta_label: string | null
  cta_url: string | null
  target_displays: string[] // ['all'] or specific display IDs
  start_date: string | null // ISO date/time or YYYY-MM-DD
  end_date: string | null   // ISO date/time or YYYY-MM-DD
  duration_seconds: number
  status: ContentStatus
  author_name: string | null
  created_at: string
  updated_at: string
}

export type KioskContentFormData = {
  title: string
  subtitle: string
  body: string
  content_type: ContentType
  theme: ContentTheme
  media_url: string
  event_date: string
  event_time: string
  event_location: string
  cta_label: string
  cta_url: string
  target_displays: string[]
  start_date: string
  end_date: string
  duration_seconds: number
  status: ContentStatus
  author_name: string
}

export const EMPTY_CONTENT_FORM: KioskContentFormData = {
  title: '',
  subtitle: 'Canva / Poster Import',
  body: '',
  content_type: 'poster',
  theme: 'midnight',
  media_url: '',
  event_date: '',
  event_time: '',
  event_location: '',
  cta_label: '',
  cta_url: '',
  target_displays: ['all'],
  start_date: '',
  end_date: '',
  duration_seconds: 15,
  status: 'published',
  author_name: '',
}

export type CampusDisplayOption = {
  id: string
  name: string
  location: string
  orientation: string
}

export const DEFAULT_CAMPUS_DISPLAYS: CampusDisplayOption[] = [
  { id: 'nu-display', name: 'Main NU Display', location: 'Campus Entrance', orientation: 'Portrait 1080×1920' },
  { id: 'pecota', name: 'Pecota Student Center', location: 'Pecota Student Center', orientation: 'Portrait 1080×1920' },
  { id: 'chapel-display', name: 'Chapel Display', location: 'Butterfield Chapel', orientation: 'Portrait 1080×1920' },
  { id: 'feehall', name: 'Fee Hall Display', location: 'Fee Hall Lobby', orientation: 'Portrait 1080×1920' },
  { id: 'hsc1', name: 'HSC Display 1', location: 'Health & Sciences Center', orientation: 'Portrait 1080×1920' },
  { id: 'hsc2', name: 'HSC Display 2', location: 'Health & Sciences Center', orientation: 'Portrait 1080×1920' },
  { id: '6710', name: '6710 PA Display', location: '6710 Building', orientation: 'Portrait 1080×1920' },
  { id: 'barton-downstairs', name: 'Barton Downstairs', location: 'Barton Hall', orientation: 'Upstairs (2nd floor)' },
  { id: 'barton-left-arrow', name: 'Barton Left Arrow', location: 'Barton Hall', orientation: 'Left arrow' },
  { id: 'barton-right-arrow', name: 'Barton Right Arrow', location: 'Barton Hall', orientation: 'Right arrow' },
]

/** Helper to generate sample 1080x1920 SVG poster data URLs for realistic seed previews */
function makeSamplePosterSvg(
  bg1: string,
  bg2: string,
  accent: string,
  eyebrow: string,
  headline1: string,
  headline2: string,
  footer: string,
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 960" width="540" height="960">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bg1}"/>
        <stop offset="100%" stop-color="${bg2}"/>
      </linearGradient>
    </defs>
    <rect width="540" height="960" fill="url(#g)"/>
    <circle cx="460" cy="120" r="220" fill="${accent}" fill-opacity="0.12"/>
    <rect x="48" y="64" width="444" height="832" rx="28" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2"/>
    <text x="84" y="140" fill="${accent}" font-family="sans-serif" font-size="18" font-weight="bold" letter-spacing="4">${eyebrow}</text>
    <text x="84" y="420" fill="#ffffff" font-family="Georgia, serif" font-size="52" font-weight="bold">${headline1}</text>
    <text x="84" y="485" fill="#ffffff" font-family="Georgia, serif" font-size="52" font-weight="bold">${headline2}</text>
    <rect x="84" y="530" width="90" height="6" rx="3" fill="${accent}"/>
    <text x="84" y="830" fill="#eaf4fb" font-family="sans-serif" font-size="22">${footer}</text>
  </svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export const INITIAL_SEED_CONTENT: KioskContentItem[] = [
  {
    id: 'seed-chapel-1',
    title: 'Pursuit Worship Night Poster.png',
    subtitle: 'Canva Export · 1080×1920',
    body: null,
    content_type: 'poster',
    theme: 'midnight',
    media_url: makeSamplePosterSvg(
      '#00263d',
      '#034C87',
      '#fbd945',
      'CAMPUS MINISTRIES',
      'Pursuit Worship',
      'Friday · 8:00 PM',
      'Butterfield Chapel · Northwest University',
    ),
    event_date: null,
    event_time: null,
    event_location: null,
    cta_label: null,
    cta_url: null,
    target_displays: ['chapel-display', 'nu-display'],
    start_date: '2026-10-18',
    end_date: '2026-11-05',
    duration_seconds: 15,
    status: 'published',
    author_name: 'Pastor Marcus Sterling · Campus Ministries',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'seed-swoop-2',
    title: 'SwoopShop Fall Hoodie Sale.jpg',
    subtitle: 'Photoshop Export · 1080×1920',
    body: null,
    content_type: 'poster',
    theme: 'navy-gold',
    media_url: makeSamplePosterSvg(
      '#034C87',
      '#1a160d',
      '#ffbc2d',
      'SWOOPSHOP · PECOTA',
      '25% Off Fall',
      'Eagle Hoodies',
      'Show your NU ID at Pecota Student Center',
    ),
    event_date: null,
    event_time: null,
    event_location: null,
    cta_label: null,
    cta_url: null,
    target_displays: ['pecota', 'nu-display'],
    start_date: '2026-10-15',
    end_date: '2026-11-15',
    duration_seconds: 12,
    status: 'published',
    author_name: 'Sarah Jenkins · Student Life & SwoopShop',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'seed-nursing-3',
    title: 'Spring Clinical Info Session Slide.png',
    subtitle: 'PowerPoint Export · 1080×1920',
    body: null,
    content_type: 'poster',
    theme: 'evergreen',
    media_url: makeSamplePosterSvg(
      '#04505c',
      '#00263d',
      '#44ba82',
      'BUNTAIN COLLEGE OF NURSING',
      'Spring Clinical',
      'Placements Info',
      'Oct 28 · 12:15 PM · HSC Auditorium 104',
    ),
    event_date: null,
    event_time: null,
    event_location: null,
    cta_label: null,
    cta_url: null,
    target_displays: ['hsc1', 'hsc2', '6710'],
    start_date: '2026-10-20',
    end_date: '2026-11-10',
    duration_seconds: 15,
    status: 'pending_review',
    author_name: 'Dr. Elena Rostova · Buntain College of Nursing',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
]
