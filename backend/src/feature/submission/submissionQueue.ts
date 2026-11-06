import { randomUUID } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import type { SubmissionConfig } from '../../shared/config'
import { toFileStem } from '../../shared/fileName'
import { moveFile } from '../../shared/fileSystem'
import { HttpError } from '../../shared/httpError'
import { createLogger } from '../../shared/log'
import type { CreatorPhotoStore } from '../catalog/creatorPhoto'
import type { H264Transcoder } from '../catalog/h264Transcoder'
import type { VideoTagInput, VideoTagWriter } from '../catalog/videoTagWriter'
import type { MetubeClient, MetubeDownload } from './metubeClient'
import { canonicalWatchUrl, fetchChannelAvatarUrl, thumbnailUrls } from './youtube'

const IMAGE_TIMEOUT_MS = 15_000

const log = createLogger('submission')

export type SubmissionRequest = VideoTagInput & { videoId: string }
export type SubmissionStatus = 'downloading' | 'saving' | 'saved' | 'failed'
export type SubmissionJob = {
  id: string
  videoId: string
  title: string
  status: SubmissionStatus
  /** MeTube's download progress, 0–100, while downloading */
  percent: number | null
  error: string | null
}

const isActive = (job: SubmissionJob) => job.status === 'downloading' || job.status === 'saving'

/**
 * Runs each submission to completion in the background:
 * MeTube add → poll until finished → fetch file → delete from MeTube → transcode to H.264 if needed → write tags + cover → move into the library
 * → fetch the creator's channel avatar when no creator photo exists yet.
 *
 * Jobs live in memory only; a restart forgets them and leaves any in-flight MeTube entry behind.
 */
export class SubmissionQueue {
  readonly #jobs = new Map<string, SubmissionJob>()
  readonly #metube: MetubeClient
  readonly #config: SubmissionConfig
  readonly #videoDir: string
  readonly #photos: CreatorPhotoStore
  readonly #tagWriter: VideoTagWriter
  readonly #transcoder: H264Transcoder
  readonly #workDir: string

  constructor(
    metube: MetubeClient,
    config: SubmissionConfig,
    videoDir: string,
    photos: CreatorPhotoStore,
    tagWriter: VideoTagWriter,
    transcoder: H264Transcoder,
    workDir: string,
  ) {
    this.#metube = metube
    this.#config = config
    this.#videoDir = videoDir
    this.#photos = photos
    this.#tagWriter = tagWriter
    this.#transcoder = transcoder
    this.#workDir = workDir
  }

  submit(request: SubmissionRequest): SubmissionJob {
    // MeTube keys downloads by video, so two jobs for one video would race over the same entry
    const running = [...this.#jobs.values()].find((job) => job.videoId === request.videoId && isActive(job))
    if (running) throw new HttpError(409, `Video ${request.videoId} is already being downloaded`)

    const job: SubmissionJob = {
      id: randomUUID(),
      videoId: request.videoId,
      title: request.title,
      status: 'downloading',
      percent: null,
      error: null,
    }
    this.#jobs.set(job.id, job)
    log.info(`Job ${job.id} accepted: ${request.videoId} "${request.title}"`)
    void this.#run(job, request)
    return job
  }

  find(jobId: string): SubmissionJob | undefined {
    return this.#jobs.get(jobId)
  }

  async #run(job: SubmissionJob, request: SubmissionRequest): Promise<void> {
    const jobDir = join(this.#workDir, job.id)
    try {
      await mkdir(jobDir, { recursive: true })
      const downloaded = join(jobDir, 'source.mp4')
      await this.#downloadThroughMetube(job, downloaded)

      job.status = 'saving'
      job.percent = null
      // MeTube falls back to another codec when YouTube offers no H.264 stream at the requested quality
      await this.#transcoder.ensureH264(downloaded)
      const cover = await this.#fetchCover(request.videoId, join(jobDir, 'cover.jpg'))
      const tagged = join(jobDir, 'tagged.mp4')
      await this.#tagWriter.write({ source: downloaded, cover, destination: tagged, tag: request })
      const saved = this.#libraryPathFor(request)
      await moveFile(tagged, saved)
      await this.#ensureCreatorPhoto(request)

      job.status = 'saved'
      log.info(`Job ${job.id} saved to ${saved}`)
    } catch (error) {
      job.status = 'failed'
      job.error = error instanceof Error ? error.message : String(error)
      log.error(`Job ${job.id} failed: ${error instanceof Error ? (error.stack ?? error.message) : error}`)
    } finally {
      await rm(jobDir, { recursive: true, force: true })
    }
  }

  async #downloadThroughMetube(job: SubmissionJob, destination: string): Promise<void> {
    // A leftover entry from an earlier run would be mistaken for this download's result
    const stale = await this.#metube.findByVideoId(job.videoId)
    if (stale?.finished) await this.#metube.removeFinished(stale.download)

    await this.#metube.add(canonicalWatchUrl(job.videoId))
    const download = await this.#waitUntilFinished(job)
    try {
      if (download.status !== 'finished' || !download.filename) {
        throw new Error(`MeTube download ${download.status}: ${download.error ?? download.msg ?? 'no file produced'}`)
      }
      await this.#metube.downloadFile(download.filename, destination)
      log.info(`Job ${job.id} fetched ${download.filename} from MeTube`)
    } finally {
      await this.#metube.removeFinished(download)
    }
  }

  async #waitUntilFinished(job: SubmissionJob): Promise<MetubeDownload> {
    const deadline = Date.now() + this.#config.downloadTimeoutMs
    for (;;) {
      const lookup = await this.#metube.findByVideoId(job.videoId)
      if (lookup?.finished) return lookup.download
      job.percent = lookup?.download.percent ?? null
      if (Date.now() >= deadline) {
        if (lookup) await this.#metube.cancel(lookup.download)
        throw new Error(`MeTube did not finish within ${this.#config.downloadTimeoutMs / 1000}s`)
      }
      await sleep(this.#config.pollIntervalMs)
    }
  }

  /** Returns the saved cover path, or undefined when YouTube has no thumbnail; a missing cover is not fatal. */
  async #fetchCover(videoId: string, destination: string): Promise<string | undefined> {
    for (const url of thumbnailUrls(videoId)) {
      const response = await fetch(url, { signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS) }).catch(() => undefined)
      if (response?.ok) {
        await writeFile(destination, Buffer.from(await response.arrayBuffer()))
        return destination
      }
    }
    log.warn(`No thumbnail found for ${videoId}; saving without cover`)
    return undefined
  }

  /** Best effort: the video is already saved, and the catalog falls back to a cover without a photo. */
  async #ensureCreatorPhoto({ creator, videoId }: SubmissionRequest): Promise<void> {
    if (this.#photos.findFileName(creator)) return
    try {
      const avatarUrl = await fetchChannelAvatarUrl(videoId)
      const response = await fetch(avatarUrl, { signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS) })
      if (!response.ok) throw new Error(`avatar download failed: ${response.status}`)
      const mediaType = response.headers.get('content-type') ?? ''
      const path = await this.#photos.save(creator, new Uint8Array(await response.arrayBuffer()), mediaType)
      log.info(`Saved creator photo for "${creator}" to ${path}`)
    } catch (error) {
      log.warn(`No creator photo for "${creator}": ${error instanceof Error ? error.message : error}`)
    }
  }

  #libraryPathFor({ title, videoId }: SubmissionRequest): string {
    const baseName = toFileStem(title) || videoId
    const preferred = join(this.#videoDir, `${baseName}.mp4`)
    return existsSync(preferred) ? join(this.#videoDir, `${baseName} [${videoId}].mp4`) : preferred
  }
}
