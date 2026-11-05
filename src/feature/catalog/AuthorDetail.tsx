import { authorById, VIDEOS, type Video } from './catalog'
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

export function AuthorDetail({ id, backLabel, onBack, onPlay, onAuthor }: DetailProps) {
  const author = authorById(id)
  const items = VIDEOS.filter((video) => video.authorId === id)
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
            src={author.avatar}
            alt={tr(author.name)}
            className="h-16 w-16 rounded-full object-cover ring-4 ring-white md:h-24 md:w-24"
          />
        </div>
        <div>
          <p className="text-xs font-medium tracking-wider text-subtle">{t.author}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">{tr(author.name)}</h1>
          <p className="mt-2 text-sm text-muted">{author.handle}</p>
        </div>
      </div>

      <VideoGrid items={items} onPlay={onPlay} onAuthor={onAuthor} />
    </div>
  )
}
