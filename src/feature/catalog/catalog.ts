import { requestJson } from '@/shared/http/requestJson'

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
}
export type Catalog = { authors: Author[]; albums: Album[]; videos: Video[] }

export const fetchCatalog = (signal?: AbortSignal) => requestJson<Catalog>(CATALOG_URL, { signal })

/** Formats seconds as m:ss, or h:mm:ss once past an hour. */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = String(total % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}
