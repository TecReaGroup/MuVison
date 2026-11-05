import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { authorById, type Video } from '@/feature/catalog/catalog'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { ArrowRightIcon } from '@/shared/design/icon'
import { EASE } from '@/shared/design/motion'
import { useScrollActivity } from '@/shared/design/useScrollActivity'

// Paused heights give the bars a still, "frozen" equalizer look
const BAR_DELAYS = [0, 0.25, 0.5]
const PAUSED_HEIGHTS = [0.45, 0.8, 0.6]

function NowPlayingBars({ playing }: { playing: boolean }) {
  return (
    <span className="flex h-3.5 items-end gap-[2.5px]" aria-hidden="true">
      {BAR_DELAYS.map((d, i) => (
        <motion.span
          key={d}
          className="h-full w-[3px] origin-bottom rounded-full bg-current"
          animate={playing ? { scaleY: [0.35, 1, 0.55, 0.85, 0.35] } : { scaleY: PAUSED_HEIGHTS[i] }}
          transition={
            playing ? { duration: 1.1, repeat: Infinity, delay: d, ease: 'easeInOut' } : { duration: 0.35, ease: EASE }
          }
        />
      ))}
    </span>
  )
}

export function PlaylistPanel({
  title,
  items,
  currentId,
  playing,
  onPlay,
  onOpen,
}: {
  title: string
  items: Video[]
  currentId: string
  playing: boolean
  onPlay: (v: Video) => void
  onOpen: () => void
}) {
  const { t } = useI18n()
  const listRef = useRef<HTMLDivElement>(null)
  const hasCentered = useRef(false)
  const [fade, setFade] = useState({ top: false, bottom: false })
  const index = items.findIndex((v) => v.id === currentId)

  const scroll = useScrollActivity()
  const onListScroll = () => {
    updateFade()
    scroll.onScroll()
  }

  const updateFade = useCallback(() => {
    const el = listRef.current
    if (!el) return
    setFade({ top: el.scrollTop > 2, bottom: el.scrollTop + el.clientHeight < el.scrollHeight - 2 })
  }, [])

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    // Center the current item inside the list without scrolling the page; jump on first render, glide after
    const active = el.querySelector<HTMLElement>('[data-active="true"]')
    if (active) {
      const top = active.offsetTop - el.clientHeight / 2 + active.offsetHeight / 2
      el.scrollTo({ top, behavior: hasCentered.current ? 'smooth' : 'auto' })
      hasCentered.current = true
    }
    updateFade()
    const ro = new ResizeObserver(updateFade)
    ro.observe(el)
    return () => ro.disconnect()
  }, [currentId, updateFade])

  const mask = `linear-gradient(to bottom, ${fade.top ? 'transparent' : '#000'} 0, #000 28px, #000 calc(100% - 28px), ${
    fade.bottom ? 'transparent' : '#000'
  } 100%)`

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-16px_rgba(0,0,0,0.12)] ring-1 ring-border/70 max-xl:max-h-[480px] xl:absolute xl:inset-0">
      <header className="shrink-0 px-4 pb-3.5 pt-4 sm:px-5 sm:pb-4 sm:pt-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-subtle">{t.album}</p>
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <button onClick={onOpen} className="group flex min-w-0 items-center gap-1.5 text-left">
            <span className="truncate text-[17px] font-semibold tracking-tight">{title}</span>
            <ArrowRightIcon className="h-4 w-4 shrink-0 -translate-x-1 text-subtle opacity-0 transition-all duration-300 ease-out group-hover:translate-x-0 group-hover:opacity-100" />
          </button>
          <span className="shrink-0 text-xs font-medium tabular-nums text-subtle">
            <span className="text-foreground">{index + 1}</span> / {items.length}
          </span>
        </div>
      </header>

      <div className="mx-4 h-px shrink-0 bg-stone-100 sm:mx-5" />

      <div
        ref={listRef}
        onScroll={onListScroll}
        style={{ maskImage: mask, WebkitMaskImage: mask }}
        className={`${scroll.scrollClass} relative min-h-0 flex-1 space-y-1 overflow-y-auto p-2.5`}
      >
        {items.map((v, i) => (
          <PlaylistItem
            key={v.id}
            video={v}
            index={i + 1}
            active={v.id === currentId}
            playing={playing}
            onPlay={onPlay}
          />
        ))}
      </div>
    </section>
  )
}

function PlaylistItem({
  video,
  index,
  active,
  playing,
  onPlay,
}: {
  video: Video
  index: number
  active: boolean
  playing: boolean
  onPlay: (v: Video) => void
}) {
  const author = authorById(video.authorId)
  const { tr } = useI18n()
  return (
    <motion.button
      data-active={active}
      onClick={() => !active && onPlay(video)}
      aria-current={active ? 'true' : undefined}
      // Highlight and index/indicator swap share one 200ms fade so they always change together
      className={`group relative flex w-full items-center gap-3 rounded-xl p-2 pr-3 text-left text-foreground transition-[background-color,box-shadow] duration-200 ${
        active
          ? 'bg-stone-100 shadow-[inset_0_0_0_1px_rgba(214,211,209,0.7)]'
          : 'shadow-[inset_0_0_0_1px_rgba(214,211,209,0)] hover:bg-surface-muted'
      }`}
    >
      <span className="relative grid w-5 shrink-0 place-items-center text-xs font-medium tabular-nums">
        <span
          className={`col-start-1 row-start-1 transition-opacity duration-200 ${active ? 'opacity-0' : 'text-subtle opacity-100 group-hover:text-stone-700'}`}
        >
          {index}
        </span>
        <span
          className={`col-start-1 row-start-1 text-accent transition-opacity duration-200 ${active ? 'opacity-100' : 'opacity-0'}`}
        >
          <NowPlayingBars playing={active && playing} />
        </span>
      </span>
      <span
        className={`relative aspect-video w-28 shrink-0 sm:w-[132px] overflow-hidden rounded-lg bg-stone-200 ring-1 ring-black/5`}
      >
        <img src={video.cover} alt="" loading="lazy" className="h-full w-full object-cover " />
        <span className="absolute bottom-1 right-1 rounded-md bg-stone-950/75 px-1.5 py-px text-[10px] font-medium tabular-nums text-white backdrop-blur-sm">
          {video.duration}
        </span>
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="line-clamp-2 text-[13px] font-medium leading-snug">{tr(video.title)}</span>
        <span className={`mt-1 block truncate text-xs text-muted`}>{tr(author.name)}</span>
      </span>
    </motion.button>
  )
}
