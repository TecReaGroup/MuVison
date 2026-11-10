import { useI18n } from '@/shared/i18n/I18nProvider'
import { SearchIcon } from '@/shared/design/icon'

export function SearchEmpty({ query }: { query: string }) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col items-center py-20 text-center md:py-32">
      <SearchIcon className="h-10 w-10 text-border-strong" />
      <p className="mt-4 text-secondary">{t.notFound(query.trim())}</p>
      <p className="mt-1 text-sm text-subtle">{t.tryAnother}</p>
    </div>
  )
}
