import { albumById, VIDEOS, type Video } from './catalog'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { ArrowLeftIcon } from '@/shared/design/icon'
import { VideoGrid } from './VideoGrid'

type DetailProps = {
  id: string
  backLabel: string
  onBack: () => void
  onPlay: (video: Video) => void
  onAuthor: (id: string) => void
}

export function AlbumDetail({ id, backLabel, onBack, onPlay, onAuthor }: DetailProps) {
  const album = albumById(id)
  const items = VIDEOS.filter((video) => video.albumId === id)
  const { t, tr } = useI18n()
  return (
    <div>
      <button
        onClick={onBack}
        className="group mb-4 flex items-center gap-2 text-sm text-muted md:mb-6 transition-colors duration-300 hover:text-foreground"
      >
        <ArrowLeftIcon className="h-4 w-4 transition-transform duration-300 ease-out group-hover:-translate-x-1" />
        {backLabel}
      </button>

      <div className="mb-6 flex items-center gap-4 border-b border-border/80 pb-6 md:mb-10 md:gap-6 md:pb-10">
        <div>
          <img
            src={items[0]?.cover}
            alt={tr(album.title)}
            className="aspect-video w-28 rounded-lg object-cover sm:w-36 md:w-48 md:rounded-xl"
          />
        </div>
        <div>
          <p className="text-xs font-medium tracking-wider text-subtle">{t.album}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">{tr(album.title)}</h1>
        </div>
      </div>

      <VideoGrid items={items} onPlay={onPlay} onAuthor={onAuthor} />
    </div>
  )
}
