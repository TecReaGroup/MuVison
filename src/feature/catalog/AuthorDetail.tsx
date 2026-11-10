import { useI18n } from '@/shared/i18n/I18nProvider'
import { useCatalog } from './CatalogProvider'
import { CatalogDetail, type DetailNavigation } from './CatalogDetail'

export function AuthorDetail({ id, ...navigation }: DetailNavigation & { id: string }) {
  const { t } = useI18n()
  const { videos, authors } = useCatalog()
  const author = authors.find((candidate) => candidate.id === id)
  const items = videos.filter((video) => video.authorId === id)
  return (
    <CatalogDetail
      {...navigation}
      videos={items}
      heading={
        author && {
          kind: t.author,
          title: author.name,
          meta: t.videoCount(items.length),
          media: (
            <img
              src={author.avatar}
              alt={author.name}
              className="h-16 w-16 rounded-full object-cover ring-4 ring-surface md:h-24 md:w-24"
            />
          ),
        }
      }
    />
  )
}
