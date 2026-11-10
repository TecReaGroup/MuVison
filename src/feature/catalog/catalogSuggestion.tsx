import { useCatalog } from './CatalogProvider'
import { useI18n } from '@/shared/i18n/I18nProvider'
import type { Suggestion } from '@/shared/design/SuggestionCombobox'

export function useAlbumSuggestions(): Suggestion[] {
  const { t } = useI18n()
  const { videos, albums, authorById } = useCatalog()
  return albums.map((album) => {
    const items = videos.filter((v) => v.albumId === album.id)
    return {
      id: album.id,
      label: album.title,
      meta: `${album.authorIds.map((id) => authorById(id).name).join(' / ')} · ${t.videoCount(items.length)}`,
      thumbnail: (
        <span className="aspect-video w-12 shrink-0 overflow-hidden rounded-md bg-fill-strong ring-1 ring-black/5">
          {items[0] && <img src={items[0].cover} alt="" className="h-full w-full object-cover" />}
        </span>
      ),
    }
  })
}

export function useCreatorSuggestions(): Suggestion[] {
  const { t } = useI18n()
  const { videos, authors } = useCatalog()
  return authors.map((author) => ({
    id: author.id,
    label: author.name,
    meta: t.videoCount(videos.filter((v) => v.authorId === author.id).length),
    thumbnail: (
      <img src={author.avatar} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-black/5" />
    ),
  }))
}
