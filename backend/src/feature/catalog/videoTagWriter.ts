import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { promisify } from 'node:util'
import { FILE_IN_USE_CODES, moveFile } from '../../shared/fileSystem'
import { HttpError } from '../../shared/httpError'
import type { LibraryVideo } from './library'
import { readCover } from './metadata'

const execFileAsync = promisify(execFile)

// The writer always produces the MP4 container, so only files already in it can be rewritten in place
const RETAGGABLE_EXTENSIONS = new Set(['.mp4', '.m4v', '.mov'])

export type VideoTagInput = { title: string; creator: string; album: string }

export type TaggedVideoSpec = { source: string; cover?: string; destination: string; tag: VideoTagInput }

/** Writes title/creator/album tags and an embedded cover into MP4 files via ffmpeg. */
export class VideoTagWriter {
  readonly #ffmpegPath: string
  readonly #workDir: string

  constructor(ffmpegPath: string, workDir: string) {
    this.#ffmpegPath = ffmpegPath
    this.#workDir = workDir
  }

  /**
   * Remuxes `source` into an MP4 at `destination` with the given tags and optional cover.
   *
   * Streams are copied, not re-encoded. `0:V` (capital) skips any cover the source already embeds,
   * so the result never carries two attached pictures.
   */
  async write({ source, cover, destination, tag }: TaggedVideoSpec): Promise<void> {
    const coverArgs = cover ? ['-i', cover] : []
    const coverMapArgs = cover ? ['-map', '1:0', '-disposition:v:1', 'attached_pic'] : []
    const args = [
      ...['-y', '-v', 'error', '-i', source, ...coverArgs],
      ...['-map', '0:V:0', '-map', '0:a?', ...coverMapArgs],
      ...['-c', 'copy'],
      // mp4 muxer maps these keys to the ©nam / ©ART / ©alb atoms the catalog reads
      ...['-metadata', `title=${tag.title}`, '-metadata', `artist=${tag.creator}`, '-metadata', `album=${tag.album}`],
      // Moov atom up front so browsers can start playback before the whole file arrives
      ...['-movflags', '+faststart', '-f', 'mp4', destination],
    ]
    await execFileAsync(this.#ffmpegPath, args, { windowsHide: true })
  }

  /** Rewrites a library video's tags in place, keeping its cover and file name (so its id stays stable). */
  async retag(video: LibraryVideo, tag: VideoTagInput): Promise<void> {
    if (!RETAGGABLE_EXTENSIONS.has(extname(video.absolutePath).toLowerCase())) {
      throw new HttpError(415, `Editing is only supported for MP4 videos: ${video.relativePath}`)
    }
    const jobDir = join(this.#workDir, randomUUID())
    await mkdir(jobDir, { recursive: true })
    try {
      const existingCover = await readCover(video.absolutePath)
      let cover: string | undefined
      if (existingCover) {
        cover = join(jobDir, existingCover.mediaType === 'image/png' ? 'cover.png' : 'cover.jpg')
        await writeFile(cover, existingCover.content)
      }
      const tagged = join(jobDir, 'tagged.mp4')
      await this.write({ source: video.absolutePath, cover, destination: tagged, tag })
      await moveFile(tagged, video.absolutePath).catch((error: NodeJS.ErrnoException) => {
        if (FILE_IN_USE_CODES.has(error.code ?? '')) {
          throw new HttpError(409, `Video file is in use, stop playing it and retry: ${video.relativePath}`)
        }
        throw error
      })
    } finally {
      await rm(jobDir, { recursive: true, force: true })
    }
  }
}
