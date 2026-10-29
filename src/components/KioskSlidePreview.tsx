import { memo } from 'react'
import { NuMark } from './NuMark'
import { IconExternal, IconImage } from './icons'
import type { KioskContentFormData, KioskContentItem } from '../types/content'

type SlideData = Pick<
  KioskContentItem | KioskContentFormData,
  | 'title'
  | 'subtitle'
  | 'body'
  | 'content_type'
  | 'theme'
  | 'media_url'
  | 'duration_seconds'
>

type Props = {
  slide: SlideData
  orientation?: 'portrait' | 'landscape'
  kioskName?: string
  compact?: boolean
}

function isImageSource(url: string): boolean {
  if (!url) return false
  if (url.startsWith('data:image')) return true
  if (url.includes('supabase.co/storage')) return true
  return /\.(png|jpe?g|gif|webp|svg|avif)(\?.*)?$/i.test(url)
}

export const KioskSlidePreview = memo(function KioskSlidePreview({
  slide,
  orientation = 'portrait',
  kioskName = 'Campus Kiosk',
  compact = false,
}: Props) {
  const mediaUrl = slide.media_url?.trim() || ''
  const title = slide.title?.trim() || 'Untitled Slide'
  const isPortrait = orientation === 'portrait'

  return (
    <div
      className={[
        'relative overflow-hidden rounded-[24px] border-2 border-white/20 bg-[#001a2c] select-none flex flex-col justify-between text-nu-wisp',
        isPortrait
          ? compact
            ? 'aspect-[9/16] w-full max-w-[200px]'
            : 'aspect-[9/16] w-full max-w-[320px] shadow-glass'
          : 'aspect-[16/9] w-full shadow-glass',
      ].join(' ')}
    >
      {mediaUrl ? (
        isImageSource(mediaUrl) || slide.content_type === 'poster' ? (
          /* Full-bleed 9:16 Imported Poster / Slide Graphic */
          <div className="relative w-full h-full flex-1 bg-black flex items-center justify-center">
            <img
              src={mediaUrl}
              alt={title}
              loading="lazy"
              className="w-full h-full object-cover"
            />
            {/* Subtle Kiosk Bezel Badge */}
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
          /* Imported External Web / Canva / Google Slides / Video URL */
          <div className="flex-1 flex flex-col items-center justify-between p-6 text-center bg-gradient-to-b from-[#034C87] to-[#00263d]">
            <div className="w-full flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <NuMark size={20} />
                <span className="text-[11px] font-serif text-nu-wisp truncate">
                  {kioskName}
                </span>
              </div>
              <span className="text-[10px] font-mono text-nu-tour">
                {slide.duration_seconds || 15}s
              </span>
            </div>

            <div className="my-auto space-y-3 px-2">
              <div className="w-12 h-12 rounded-2xl bg-nu-tour/20 border border-nu-tour/40 flex items-center justify-center text-nu-tour mx-auto">
                <IconExternal size={22} />
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-nu-tour">
                Imported Web / Embed Link
              </div>
              <div className="font-serif text-base font-bold text-nu-wisp line-clamp-2">
                {title}
              </div>
              <div className="text-[10px] font-mono text-nu-sky break-all line-clamp-2 bg-black/30 p-2 rounded-lg border border-white/10">
                {mediaUrl}
              </div>
            </div>

            <div className="w-full pt-3 border-t border-white/10 text-[10px] text-nu-skylight/70">
              Full-screen web view on kiosk
            </div>
          </div>
        )
      ) : (
        /* Empty State Placeholder before user imports a file */
        <div className="flex-1 flex flex-col items-center justify-between p-6 text-center bg-gradient-to-b from-[#043352] to-[#001d30]">
          <div className="w-full flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <NuMark size={22} />
              <span className="text-xs font-serif text-nu-wisp">{kioskName}</span>
            </div>
            <span className="text-[10px] font-mono text-nu-skylight/70">
              1080×1920
            </span>
          </div>

          <div className="my-auto space-y-3 px-2">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.06] border border-dashed border-white/25 flex items-center justify-center text-nu-sky mx-auto">
              <IconImage size={26} />
            </div>
            <div className="font-serif text-lg text-nu-wisp">
              Ready for Your Slide
            </div>
            <p className="text-xs text-nu-skylight/80 leading-relaxed">
              Upload your finished graphic from Canva, PowerPoint, or Adobe on the
              left to preview it full-screen here.
            </p>
          </div>

          <div className="w-full pt-3 border-t border-white/10 text-[10px] text-nu-skylight/60">
            Northwest University Digital Signage
          </div>
        </div>
      )}
    </div>
  )
})
