import { basename, extname } from 'node:path'
import { parseFile } from 'music-metadata'

// Containers browsers can play natively and music-metadata can read tags from
export const VIDEO_EXTENSIONS = new Set(['.mp4', '.m4v', '.mov', '.webm'])
export const UNKNOWN_CREATOR = 'Unknown Creator'
export const UNKNOWN_ALBUM = 'Unknown Album'

export type VideoTag = {
  title: string
  creator: string
  album: string
  durationSeconds: number
}

export type CoverImage = { content: Uint8Array; mediaType: string }

const nonBlank = (text: string | undefined) => text?.trim() || undefined

/** Reads title/creator/album; missing tags fall back to the file name or placeholders. Rejects on unreadable files. */
export async function readVideoTag(path: string): Promise<VideoTag> {
  const { common, format } = await parseFile(path, { skipCovers: true })
  return {
    title: nonBlank(common.title) ?? basename(path, extname(path)),
    creator: nonBlank(common.artist) ?? UNKNOWN_CREATOR,
    album: nonBlank(common.album) ?? UNKNOWN_ALBUM,
    durationSeconds: format.duration ?? 0,
  }
}

export async function readCover(path: string): Promise<CoverImage | undefined> {
  const picture = (await parseFile(path)).common.picture?.[0]
  return picture && { content: picture.data, mediaType: picture.format }
}
