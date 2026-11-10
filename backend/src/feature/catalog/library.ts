import { createHash } from 'node:crypto'
import { readdir, rm, stat } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { mapConcurrently } from '../../shared/concurrency'
import { FILE_IN_USE_CODES } from '../../shared/fileSystem'
import { HttpError } from '../../shared/httpError'
import { createLogger } from '../../shared/log'
import { readVideoTag, VIDEO_EXTENSIONS, type VideoTag } from './metadata'

const STABLE_ID_LENGTH = 12
// Files opened at once while scanning; a first scan of a large library would otherwise hit the open-file limit
const SCAN_CONCURRENCY = 8
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

  /** Re-reads tags only for new or rewritten files; unchanged files cost one stat. */
  async scan(): Promise<LibraryVideo[]> {
    const previous = this.#videos
    let tagReadCount = 0
    const scanned = await mapConcurrently(await listVideoFiles(this.videoDir), SCAN_CONCURRENCY, async (relativePath) => {
      const id = stableId(relativePath)
      const absolutePath = join(this.videoDir, relativePath)
      try {
        const stamp = await fileStampOf(absolutePath)
        const known = previous.get(id)
        if (known?.version === stamp.version) return { ...known, ...stamp }
        tagReadCount++
        return { id, relativePath, absolutePath, ...stamp, tag: await readVideoTag(absolutePath) }
      } catch (error) {
        log.warn(`Skip unreadable video ${relativePath}: ${error instanceof Error ? error.message : error}`)
        return undefined
      }
    })
    const videos = new Map(scanned.filter((video) => video !== undefined).map((video) => [video.id, video]))
    // Swap the whole index so lookups never see a half-built scan
    this.#videos = videos
    const message = `Scanned ${videos.size} videos in ${this.videoDir}, read tags of ${tagReadCount}`
    if (tagReadCount) log.info(message)
    else log.debug(message)
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
