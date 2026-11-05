import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { Video } from '@/feature/catalog/catalog'
import { useI18n } from '@/shared/i18n/I18nProvider'
import {
  CollapseIcon,
  ExpandIcon,
  MuteIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  ReplayIcon,
  VolumeIcon,
} from '@/shared/design/icon'
import { EASE } from '@/shared/design/motion'

const toSeconds = (d: string) => d.split(':').reduce((acc, n) => acc * 60 + Number(n), 0)
const formatPlaybackTime = (s: number) => {
  const t = Math.max(0, Math.floor(s))
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}
const RATES = [1, 1.25, 1.5, 2]
const TICK_MS = 250
const IDLE_MS = 2500

/** Simulated player: drives a timeline over the cover image with full playback controls. */
export function VideoPlayer({
  video,
  next,
  onNext,
  onPlayingChange,
}: {
  video: Video
  next?: Video
  onNext: () => void
  onPlayingChange: (playing: boolean) => void
}) {
  const total = toSeconds(video.duration)
  const { t, tr } = useI18n()
  const [playing, setPlaying] = useState(false)
  const [started, setStarted] = useState(false)
  const [time, setTime] = useState(0)
  const [rate, setRate] = useState(1)
  const [muted, setMuted] = useState(false)
  const [idle, setIdle] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [hover, setHover] = useState<number | null>(null)
  const [scrubbing, setScrubbing] = useState(false)
  const [flash, setFlash] = useState<'play' | 'pause' | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const idleTimer = useRef<number>(0)
  // Touch has no hover: first tap reveals controls, a tap while visible toggles playback
  const pointerType = useRef<string>('mouse')
  const canFullscreen = typeof document !== 'undefined' && !!document.fullscreenEnabled
  const ended = time >= total

  const toggle = useCallback(() => {
    setStarted(true)
    if (ended) {
      setTime(0)
      setPlaying(true)
      return
    }
    setFlash(playing ? 'pause' : 'play')
    setPlaying(!playing)
  }, [ended, playing])

  const seek = useCallback((s: number) => setTime(Math.min(total, Math.max(0, s))), [total])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen()
    else rootRef.current?.requestFullscreen?.()
  }, [])

  useEffect(() => {
    if (!playing || scrubbing) return
    const id = window.setInterval(() => setTime((t) => Math.min(total, t + (TICK_MS / 1000) * rate)), TICK_MS)
    return () => window.clearInterval(id)
  }, [playing, scrubbing, rate, total])

  useEffect(() => {
    if (ended) setPlaying(false)
  }, [ended])

  useEffect(() => {
    onPlayingChange(playing)
  }, [playing, onPlayingChange])

  // A new video mounts paused; make sure the playlist indicator resets too
  useEffect(() => () => onPlayingChange(false), [onPlayingChange])

  useEffect(() => {
    if (!flash) return
    const id = window.setTimeout(() => setFlash(null), 500)
    return () => window.clearTimeout(id)
  }, [flash])

  useEffect(() => {
    const onFs = () => setFullscreen(document.fullscreenElement === rootRef.current)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault()
        toggle()
      } else if (e.key === 'ArrowRight') {
        setStarted(true)
        setTime((t) => Math.min(total, t + 5))
      } else if (e.key === 'ArrowLeft') setTime((t) => Math.max(0, t - 5))
      else if (e.key === 'm') setMuted((m) => !m)
      else if (e.key === 'f') toggleFullscreen()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle, toggleFullscreen, total])

  const wake = () => {
    setIdle(false)
    window.clearTimeout(idleTimer.current)
    idleTimer.current = window.setTimeout(() => setIdle(true), IDLE_MS)
  }
  useEffect(() => () => window.clearTimeout(idleTimer.current), [])

  const ratioAt = (clientX: number) => {
    const rect = barRef.current!.getBoundingClientRect()
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
  }

  const progress = total ? time / total : 0
  const showControls = started && (!playing || !idle || scrubbing || hover !== null)

  return (
    <motion.div
      ref={rootRef}
      onPointerDown={(e) => (pointerType.current = e.pointerType)}
      onMouseMove={wake}
      onMouseLeave={() => playing && setIdle(true)}
      className={`relative aspect-video select-none overflow-hidden bg-black ${fullscreen ? '' : 'sm:rounded-2xl sm:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.35)]'} ${
        playing && idle && !scrubbing ? 'cursor-none' : ''
      }`}
    >
      {/* Frame: slow drift tied to the timeline so playback feels alive */}
      <img
        src={video.cover.replace('w=800', 'w=1920')}
        alt={tr(video.title)}
        style={{ transform: `scale(${1.01 + progress * 0.04})` }}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 ease-linear"
      />

      {/* Click surface */}
      <button
        aria-label={playing ? t.pause : t.play}
        onClick={() => {
          if (pointerType.current === 'touch') {
            const visible = showControls && !ended
            wake()
            if (started && !visible) return
          }
          toggle()
        }}
        onDoubleClick={() => canFullscreen && pointerType.current !== 'touch' && toggleFullscreen()}
        className="absolute inset-0 [-webkit-tap-highlight-color:transparent]"
      />

      {/* Center feedback flash */}
      <AnimatePresence>
        {flash && started && (
          <motion.span
            key={flash + time}
            initial={{ opacity: 0.8, scale: 0.95 }}
            animate={{ opacity: 0, scale: 1.1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="pointer-events-none absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white"
          >
            {flash === 'play' ? <PlayIcon className="h-7 w-7 translate-x-0.5" /> : <PauseIcon className="h-7 w-7" />}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Poster state */}
      <AnimatePresence>
        {!started && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/50 via-black/10 to-black/20"
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-surface/95 text-foreground shadow-2xl">
              <PlayIcon className="h-8 w-8 translate-x-0.5" />
            </span>
            <span className="absolute bottom-5 right-5 rounded-md bg-black/60 px-2 py-1 text-xs font-medium tabular-nums text-white backdrop-blur">
              {video.duration}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* End screen */}
      <AnimatePresence>
        {ended && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/60 backdrop-blur-md"
          >
            <div className="flex items-center gap-4">
              <button
                onClick={toggle}
                className="flex items-center gap-2 rounded-full bg-surface/15 px-5 py-2.5 text-sm text-white ring-1 ring-white/20 transition hover:bg-surface/25"
              >
                <ReplayIcon className="h-4 w-4" />
                {t.replay}
              </button>
              {next && (
                <button
                  onClick={onNext}
                  className="group flex items-center gap-3 rounded-2xl bg-surface p-2 pr-5 text-left text-foreground shadow-xl transition-colors hover:bg-surface-muted"
                >
                  <img src={next.cover} alt={tr(next.title)} className="aspect-video w-28 rounded-xl object-cover" />
                  <span className="max-w-56">
                    <span className="block text-xs text-subtle">{t.next}</span>
                    <span className="line-clamp-2 text-sm font-medium leading-snug">{tr(next.title)}</span>
                  </span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <motion.div
        initial={false}
        animate={{ opacity: showControls && !ended ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-5 pb-4 pt-20 ${
          showControls && !ended ? '' : 'pointer-events-none'
        }`}
      >
        {/* Progress bar */}
        <div
          ref={barRef}
          className="group/bar relative flex h-6 cursor-pointer touch-none items-center sm:h-4"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            setScrubbing(true)
            seek(ratioAt(e.clientX) * total)
          }}
          onPointerMove={(e) => {
            const r = ratioAt(e.clientX)
            setHover(r)
            if (scrubbing) seek(r * total)
          }}
          onPointerUp={(e) => {
            setScrubbing(false)
            if (e.pointerType === 'touch') {
              setHover(null)
              wake()
            }
          }}
          onPointerLeave={() => setHover(null)}
        >
          <div
            className={`relative w-full overflow-hidden rounded-full bg-surface/25 transition-all duration-200 ${scrubbing || hover !== null ? 'h-1.5' : 'h-1'}`}
          >
            {hover !== null && (
              <div className="absolute inset-y-0 left-0 bg-surface/30" style={{ width: `${hover * 100}%` }} />
            )}
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-surface"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <span
            className={`absolute h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-surface shadow transition-transform duration-200 ${
              scrubbing || hover !== null ? 'scale-100' : 'scale-0'
            }`}
            style={{ left: `${progress * 100}%` }}
          />
          <AnimatePresence>
            {hover !== null && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="pointer-events-none absolute -top-8 -translate-x-1/2 rounded-md bg-black/80 px-2 py-1 text-[11px] font-medium tabular-nums text-white"
                style={{ left: `${hover * 100}%` }}
              >
                {formatPlaybackTime(hover * total)}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-2 flex items-center gap-1 text-white">
          <PlayerControlButton label={playing ? t.pause : t.play} onClick={toggle}>
            {playing ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
          </PlayerControlButton>
          {next && (
            <PlayerControlButton label={t.next} onClick={onNext}>
              <NextIcon className="h-5 w-5" />
            </PlayerControlButton>
          )}
          <PlayerControlButton label={muted ? t.unmute : t.mute} onClick={() => setMuted((m) => !m)}>
            {muted ? <MuteIcon className="h-5 w-5" /> : <VolumeIcon className="h-5 w-5" />}
          </PlayerControlButton>
          <span className="ml-2 text-[13px] tabular-nums text-white/90">
            {formatPlaybackTime(time)} <span className="text-white/50">/ {video.duration}</span>
          </span>

          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => setRate((r) => RATES[(RATES.indexOf(r) + 1) % RATES.length])}
              className="min-w-12 rounded-lg px-2 py-1.5 text-[13px] font-medium tabular-nums transition-colors hover:bg-surface/15"
              aria-label={t.speed}
            >
              {rate}x
            </button>
            {canFullscreen && (
              <PlayerControlButton label={fullscreen ? t.exitFullscreen : t.fullscreen} onClick={toggleFullscreen}>
                {fullscreen ? <CollapseIcon className="h-5 w-5" /> : <ExpandIcon className="h-5 w-5" />}
              </PlayerControlButton>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function PlayerControlButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-surface/15"
    >
      {children}
    </motion.button>
  )
}
