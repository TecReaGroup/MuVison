import { useEffect, type ReactNode } from 'react'
import { ArrowLeftIcon } from '@/shared/design/icon'
import type { Video } from './catalog'
import { VideoGrid } from './VideoGrid'

export type DetailNavigation = {
  backLabel: string
  onBack: () => void
  onPlay: (video: Video) => void
  onAuthor: (id: string) => void
}

type DetailHeading = { kind: string; title: string; media: ReactNode; meta?: string }

/**
 * Album or author page: back link, a heading with artwork, then the subject's videos.
 * `heading` is undefined once the subject is gone (an edit moved its last video away); the page then leaves.
 */
export function CatalogDetail({
  heading,
  videos,
  backLabel,
  onBack,
  onPlay,
  onAuthor,
}: DetailNavigation & { heading: DetailHeading | undefined; videos: Video[] }) {
  const missing = !heading
  useEffect(() => {
    if (missing) onBack()
  }, [missing, onBack])
  if (!heading) return null

  return (
    <div>
      <button
        onClick={onBack}
        className="group mb-4 flex items-center gap-2 text-sm text-muted transition-colors duration-300 hover:text-foreground md:mb-6"
      >
        <ArrowLeftIcon className="h-4 w-4 transition-transform duration-300 ease-out group-hover:-translate-x-1" />
        {backLabel}
      </button>

      <div className="mb-6 flex items-center gap-4 border-b border-border/80 pb-6 md:mb-10 md:gap-6 md:pb-10">
        <div>{heading.media}</div>
        <div>
          <p className="text-xs font-medium tracking-wider text-subtle">{heading.kind}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">{heading.title}</h1>
          {heading.meta && <p className="mt-2 text-sm text-muted">{heading.meta}</p>}
        </div>
      </div>

      <VideoGrid items={videos} onPlay={onPlay} onAuthor={onAuthor} />
    </div>
  )
}
