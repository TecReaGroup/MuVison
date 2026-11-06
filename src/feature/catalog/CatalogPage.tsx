import { useMemo } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { Video } from './catalog'
import { useCatalog } from './CatalogProvider'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { GRID_ITEM } from '@/shared/design/motion'
import { PageTitle } from '@/shared/design/PageTitle'
import { AuthorCard } from './AuthorCard'
import { SearchEmpty } from './SearchEmpty'
import { VideoGrid } from './VideoGrid'

export type CatalogSection = 'videos' | 'albums' | 'authors'

const matchesQuery = (text: string, q: string) => text.toLowerCase().includes(q.trim().toLowerCase())

export function CatalogPage({
  section,
  query,
  onPlay,
  onAuthor,
  onAlbum,
}: {
  section: CatalogSection
  query: string
  onPlay: (video: Video) => void
  onAuthor: (id: string) => void
  onAlbum: (id: string) => void
}) {
  const { t } = useI18n()
  const { videos, albums, authors, authorById } = useCatalog()
  const filteredVideos = useMemo(
    () => videos.filter((v) => matchesQuery(v.title, query) || matchesQuery(authorById(v.authorId).name, query)),
    [videos, authorById, query],
  )
  const filteredAlbums = albums.filter(
    (a) => matchesQuery(a.title, query) || a.authorIds.some((id) => matchesQuery(authorById(id).name, query)),
  )
  const filteredAuthors = authors.filter((a) => matchesQuery(a.name, query))

  return section === 'videos' ? (
    <>
      <PageTitle title={t.navVideos} sub={t.videoCount(filteredVideos.length)} />
      {filteredVideos.length ? (
        <VideoGrid items={filteredVideos} onPlay={onPlay} onAuthor={onAuthor} />
      ) : (
        <SearchEmpty query={query} />
      )}
    </>
  ) : section === 'albums' ? (
    <>
      <PageTitle title={t.navAlbums} sub={t.albumCount(filteredAlbums.length)} />
      {filteredAlbums.length ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:gap-x-6 sm:gap-y-8 md:gap-y-10 xl:grid-cols-3 2xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {filteredAlbums.map((al) => {
              const items = videos.filter((v) => v.albumId === al.id)
              return (
                <motion.button key={al.id} {...GRID_ITEM} onClick={() => onAlbum(al.id)} className="group text-left">
                  <div className="relative pt-2 sm:pt-3">
                    <div className="absolute inset-x-4 top-0 h-6 rounded-t-xl bg-stone-300/70 sm:inset-x-6" />
                    <div className="absolute inset-x-2 top-1 h-6 rounded-t-xl bg-stone-300 sm:inset-x-3 sm:top-1.5" />
                    <div className="relative aspect-video overflow-hidden rounded-xl bg-stone-200 ">
                      <img
                        src={items[0]?.cover}
                        alt={al.title}
                        className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
                      />
                      <div className="absolute inset-y-0 right-0 flex w-1/3 flex-col items-center justify-center gap-1 bg-stone-950/55 text-white backdrop-blur-sm">
                        <span className="text-base font-medium sm:text-xl">{items.length}</span>
                        <span className="text-[11px] text-white/70 sm:text-xs">{t.videosUnit}</span>
                      </div>
                    </div>
                  </div>
                  <h3 className="mt-2 line-clamp-1 text-sm font-medium leading-snug sm:mt-3.5 sm:text-[15px]">{al.title}</h3>
                </motion.button>
              )
            })}
          </AnimatePresence>
        </div>
      ) : (
        <SearchEmpty query={query} />
      )}
    </>
  ) : (
    <>
      <PageTitle title={t.navAuthors} sub={t.authorCount(filteredAuthors.length)} />
      {filteredAuthors.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 xl:grid-cols-4 2xl:grid-cols-6">
          <AnimatePresence mode="popLayout">
            {filteredAuthors.map((a) => (
              <motion.div key={a.id} {...GRID_ITEM}>
                <AuthorCard author={a} onOpen={() => onAuthor(a.id)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <SearchEmpty query={query} />
      )}
    </>
  )
}
