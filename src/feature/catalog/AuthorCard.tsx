import type { Author } from './catalog'
import { useI18n } from '@/shared/i18n/I18nProvider'

export function AuthorCard({ author, videoCount, onOpen }: { author: Author; videoCount: number; onOpen: () => void }) {
  const { t } = useI18n()

  return (
    <button
      onClick={onOpen}
      className="group flex w-full flex-col items-center rounded-2xl border border-border/70 bg-surface px-4 pb-4 pt-6 text-center transition-colors duration-200 hover:border-border-strong sm:px-5 sm:pb-5 sm:pt-8"
    >
      <img
        src={author.avatar}
        alt=""
        loading="lazy"
        decoding="async"
        className="h-16 w-16 rounded-full object-cover ring-4 ring-fill sm:h-20 sm:w-20"
      />
      <h3 className="mt-4 max-w-full truncate text-[15px] font-semibold tracking-tight text-foreground">
        {author.name}
      </h3>
      <p className="mt-4 w-full border-t border-fill pt-3 text-xs tabular-nums text-muted sm:mt-5 sm:pt-4">
        {t.videoCount(videoCount)}
      </p>
    </button>
  )
}
