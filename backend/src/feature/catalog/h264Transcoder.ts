import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, join } from 'node:path'
import { promisify } from 'node:util'
import { moveFile } from '../../shared/fileSystem'
import { createLogger } from '../../shared/log'
import { listVideoFiles } from './library'
import { readCover } from './metadata'

// libx264 speed/size trade-off; options: ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow
const X264_PRESET = 'medium'
// Lower is better quality and larger files; 18–23 is visually transparent for most sources
const X264_CRF = '20'
// iOS Safari (pre-A17 chips) cannot decode AV1/VP9, so every library video is H.264
const TARGET_CODEC = 'h264'
const TARGET_EXTENSION = '.mp4'

const execFileAsync = promisify(execFile)
const log = createLogger('transcode')

/** Re-encodes videos to H.264 MP4 so every browser, including iOS Safari, can play them. */
export class H264Transcoder {
  readonly #ffmpegPath: string
  readonly #ffprobePath: string
  readonly #workDir: string

  constructor(ffmpegPath: string, ffprobePath: string, workDir: string) {
    this.#ffmpegPath = ffmpegPath
    this.#ffprobePath = ffprobePath
    this.#workDir = workDir
  }

  /** Converts every non-H.264 video under `videoDir`, overwriting it; failures are logged and the original kept. */
  async convertLibrary(videoDir: string): Promise<void> {
    for (const relativePath of await listVideoFiles(videoDir)) {
      await this.ensureH264(join(videoDir, relativePath)).catch((error: unknown) =>
        log.error(`Keep ${relativePath} as is, transcoding failed: ${error instanceof Error ? error.message : error}`),
      )
    }
  }

  /**
   * Overwrites `path` with an H.264 re-encode unless it already is one.
   *
   * Non-MP4 sources are replaced by `<name>.mp4` next to them. Tags carry over; an embedded cover is re-attached.
   *
   * Returns:
   *   The path now holding the H.264 video.
   */
  async ensureH264(path: string): Promise<string> {
    const codec = await this.#probeVideoCodec(path)
    if (codec === TARGET_CODEC) return path

    const destination = join(dirname(path), basename(path, extname(path)) + TARGET_EXTENSION)
    const jobDir = join(this.#workDir, randomUUID())
    await mkdir(jobDir, { recursive: true })
    try {
      log.info(`Transcoding ${path} from ${codec} to ${TARGET_CODEC}`)
      const startedAt = Date.now()
      const encoded = join(jobDir, `encoded${TARGET_EXTENSION}`)
      await this.#encode(path, await this.#extractCover(path, jobDir), encoded)
      await moveFile(encoded, destination)
      if (destination !== path) await rm(path)
      log.info(`Transcoded ${destination} in ${((Date.now() - startedAt) / 1000).toFixed(0)}s`)
      return destination
    } finally {
      await rm(jobDir, { recursive: true, force: true })
    }
  }

  async #probeVideoCodec(path: string): Promise<string> {
    // `V` skips attached pictures, so an embedded MJPEG cover is never mistaken for the video
    const args = ['-v', 'error', '-select_streams', 'V:0', '-show_entries', 'stream=codec_name', '-of', 'csv=p=0', path]
    const { stdout } = await execFileAsync(this.#ffprobePath, args, { windowsHide: true })
    return stdout.trim()
  }

  async #extractCover(path: string, jobDir: string): Promise<string | undefined> {
    const cover = await readCover(path)
    if (!cover) return undefined
    const coverPath = join(jobDir, cover.mediaType === 'image/png' ? 'cover.png' : 'cover.jpg')
    await writeFile(coverPath, cover.content)
    return coverPath
  }

  /**
   * The cover is mapped from its own input rather than the source: ffmpeg's codec specifiers cannot tell an attached
   * picture from the main video, so `-map 0` would re-encode the cover as H.264, which MP4 rejects.
   */
  async #encode(source: string, cover: string | undefined, destination: string): Promise<void> {
    const coverArgs = cover ? ['-i', cover] : []
    const coverMapArgs = cover ? ['-map', '1:0', '-disposition:v:1', 'attached_pic'] : []
    const args = [
      ...['-y', '-v', 'error', '-i', source, ...coverArgs],
      ...['-map', '0:V:0', '-map', '0:a?', ...coverMapArgs],
      ...['-c', 'copy', '-c:v:0', 'libx264', '-preset', X264_PRESET, '-crf', X264_CRF],
      // 8-bit 4:2:0 High profile is what every hardware H.264 decoder supports
      ...['-pix_fmt:v:0', 'yuv420p', '-profile:v:0', 'high'],
      ...['-movflags', '+faststart', '-f', 'mp4', destination],
    ]
    await execFileAsync(this.#ffmpegPath, args, { windowsHide: true })
  }
}
