import { patchJson, requestJson } from '@/shared/http/requestJson'

const CATALOG_URL = '/api/catalog'

export type Author = { id: string; name: string; avatar: string }
export type Album = { id: string; title: string; authorIds: string[] }
export type Video = {
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
export type Catalog = { authors: Author[]; albums: Album[]; videos: Video[] }
/** One library file with its tags and encoding facts; a null field means the file has no such stream. */
export type VideoFile = {
  id: string
  title: string
  creator: string
  album: string
  path: string
  sizeBytes: number
  durationSeconds: number
  addedAt: number
  videoCodec: string | null
  audioCodec: string | null
  width: number | null
  height: number | null
  frameRate: number | null
  bitRate: number | null
}
export type VideoTagInput = { title: string; creator: string; album: string }

export const fetchCatalog = (signal?: AbortSignal) => requestJson<Catalog>(CATALOG_URL, { signal })

/** Probes every file for codecs, so it is slower than the catalog; fetch only when the list is shown. */
export const fetchVideoFiles = (signal?: AbortSignal) => requestJson<VideoFile[]>('/api/library/video', { signal })

/** Rewrites the tags inside the video file; the catalog must be refreshed to see the result. */
export const updateVideoTags = (videoId: string, tag: VideoTagInput) => patchJson<void>(`/api/video/${videoId}`, tag)

/** Deletes the video file from the library permanently. */
export const deleteVideo = (videoId: string) => requestJson<void>(`/api/video/${videoId}`, { method: 'DELETE' })

/** Formats seconds as m:ss, or h:mm:ss once past an hour. */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = String(total % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}
