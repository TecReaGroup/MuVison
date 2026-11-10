import { createHash } from 'node:crypto'
import { readdir, rm, stat } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { FILE_IN_USE_CODES } from '../../shared/fileSystem'
import { HttpError } from '../../shared/httpError'
import { createLogger } from '../../shared/log'
import { readVideoTag, VIDEO_EXTENSIONS, type VideoTag } from './metadata'

const STABLE_ID_LENGTH = 12
const log = createLogger('catalog')

/** Derives an id that survives rescans and restarts as long as the inputs do. */
export const stableId = (...parts: string[]) =>
  createHash('sha1').update(parts.join('\0')).digest('hex').slice(0, STABLE_ID_LENGTH)

/** Video files under `videoDir` as sorted POSIX paths relative to it. */
export async function listVideoFiles(videoDir: string): Promise<string[]> {
  const entries = await readdir(videoDir, { recursive: true })
  return entries
    .map((entry) => entry.replaceAll('\\', '/'))
    .filter((entry) => VIDEO_EXTENSIONS.has(extname(entry).toLowerCase()))
    .sort()
}

export type LibraryVideo = {
  id: string
  /** POSIX path relative to the video directory */
  relativePath: string
  absolutePath: string
  /** Changes whenever the file is rewritten (e.g. retagged), so URLs keyed by it can be cached forever */
  version: string
  /** Epoch ms the video joined the library; retagging preserves it */
  addedAt: number
  sizeBytes: number
  tag: VideoTag
}

// ctime moves on every rewrite and cannot be set back, so it versions URLs;
// mtime is restored after a retag, so it keeps dating when the file first arrived
const fileStampOf = async (path: string) => {
  const { ctimeMs, mtimeMs, size } = await stat(path)
  return {
    version: `${Math.floor(ctimeMs).toString(36)}${size.toString(36)}`,
    addedAt: Math.floor(mtimeMs),
    sizeBytes: size,
  }
}

/** Index of tagged videos found under one directory. */
export class VideoLibrary {
  readonly videoDir: string
  #videos = new Map<string, LibraryVideo>()

  constructor(videoDir: string) {
    this.videoDir = videoDir
  }

  async scan(): Promise<LibraryVideo[]> {
    const videos = new Map<string, LibraryVideo>()
    for (const relativePath of await listVideoFiles(this.videoDir)) {
      const absolutePath = join(this.videoDir, relativePath)
      try {
        const video = {
          id: stableId(relativePath),
          relativePath,
          absolutePath,
          ...(await fileStampOf(absolutePath)),
          tag: await readVideoTag(absolutePath),
        }
        videos.set(video.id, video)
      } catch (error) {
        log.warn(`Skip unreadable video ${relativePath}: ${error instanceof Error ? error.message : error}`)
      }
    }
    // Swap the whole index so lookups never see a half-built scan
    this.#videos = videos
    log.info(`Scanned ${videos.size} videos in ${this.videoDir}`)
    return [...videos.values()]
  }

  /** Videos from the latest scan. */
  list(): LibraryVideo[] {
    return [...this.#videos.values()]
  }

  find(videoId: string): LibraryVideo | undefined {
    return this.#videos.get(videoId)
  }

  /** Deletes the video file from disk and drops it from the index. */
  async remove(video: LibraryVideo): Promise<void> {
    await rm(video.absolutePath).catch((error: NodeJS.ErrnoException) => {
      if (FILE_IN_USE_CODES.has(error.code ?? '')) {
        throw new HttpError(409, `Video file is in use, stop playing it and retry: ${video.relativePath}`)
      }
      throw error
    })
    this.#videos.delete(video.id)
    log.info(`Deleted ${video.relativePath}`)
  }
}
