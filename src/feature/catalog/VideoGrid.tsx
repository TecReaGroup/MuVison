import { AnimatePresence, motion } from 'motion/react'
import { authorById, type Video } from './catalog'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { PlayIcon } from '@/shared/design/icon'
import { GRID_ITEM } from '@/shared/design/motion'

export function VideoGrid({
  items,
  onPlay,
  onAuthor,
  className = 'grid grid-cols-1 gap-x-6 gap-y-7 sm:grid-cols-2 md:gap-y-9 xl:grid-cols-3 2xl:grid-cols-4',
}: {
  items: Video[]
  onPlay: (v: Video) => void
  onAuthor: (id: string) => void
  className?: string
}) {
  return (
    <div className={className}>
      <AnimatePresence mode="popLayout">
        {items.map((v) => (
          <motion.div key={v.id} {...GRID_ITEM}>
            <VideoCard video={v} onPlay={onPlay} onAuthor={onAuthor} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

function VideoCard({
  video,
  onPlay,
  onAuthor,
}: {
  video: Video
  onPlay: (v: Video) => void
  onAuthor: (id: string) => void
}) {
  const author = authorById(video.authorId)
  const { tr } = useI18n()
  return (
    <article className="group">
      <button
        onClick={() => onPlay(video)}
        className="relative block aspect-video w-full overflow-hidden rounded-xl bg-stone-200 "
      >
        <img
          src={video.cover}
          alt={tr(video.title)}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
        />
        <div className="absolute inset-0 bg-stone-950/0 transition-colors duration-200 group-hover:bg-stone-950/10" />
        <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-foreground opacity-0 shadow-lg backdrop-blur transition-opacity duration-200 group-hover:opacity-100">
          <PlayIcon className="h-5 w-5 translate-x-px" />
        </span>
        <span className="absolute bottom-2 right-2 rounded-md bg-stone-950/75 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
          {video.duration}
        </span>
      </button>
      <button onClick={() => onPlay(video)} className="mt-3 block text-left">
        <h3 className="line-clamp-1 text-[15px] font-medium leading-snug text-foreground transition-colors duration-200 group-hover:text-secondary">
          {tr(video.title)}
        </h3>
      </button>
      <button
        onClick={() => onAuthor(author.id)}
        className="mt-1 text-sm text-muted transition-colors duration-300 hover:text-foreground"
      >
        {tr(author.name)}
      </button>
    </article>
  )
}
