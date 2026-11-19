import { memo, useMemo } from 'react'
import { NuMark } from './NuMark'
import { IconClock, IconExternal, IconImage, IconMapPin } from './icons'
import type { ContentTheme, KioskContentFormData, KioskContentItem } from '../types/content'

type SlideData = Pick<
  KioskContentItem | KioskContentFormData,
  | 'title'
  | 'subtitle'
  | 'body'
  | 'content_type'
  | 'theme'
  | 'media_url'
  | 'event_date'
  | 'event_time'
  | 'event_location'
  | 'cta_label'
  | 'cta_url'
  | 'duration_seconds'
>

const THEME_STYLES: Record<
  ContentTheme,
  {
    bg: string
    accentText: string
    pillBg: string
    cardBg: string
    glow: string
  }
> = {
  midnight: {
    bg: 'bg-gradient-to-br from-[#00263d] via-[#023859] to-[#001a2c]',
    accentText: 'text-nu-tour',
    pillBg: 'bg-nu-tour/15 border-nu-tour/40 text-nu-tour',
    cardBg: 'bg-white/[0.06] border-white/15',
    glow: 'radial-gradient(circle at 85% 15%, rgba(251, 217, 69, 0.18), transparent 55%)',
  },
  'navy-gold': {
    bg: 'bg-gradient-to-br from-[#034C87] via-[#00263d] to-[#1d1912]',
    accentText: 'text-nu-amber',
    pillBg: 'bg-nu-amber/20 border-nu-amber/50 text-nu-tour',
    cardBg: 'bg-nu-tour/[0.08] border-nu-tour/25',
    glow: 'radial-gradient(circle at 20% 10%, rgba(255, 188, 45, 0.24), transparent 60%)',
  },
  evergreen: {
    bg: 'bg-gradient-to-br from-[#04505c] via-[#00263d] to-[#03363d]',
    accentText: 'text-nu-leaf',
    pillBg: 'bg-nu-leaf/20 border-nu-leaf/45 text-nu-leaf',
    cardBg: 'bg-white/[0.06] border-nu-leaf/25',
    glow: 'radial-gradient(circle at 80% 20%, rgba(68, 186, 130, 0.22), transparent 55%)',
  },
  sky: {
    bg: 'bg-gradient-to-br from-[#0068bb] via-[#034C87] to-[#00263d]',
    accentText: 'text-nu-sky',
    pillBg: 'bg-white/15 border-white/30 text-nu-powder',
    cardBg: 'bg-white/[0.09] border-white/20',
    glow: 'radial-gradient(circle at 75% 15%, rgba(149, 197, 234, 0.28), transparent 55%)',
  },
}

function formatReadableDate(raw: string | null | undefined): string {
  if (!raw) return ''
  const parsed = new Date(`${raw.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return raw
  return parsed.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function isImageSource(url: string): boolean {
  if (!url) return false
  if (url.startsWith('data:image')) return true
  return /\.(png|jpe?g|gif|webp|svg|avif)(\?.*)?$/i.test(url)
}

const PseudoQrCode = memo(function PseudoQrCode({ value }: { value: string }) {
  const size = 11
  const pathData = useMemo(() => {
    let hash = 2166136261
    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i)
      hash = Math.imul(hash, 16777619)
    }

    const isFinder = (r: number, c: number) =>
      (r < 3 && c < 3) || (r < 3 && c >= size - 3) || (r >= size - 3 && c < 3)

    let d = ''
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const on = isFinder(r, c)
          ? true
          : (((hash >>> ((r * size + c) % 24)) ^ (r * 7 + c * 13)) & 1) === 1
        if (on) {
          d += `M${c},${r}h0.9v0.9h-0.9Z`
        }
      }
    }
    return d
  }, [value])

  return (
    <div className="p-1.5 bg-white rounded-xl inline-block shrink-0">
      <svg width={46} height={46} viewBox={`0 0 ${size} ${size}`} className="block">
        <path d={pathData} fill="#00263d" />
      </svg>
    </div>
  )
})

type Props = {
  slide: SlideData
  orientation?: 'portrait' | 'landscape'
  kioskName?: string
  compact?: boolean
}

export const KioskSlidePreview = memo(function KioskSlidePreview({
  slide,
  orientation = 'portrait',
  kioskName = 'Campus Kiosk',
  compact = false,
}: Props) {
  const mediaUrl = slide.media_url?.trim() || ''
  const title = slide.title?.trim() || 'Your Headline Appears Here'
  const subtitle = slide.subtitle?.trim() || 'Northwest University'
  const body = slide.body?.trim() || ''
  const isPortrait = orientation === 'portrait'
  const theme = THEME_STYLES[slide.theme || 'midnight'] || THEME_STYLES.midnight

  const isFullBleedPoster =
    slide.content_type === 'poster' && !body && !slide.event_date && !slide.event_location && !slide.cta_url

  // 1) Full-bleed Imported Poster / Graphic Mode
  if (isFullBleedPoster) {
    return (
      <div
        className={[
          'relative overflow-hidden rounded-[24px] border-2 border-white/20 bg-[#001a2c] select-none flex flex-col justify-between text-nu-wisp',
          isPortrait
            ? compact
              ? 'aspect-[9/16] w-full max-w-[200px]'
              : 'aspect-[9/16] w-full max-w-[330px] shadow-glass'
            : 'aspect-[16/9] w-full shadow-glass',
        ].join(' ')}
      >
        {mediaUrl ? (
          isImageSource(mediaUrl) ? (
            <div className="relative w-full h-full flex-1 bg-black flex items-center justify-center">
              <img
                src={mediaUrl}
                alt={title}
                loading="lazy"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between px-3 py-1.5 rounded-xl bg-black/65 border border-white/15 text-[10px]">
                <span className="truncate font-medium text-nu-wisp max-w-[70%]">
                  {kioskName}
                </span>
                <span className="font-mono text-nu-tour font-bold">
                  {slide.duration_seconds || 15}s
                </span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-between p-5 text-center bg-gradient-to-b from-[#034C87] to-[#00263d]">
              <div className="w-full flex items-center justify-between border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <NuMark size={18} />
                  <span className="text-[11px] font-serif text-nu-wisp truncate">
                    {kioskName}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-nu-tour">
                  {slide.duration_seconds || 15}s
                </span>
              </div>
              <div className="my-auto space-y-2.5 px-2">
                <div className="w-11 h-11 rounded-2xl bg-nu-tour/20 border border-nu-tour/40 flex items-center justify-center text-nu-tour mx-auto">
                  <IconExternal size={20} />
                </div>
                <div className="font-serif text-sm font-bold text-nu-wisp line-clamp-2">
                  {title}
                </div>
                <div className="text-[10px] font-mono text-nu-sky break-all line-clamp-2 bg-black/30 p-2 rounded-lg border border-white/10">
                  {mediaUrl}
                </div>
              </div>
              <div className="w-full pt-2 border-t border-white/10 text-[9px] text-nu-skylight/70">
                Full-screen imported view
              </div>
            </div>
          )
        ) : (
          <div className="flex-1 flex flex-col items-center justify-between p-6 text-center bg-gradient-to-b from-[#043352] to-[#001d30]">
            <div className="w-full flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <NuMark size={20} />
                <span className="text-xs font-serif text-nu-wisp">{kioskName}</span>
              </div>
              <span className="text-[10px] font-mono text-nu-skylight/70">1080×1920</span>
            </div>
            <div className="my-auto space-y-3 px-2">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.06] border border-dashed border-white/25 flex items-center justify-center text-nu-sky mx-auto">
                <IconImage size={26} />
              </div>
              <div className="font-serif text-lg text-nu-wisp">Ready for Your Slide</div>
              <p className="text-xs text-nu-skylight/80 leading-relaxed">
                Upload a finished graphic or choose a Campus Template on the left to preview
                how your page will look on the kiosk.
              </p>
            </div>
            <div className="w-full pt-3 border-t border-white/10 text-[10px] text-nu-skylight/60">
              Northwest University Digital Signage
            </div>
          </div>
        )}
      </div>
    )
  }

  // 2) Layout-Protected Campus Template Mode
  return (
    <div
      className={[
        'relative overflow-hidden rounded-[24px] border-2 border-white/20 select-none flex flex-col justify-between text-nu-wisp',
        theme.bg,
        isPortrait
          ? compact
            ? 'aspect-[9/16] w-full max-w-[200px] p-3.5'
            : 'aspect-[9/16] w-full max-w-[330px] p-6 shadow-glass'
          : 'aspect-[16/9] w-full p-6 shadow-glass',
      ].join(' ')}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: theme.glow }}
      />

      {/* Protected Top Header Zone */}
      <div className="relative z-10 flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <NuMark size={compact ? 18 : 24} />
          <div className="leading-tight">
            <div className="font-serif text-[11px] text-nu-wisp">Northwest University</div>
            {!compact && (
              <div className="text-[8px] uppercase tracking-[0.2em] text-nu-skylight/80">
                {kioskName}
              </div>
            )}
          </div>
        </div>
        <span className="text-[9px] font-mono text-nu-skylight/80 bg-black/25 px-2 py-0.5 rounded-full border border-white/10">
          {slide.duration_seconds || 15}s
        </span>
      </div>

      {/* Protected Content Zone */}
      <div className="relative z-10 my-auto py-3 flex flex-col gap-2.5">
        <div>
          <span
            className={[
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] border',
              theme.pillBg,
            ].join(' ')}
          >
            {subtitle.slice(0, 32)}
          </span>
        </div>

        {mediaUrl && isImageSource(mediaUrl) && (
          <div
            className={[
              'relative rounded-xl overflow-hidden border border-white/15 bg-black/30',
              compact ? 'max-h-[85px]' : 'max-h-[160px]',
            ].join(' ')}
          >
            <img
              src={mediaUrl}
              alt={title}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <h3
          className={[
            'font-serif font-bold text-nu-wisp leading-[1.15] tracking-tight break-words line-clamp-3',
            compact ? 'text-[14px]' : 'text-[22px]',
          ].join(' ')}
        >
          {title.slice(0, 65)}
        </h3>

        {body && (
          <p
            className={[
              'text-nu-powder/90 leading-relaxed break-words line-clamp-4',
              compact ? 'text-[9px]' : 'text-[12px]',
            ].join(' ')}
          >
            {body.slice(0, 180)}
          </p>
        )}

        {(slide.event_date || slide.event_time || slide.event_location) && (
          <div
            className={[
              'rounded-xl p-2.5 border flex flex-col gap-1',
              compact ? 'text-[8px]' : 'text-[11px]',
              theme.cardBg,
            ].join(' ')}
          >
            {(slide.event_date || slide.event_time) && (
              <div className="flex items-center gap-1.5 text-nu-wisp font-semibold">
                <IconClock size={compact ? 10 : 12} className={theme.accentText} />
                <span className="truncate">
                  {[formatReadableDate(slide.event_date), slide.event_time]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>
            )}
            {slide.event_location && (
              <div className="flex items-center gap-1.5 text-nu-skylight">
                <IconMapPin size={compact ? 10 : 12} className={theme.accentText} />
                <span className="truncate">{slide.event_location.slice(0, 40)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Protected Footer / QR Zone */}
      <div className="relative z-10 pt-2.5 border-t border-white/10">
        {slide.cta_url && !compact ? (
          <div className="flex items-center justify-between gap-2.5 bg-black/25 rounded-xl p-2 border border-white/10">
            <div className="min-w-0">
              <div className={`text-[9px] font-bold uppercase tracking-wider ${theme.accentText}`}>
                {slide.cta_label || 'Scan for Details'}
              </div>
              <div className="text-[10px] text-nu-wisp font-medium truncate">
                {slide.cta_url.replace(/^https?:\/\//, '')}
              </div>
            </div>
            <PseudoQrCode value={slide.cta_url} />
          </div>
        ) : (
          <div className="flex items-center justify-between text-[9px] text-nu-skylight/75">
            <span>Northwest University</span>
            <span className={theme.accentText}>● Locked Brand Layout</span>
          </div>
        )}
      </div>
    </div>
  )
})
