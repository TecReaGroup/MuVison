import { useState } from 'react'
import { motion } from 'motion/react'
import { albumById, authorById, VIDEOS, type Video } from '@/feature/catalog/catalog'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { ArrowLeftIcon, ArrowRightIcon } from '@/shared/design/icon'
import { EASE } from '@/shared/design/motion'
import { VideoPlayer } from './VideoPlayer'
import { PlaylistPanel } from './PlaylistPanel'
import './watch.css'

type WatchProps = {
  video: Video
  onBack: () => void
  onPlay: (v: Video) => void
  onAuthor: (id: string) => void
  onAlbum: (id: string) => void
}

// Left column (title, player, info) refreshes softly when the video changes; the playlist stays put
const VIDEO_SWAP = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: EASE },
}

export default function WatchPage({ video, onBack, onPlay, onAuthor, onAlbum }: WatchProps) {
  const author = authorById(video.authorId)
  const album = albumById(video.albumId)
  const albumVideos = VIDEOS.filter((v) => v.albumId === video.albumId)
  const albumIndex = albumVideos.findIndex((v) => v.id === video.id)
  const related = VIDEOS.filter((v) => v.albumId !== video.albumId).sort(
    (a, b) => Number(b.category === video.category) - Number(a.category === video.category),
  )
  const next = albumVideos[albumIndex + 1] ?? related[0]
  const { t, tr } = useI18n()
  const hasPlaylist = albumVideos.length > 1
  const [isPlaying, setIsPlaying] = useState(false)
  const authorVideoCount = VIDEOS.filter((v) => v.authorId === author.id).length

  return (
    <div className={`watch-shell ${hasPlaylist ? '' : 'watch-shell--single'}`}>
      {/* Back + title share one row to keep the player close to the top */}
      <div className={`mb-3 flex items-center gap-1.5 sm:mb-4 sm:gap-2 ${hasPlaylist ? 'xl:pr-[412px]' : ''}`}>
        <button
          onClick={onBack}
          aria-label={t.back}
          title={t.back}
          className="group -ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted transition-colors duration-200 hover:bg-stone-200/60 hover:text-foreground"
        >
          <ArrowLeftIcon className="h-5 w-5 transition-transform duration-200 ease-out group-hover:-translate-x-0.5" />
        </button>
        <motion.h1
          key={`title-${video.id}`}
          {...VIDEO_SWAP}
          title={tr(video.title)}
          className="min-w-0 flex-1 truncate text-lg font-semibold leading-tight tracking-[-0.015em] sm:text-[22px]"
        >
          {tr(video.title)}
        </motion.h1>
      </div>

      <div className={`grid gap-x-8 gap-y-6 ${hasPlaylist ? 'xl:grid-cols-[minmax(0,1fr)_380px]' : ''}`}>
        <motion.div key={`player-${video.id}`} {...VIDEO_SWAP} className="-mx-4 min-w-0 sm:mx-0">
          <VideoPlayer
            key={video.id}
            video={video}
            next={next}
            onNext={() => next && onPlay(next)}
            onPlayingChange={setIsPlaying}
          />
        </motion.div>

        <motion.div key={`info-${video.id}`} {...VIDEO_SWAP} className="min-w-0 xl:col-start-1 xl:row-start-2">
          <section className="rounded-2xl bg-surface px-4 py-4 ring-1 ring-border/70 sm:px-6 sm:py-5">
            <div className="flex items-center justify-between gap-3 sm:gap-4">
              <button
                onClick={() => onAuthor(author.id)}
                className="group flex min-w-0 items-center gap-3 text-left sm:gap-3.5"
              >
                <img
                  src={author.avatar}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-stone-100 transition-transform sm:h-12 sm:w-12 duration-300 ease-out group-hover:scale-105"
                />
                <span className="min-w-0">
                  <span className="block truncate font-medium leading-tight transition-colors duration-300 group-hover:text-secondary">
                    {tr(author.name)}
                  </span>
                  <span className="mt-1 block truncate text-[13px] text-subtle">
                    {author.handle}
                    <span className="mx-1.5 text-stone-300">·</span>
                    {t.videoCount(authorVideoCount)}
                  </span>
                </span>
              </button>
              <button
                onClick={() => onAuthor(author.id)}
                className="group flex shrink-0 items-center rounded-full bg-stone-200/55 px-4 py-2 text-sm sm:px-5 sm:py-2.5 font-medium text-stone-700 transition-colors duration-200 hover:bg-stone-200 hover:text-foreground"
              >
                {t.viewProfile}
                {/* Arrow reveals on hover/focus only */}
                <span className="flex w-0 overflow-hidden opacity-0 transition-all duration-200 ease-out group-hover:ml-1.5 group-hover:w-4 group-hover:opacity-100 group-focus-visible:ml-1.5 group-focus-visible:w-4 group-focus-visible:opacity-100">
                  <ArrowRightIcon className="h-4 w-4 shrink-0" />
                </span>
              </button>
            </div>
          </section>
        </motion.div>

        {hasPlaylist && (
          // On xl the panel spans both rows and is absolutely filled, so its height follows player + info card
          <aside className="relative min-w-0 xl:col-start-2 xl:row-span-2 xl:row-start-1">
            <PlaylistPanel
              title={tr(album.title)}
              items={albumVideos}
              currentId={video.id}
              playing={isPlaying}
              onPlay={onPlay}
              onOpen={() => onAlbum(album.id)}
            />
          </aside>
        )}
      </div>
    </div>
  )
}
