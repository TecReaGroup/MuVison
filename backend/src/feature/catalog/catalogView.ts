import type { CreatorPhotoStore } from './creatorPhoto'
import { stableId, type LibraryVideo } from './library'

export type AuthorView = { id: string; name: string; avatar: string }
/** `authorIds` lists every creator with a video in the album, in first-appearance order. */
export type AlbumView = { id: string; title: string; authorIds: string[] }
export type VideoView = {
  id: string
  title: string
  authorId: string
  albumId: string
  cover: string
  src: string
  durationSeconds: number
}
export type CatalogView = { authors: AuthorView[]; albums: AlbumView[]; videos: VideoView[] }

// Public and versioned: a retag changes the URL, so CDNs and browsers may cache these forever
export const coverUrl = ({ id, version }: LibraryVideo) => `/media/video/${id}/${version}/cover`
export const streamUrl = ({ id, version }: LibraryVideo) => `/media/video/${id}/${version}/stream`
export const creatorPhotoUrl = (authorId: string) => `/api/creator/${authorId}/photo`
export const authorIdOf = (creator: string) => stableId('author', creator)

/**
 * Groups videos into creators and albums. An album is identified by its name alone,
 * so one album can collect videos from several creators.
 * A creator's avatar is their stored photo, else the cover of their first video.
 */
export function buildCatalog(videos: LibraryVideo[], photos: CreatorPhotoStore): CatalogView {
  const authors = new Map<string, AuthorView>()
  const albums = new Map<string, AlbumView>()
  const videoViews = videos.map((video): VideoView => {
    const { id, tag } = video
    const authorId = authorIdOf(tag.creator)
    const albumId = stableId('album', tag.album)
    if (!authors.has(authorId)) {
      const avatar = photos.findFileName(tag.creator) ? creatorPhotoUrl(authorId) : coverUrl(video)
      authors.set(authorId, { id: authorId, name: tag.creator, avatar })
    }
    const album = albums.get(albumId) ?? { id: albumId, title: tag.album, authorIds: [] }
    if (!album.authorIds.includes(authorId)) album.authorIds.push(authorId)
    albums.set(albumId, album)
    return {
      id,
      title: tag.title,
      authorId,
      albumId,
      cover: coverUrl(video),
      src: streamUrl(video),
      durationSeconds: tag.durationSeconds,
    }
  })
  return { authors: [...authors.values()], albums: [...albums.values()], videos: videoViews }
}
