import { useCallback, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { formatDuration, type Video } from './catalog'
import { useCatalog } from './CatalogProvider'
import { EditVideoDialog } from './EditVideoDialog'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { PencilIcon, PlayIcon } from '@/shared/design/icon'
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
  const [editing, setEditing] = useState<Video | null>(null)
  const closeEditor = useCallback(() => setEditing(null), [])
  return (
    <div className={className}>
      <AnimatePresence mode="popLayout">
        {items.map((v) => (
          <motion.div key={v.id} {...GRID_ITEM}>
            <VideoCard video={v} onPlay={onPlay} onAuthor={onAuthor} onEdit={setEditing} />
          </motion.div>
        ))}
      </AnimatePresence>
      <EditVideoDialog video={editing} onClose={closeEditor} />
    </div>
  )
}

function VideoCard({
  video,
  onPlay,
  onAuthor,
  onEdit,
}: {
  video: Video
  onPlay: (v: Video) => void
  onAuthor: (id: string) => void
  onEdit: (v: Video) => void
}) {
  const author = useCatalog().authorById(video.authorId)
  const { t } = useI18n()
  return (
    <article className="group">
      {/* Edit sits beside the play surface, not inside it: buttons cannot nest */}
      <div className="relative">
        <button
          onClick={() => onPlay(video)}
          className="relative block aspect-video w-full overflow-hidden rounded-xl bg-stone-200 "
        >
          <img
            src={video.cover}
            alt={video.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-stone-950/0 transition-colors duration-200 group-hover:bg-stone-950/10" />
          {/* Wrapper centers; the inner chip scales, so the two transforms never fight */}
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-12 w-12 scale-90 items-center justify-center rounded-full bg-surface/90 text-foreground opacity-0 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.35)] ring-1 ring-black/5 backdrop-blur transition-[opacity,transform] duration-200 ease-out group-hover:scale-100 group-hover:opacity-100">
              <PlayIcon className="h-[18px] w-[18px]" />
            </span>
          </span>
          <span className="absolute bottom-2 right-2 rounded-md bg-stone-950/75 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
            {formatDuration(video.durationSeconds)}
          </span>
        </button>
        {/* Hover reveals it; touch screens have no hover, so it stays visible there */}
        <button
          onClick={() => onEdit(video)}
          aria-label={t.editVideo}
          title={t.editVideo}
          className="absolute right-2.5 top-2.5 flex h-8 w-8 -translate-y-1 items-center justify-center rounded-full bg-surface/85 text-stone-600 opacity-0 shadow-[0_4px_12px_-4px_rgba(0,0,0,0.3)] ring-1 ring-black/5 backdrop-blur transition-[opacity,transform,background-color,color] duration-200 ease-out hover:bg-surface hover:text-foreground focus-visible:translate-y-0 focus-visible:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100"
        >
          <PencilIcon className="h-[15px] w-[15px]" />
        </button>
      </div>
      <button onClick={() => onPlay(video)} className="mt-3 block text-left">
        <h3 className="line-clamp-1 text-[15px] font-medium leading-snug text-foreground transition-colors duration-200 group-hover:text-secondary">
          {video.title}
        </h3>
      </button>
      <button
        onClick={() => onAuthor(author.id)}
        className="mt-1 text-sm text-muted transition-colors duration-300 hover:text-foreground"
      >
        {author.name}
      </button>
    </article>
  )
}
