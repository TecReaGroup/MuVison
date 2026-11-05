import { VIDEOS, type Author } from './catalog'
import { useI18n } from '@/shared/i18n/I18nProvider'

export function AuthorCard({ author, onOpen }: { author: Author; onOpen: () => void }) {
  const { t, tr } = useI18n()
  const count = VIDEOS.filter((v) => v.authorId === author.id).length

  return (
    <button
      onClick={onOpen}
      className="group flex w-full flex-col items-center rounded-2xl border border-border/70 bg-surface px-4 pb-4 pt-6 text-center sm:px-5 sm:pb-5 sm:pt-8 transition-colors duration-200 hover:border-stone-300"
    >
      <img
        src={author.avatar}
        alt=""
        className="h-16 w-16 rounded-full object-cover ring-4 ring-stone-100 sm:h-20 sm:w-20"
      />
      <h3 className="mt-4 max-w-full truncate text-[15px] font-semibold tracking-tight text-foreground">
        {tr(author.name)}
      </h3>
      <p className="mt-1 max-w-full truncate text-[13px] text-subtle">{author.handle}</p>
      <p className="mt-4 w-full border-t border-stone-100 pt-3 text-xs sm:mt-5 sm:pt-4 tabular-nums text-muted">
        {t.videoCount(count)}
      </p>
    </button>
  )
}
