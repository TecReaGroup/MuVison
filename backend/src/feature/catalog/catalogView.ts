import type { CreatorPhotoStore } from './creatorPhoto'
import { stableId, type LibraryVideo } from './library'
import type { VideoProbe } from './videoProbe'

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
  /** Epoch ms */
  addedAt: number
}
export type CatalogView = { authors: AuthorView[]; albums: AlbumView[]; videos: VideoView[] }
/** One library file with its tags and encoding facts, for the settings overview. */
export type VideoFileView = VideoProbe & {
  id: string
  title: string
  creator: string
  album: string
  /** POSIX path relative to the video directory */
  path: string
  sizeBytes: number
  durationSeconds: number
  addedAt: number
}

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
    const { id, tag, addedAt } = video
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
      addedAt,
    }
  })
  return { authors: [...authors.values()], albums: [...albums.values()], videos: videoViews }
}

export function buildVideoFileList(videos: LibraryVideo[], probes: Map<string, VideoProbe>): VideoFileView[] {
  return videos.map(({ id, tag, relativePath, sizeBytes, addedAt }) => ({
    id,
    title: tag.title,
    creator: tag.creator,
    album: tag.album,
    path: relativePath,
    sizeBytes,
    durationSeconds: tag.durationSeconds,
    addedAt,
    ...probes.get(id)!,
  }))
}
