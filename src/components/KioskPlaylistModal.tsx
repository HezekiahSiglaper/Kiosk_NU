import { useEffect, useMemo, useState } from 'react'
import { KioskSlidePreview } from './KioskSlidePreview'
import { Button } from './Button'
import { IconX } from './icons'
import { getScheduleState } from '../services/content'
import type { CampusDisplayOption, KioskContentItem } from '../types/content'

type Props = {
  open: boolean
  onClose: () => void
  items: KioskContentItem[]
  displays: CampusDisplayOption[]
  initialDisplayId?: string
}

export function KioskPlaylistModal({
  open,
  onClose,
  items,
  displays,
  initialDisplayId = 'all',
}: Props) {
  const [selectedDisplay, setSelectedDisplay] = useState(initialDisplayId)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    setSelectedDisplay(initialDisplayId)
    setCurrentIndex(0)
  }, [initialDisplayId, open])

  const playlist = useMemo(() => {
    return items.filter((item) => {
      if (item.status !== 'published') return false
      if (getScheduleState(item) === 'expired') return false
      if (selectedDisplay === 'all') return true
      return (
        item.target_displays.includes('all') ||
        item.target_displays.includes(selectedDisplay)
      )
    })
  }, [items, selectedDisplay])

  const activeSlide = playlist[currentIndex] || playlist[0] || null

  useEffect(() => {
    if (!open || paused || playlist.length <= 1 || !activeSlide) return
    const durationMs = Math.max(4, activeSlide.duration_seconds || 10) * 1000
    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % playlist.length)
    }, durationMs)
    return () => clearTimeout(timer)
  }, [open, paused, playlist.length, activeSlide, currentIndex])

  if (!open) return null

  const displayObj = displays.find((d) => d.id === selectedDisplay)
  const kioskTitle = displayObj ? displayObj.name : 'All Campus Kiosks'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="nu-card max-w-4xl w-full p-6 md:p-8 border border-white/15 relative flex flex-col md:flex-row gap-8 items-center">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-nu-wisp transition-colors"
          aria-label="Close preview"
        >
          <IconX size={16} />
        </button>

        {/* Left column: Simulated Physical Kiosk */}
        <div className="w-full md:w-auto flex flex-col items-center shrink-0">
          {activeSlide ? (
            <KioskSlidePreview
              slide={activeSlide}
              kioskName={kioskTitle}
              orientation="portrait"
            />
          ) : (
            <div className="aspect-[9/16] w-[300px] rounded-[26px] border-2 border-dashed border-white/20 flex flex-col items-center justify-center p-6 text-center text-nu-skylight">
              <p className="font-serif text-lg text-nu-wisp mb-1">No Active Slides</p>
              <p className="text-xs">
                Publish a slide targeted to {kioskTitle} to see it in this rotation.
              </p>
            </div>
          )}
        </div>

        {/* Right column: Playlist Controls & Queue */}
        <div className="flex-1 w-full flex flex-col gap-5">
          <div>
            <div className="nu-eyebrow">Live Kiosk Simulator</div>
            <h2 className="text-2xl font-serif text-nu-wisp mt-1">
              See What’s Playing on Campus
            </h2>
            <p className="text-xs text-nu-skylight mt-1">
              Preview the exact slide rotation for any building kiosk. Only{' '}
              <span className="text-nu-leaf font-semibold">Published</span> slides
              within their scheduled dates appear on screens.
            </p>
          </div>

          {/* Kiosk Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-nu-skylight mb-2">
              Inspect Kiosk Screen
            </label>
            <select
              value={selectedDisplay}
              onChange={(e) => {
                setSelectedDisplay(e.target.value)
                setCurrentIndex(0)
              }}
              className="w-full rounded-xl bg-nu-midnight/90 border border-white/15 px-3.5 py-2.5 text-sm text-nu-wisp focus:outline-none focus:border-nu-tour"
            >
              <option value="all">All Campus Kiosks ({items.filter((i) => i.status === 'published').length} published)</option>
              {displays.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.location})
                </option>
              ))}
            </select>
          </div>

          {/* Playlist Queue */}
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs text-nu-skylight mb-2">
              <span>Rotation Queue ({playlist.length} slides)</span>
              {playlist.length > 1 && (
                <button
                  type="button"
                  onClick={() => setPaused((p) => !p)}
                  className="text-nu-tour hover:underline font-semibold"
                >
                  {paused ? '▶ Resume Auto-Play' : '⏸ Pause Rotation'}
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
              {playlist.map((slide, idx) => {
                const isCurrent = idx === currentIndex
                return (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={[
                      'w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-3',
                      isCurrent
                        ? 'bg-nu-tour/15 border-nu-tour/50 text-nu-wisp'
                        : 'bg-white/[0.03] border-white/10 text-nu-skylight hover:bg-white/[0.06]',
                    ].join(' ')}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-nu-wisp truncate">
                        {idx + 1}. {slide.title}
                      </div>
                      <div className="text-[11px] text-nu-skylight/80 truncate">
                        {slide.subtitle || slide.content_type} · {slide.duration_seconds}s
                      </div>
                    </div>
                    {isCurrent && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-nu-tour text-nu-midnight shrink-0">
                        Now Showing
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={playlist.length <= 1}
                onClick={() =>
                  setCurrentIndex(
                    (prev) => (prev - 1 + playlist.length) % playlist.length,
                  )
                }
              >
                ← Previous
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={playlist.length <= 1}
                onClick={() =>
                  setCurrentIndex((prev) => (prev + 1) % playlist.length)
                }
              >
                Next Slide →
              </Button>
            </div>
            <Button size="sm" variant="primary" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

