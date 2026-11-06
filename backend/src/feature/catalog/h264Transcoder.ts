import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdir, rm, stat, writeFile } from 'node:fs/promises'
import { constants, setPriority } from 'node:os'
import { basename, dirname, extname, join } from 'node:path'
import { promisify } from 'node:util'
import { moveFile } from '../../shared/fileSystem'
import { createLogger } from '../../shared/log'
import { listVideoFiles } from './library'
import { readCover } from './metadata'

// libx264 speed/size trade-off; options: ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow
// NOTE: the server has 2 ARM cores; `medium` encodes 1080p at ~0.6x realtime there, `veryfast` at roughly 2.5x that
const X264_PRESET = 'veryfast'
// Lower is better quality and larger files; the bitrate cap below decides the size of busy scenes
const X264_CRF = '23'
// Peak video bitrate in kbit/s; 1500 keeps 10 min of 1080p near 110 MB and looks unchanged on a phone
const X264_MAX_KBPS = 1500
// H.264 above cap × this factor is re-encoded; the slack keeps files already near the cap from being re-encoded
const OVERSIZED_BITRATE_FACTOR = 1.3
// iOS Safari (pre-A17 chips) cannot decode AV1/VP9, so every library video is H.264
const TARGET_CODEC = 'h264'
const TARGET_EXTENSION = '.mp4'

const execFileAsync = promisify(execFile)
const log = createLogger('transcode')

type VideoProbe = { codec: string; kbps: number }

/**
 * Re-encodes videos to bitrate-capped H.264 MP4 so every browser, including iOS Safari, can play them at a sane size.
 *
 * Encodes run one at a time at the lowest CPU priority: the server has 2 cores and must keep serving pages meanwhile.
 */
export class H264Transcoder {
  readonly #ffmpegPath: string
  readonly #ffprobePath: string
  readonly #workDir: string
  readonly #scheduled = new Set<string>()
  #lastEncode: Promise<unknown> = Promise.resolve()

  constructor(ffmpegPath: string, ffprobePath: string, workDir: string) {
    this.#ffmpegPath = ffmpegPath
    this.#ffprobePath = ffprobePath
    this.#workDir = workDir
  }

  /**
   * Re-encodes `path` now unless it already is H.264; resolves once it is playable everywhere.
   *
   * Returns:
   *   The path now holding the video; non-MP4 sources are replaced by `<name>.mp4` next to them.
   */
  async ensurePlayable(path: string): Promise<string> {
    const probe = await this.#probeVideo(path)
    if (probe.codec === TARGET_CODEC) return path
    return this.#runExclusively(() => this.#reencode(path, probe))
  }

  /** Shrinks an oversized or non-H.264 library video in the background; the file stays playable meanwhile. */
  scheduleCompaction(path: string): void {
    if (this.#scheduled.has(path)) return
    this.#scheduled.add(path)
    void this.#runExclusively(async () => {
      try {
        // Probed when its turn comes, since the file may have changed while queued
        const probe = await this.#probeVideo(path)
        if (!isCompact(probe)) await this.#reencode(path, probe)
      } finally {
        this.#scheduled.delete(path)
      }
    }).catch((error: unknown) =>
      log.error(`Keep ${path} as is, transcoding failed: ${error instanceof Error ? error.message : error}`),
    )
  }

  async scheduleLibraryCompaction(videoDir: string): Promise<void> {
    for (const relativePath of await listVideoFiles(videoDir)) this.scheduleCompaction(join(videoDir, relativePath))
  }

  #runExclusively<T>(task: () => Promise<T>): Promise<T> {
    const run = this.#lastEncode.then(task)
    this.#lastEncode = run.catch(() => undefined)
    return run
  }

  /**
   * Tags carry over; an embedded cover is re-attached.
   *
   * The source is replaced only if untouched during the encode: a retag or delete meanwhile would otherwise be undone.
   */
  async #reencode(path: string, probe: VideoProbe): Promise<string> {
    const destination = join(dirname(path), basename(path, extname(path)) + TARGET_EXTENSION)
    const jobDir = join(this.#workDir, randomUUID())
    await mkdir(jobDir, { recursive: true })
    try {
      log.info(`Transcoding ${path} from ${probe.codec} ${probe.kbps} kbps to ${TARGET_CODEC} ≤ ${X264_MAX_KBPS} kbps`)
      const startedAt = Date.now()
      const sourceModifiedAt = (await stat(path)).mtimeMs
      const encoded = join(jobDir, `encoded${TARGET_EXTENSION}`)
      await this.#encode(path, await this.#extractCover(path, jobDir), encoded)

      const current = await stat(path).catch(() => undefined)
      if (current?.mtimeMs !== sourceModifiedAt) {
        log.warn(`Discarded transcode of ${path}: the file was changed or removed meanwhile`)
        return path
      }
      await moveFile(encoded, destination)
      if (destination !== path) await rm(path)
      log.info(`Transcoded ${destination} in ${((Date.now() - startedAt) / 1000).toFixed(0)}s`)
      return destination
    } finally {
      await rm(jobDir, { recursive: true, force: true })
    }
  }

  /** WebM/MKV streams carry no bit_rate, so `kbps` is 0 there; they are never H.264 here and get re-encoded anyway. */
  async #probeVideo(path: string): Promise<VideoProbe> {
    // `V` skips attached pictures, so an embedded MJPEG cover is never mistaken for the video
    const args = ['-v', 'error', '-select_streams', 'V:0', '-show_entries', 'stream=codec_name,bit_rate', '-of', 'csv=p=0', path]
    const { stdout } = await execFileAsync(this.#ffprobePath, args, { windowsHide: true })
    const [codec, bitsPerSecond] = stdout.trim().split(',')
    return { codec, kbps: Math.round((Number(bitsPerSecond) || 0) / 1000) }
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
      ...['-maxrate:v:0', `${X264_MAX_KBPS}k`, '-bufsize:v:0', `${X264_MAX_KBPS * 2}k`],
      // 8-bit 4:2:0 High profile is what every hardware H.264 decoder supports
      ...['-pix_fmt:v:0', 'yuv420p', '-profile:v:0', 'high'],
      ...['-movflags', '+faststart', '-f', 'mp4', destination],
    ]
    const encoding = execFileAsync(this.#ffmpegPath, args, { windowsHide: true })
    // Undefined when the spawn failed; the awaited promise below reports that error
    if (encoding.child.pid) setPriority(encoding.child.pid, constants.priority.PRIORITY_LOW)
    await encoding
  }
}

const isCompact = ({ codec, kbps }: VideoProbe) =>
  codec === TARGET_CODEC && kbps <= X264_MAX_KBPS * OVERSIZED_BITRATE_FACTOR
