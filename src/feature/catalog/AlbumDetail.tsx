import { useI18n } from '@/shared/i18n/I18nProvider'
import { useCatalog } from './CatalogProvider'
import { CatalogDetail, type DetailNavigation } from './CatalogDetail'

export function AlbumDetail({ id, ...navigation }: DetailNavigation & { id: string }) {
  const { t } = useI18n()
  const { videos, albums } = useCatalog()
  const album = albums.find((candidate) => candidate.id === id)
  const items = videos.filter((video) => video.albumId === id)
  return (
    <CatalogDetail
      {...navigation}
      videos={items}
      heading={
        album && {
          kind: t.album,
          title: album.title,
          media: (
            <img
              src={items[0]?.cover}
              alt={album.title}
              className="aspect-video w-28 rounded-lg object-cover sm:w-36 md:w-48 md:rounded-xl"
            />
          ),
        }
      }
    />
  )
}
