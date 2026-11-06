import '@videojs/react/video/skin.css'
import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { I18nProvider as PlayerI18nProvider, type Locale } from '@videojs/react/i18n'
import { createPlayer, orientationLockFeature } from '@videojs/react'
import { Video, VideoSkin, videoFeatures } from '@videojs/react/video'
import type { Video as CatalogVideo } from '@/feature/catalog/catalog'
import { useI18n } from '@/shared/i18n/I18nProvider'
import type { Language } from '@/shared/i18n/locale'
import { ReplayIcon } from '@/shared/design/icon'

const PLAYER_LOCALE: Record<Language, Locale> = { zh: 'zh-CN', en: 'en' }

// Orientation lock rotates to landscape on entering fullscreen (Android); iOS offers no lock API and rotates on its own
const { Player: MediaPlayer, usePlayer } = createPlayer({ features: [...videoFeatures, orientationLockFeature] })

/**
 * Video.js player; its skin owns controls, hotkeys, gestures and fullscreen, which locks to landscape.
 *
 * iPhone Safari has no element Fullscreen API, so the skin falls back to the native video presentation there,
 * which follows device rotation. NOTE: do not fake fullscreen with `position: fixed` on rotation: inside the
 * scrolling <main> and transformed ancestors iOS mis-hit-tests the controls and swallows bottom-edge taps.
 */
export function VideoPlayer({
  video,
  next,
  onNext,
  onPlayingChange,
}: {
  video: CatalogVideo
  next?: CatalogVideo
  onNext: () => void
  onPlayingChange: (playing: boolean) => void
}) {
  const { lang } = useI18n()
  return (
    <PlayerI18nProvider locale={PLAYER_LOCALE[lang]}>
      <MediaPlayer poster={video.cover}>
        <VideoSkin className="aspect-video w-full bg-black [--media-border-radius:0] sm:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.35)] sm:[--media-border-radius:1rem]">
          <Video src={video.src} preload="metadata" playsInline />
          <PlayingStateReporter onPlayingChange={onPlayingChange} />
          <EndScreen next={next} onNext={onNext} />
        </VideoSkin>
      </MediaPlayer>
    </PlayerI18nProvider>
  )
}

function PlayingStateReporter({ onPlayingChange }: { onPlayingChange: (playing: boolean) => void }) {
  const paused = usePlayer((state) => state.paused)
  useEffect(() => onPlayingChange(!paused), [paused, onPlayingChange])
  // A new video mounts paused; make sure the playlist indicator resets too
  useEffect(() => () => onPlayingChange(false), [onPlayingChange])
  return null
}

/** Rendered inside the skin's container so it stays visible in fullscreen. */
function EndScreen({ next, onNext }: { next?: CatalogVideo; onNext: () => void }) {
  const { t } = useI18n()
  const player = usePlayer()
  const ended = usePlayer((state) => state.ended)

  return (
    <AnimatePresence>
      {ended && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-black/60 backdrop-blur-md"
        >
          <div className="flex flex-wrap items-center justify-center gap-4 px-4">
            <button
              // play() on an ended video restarts it from the beginning
              onClick={() => player.play().catch(() => undefined)}
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
                <img src={next.cover} alt={next.title} className="aspect-video w-28 rounded-xl object-cover" />
                <span className="max-w-56">
                  <span className="block text-xs text-subtle">{t.next}</span>
                  <span className="line-clamp-2 text-sm font-medium leading-snug">{next.title}</span>
                </span>
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
