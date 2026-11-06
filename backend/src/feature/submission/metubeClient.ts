import { createWriteStream } from 'node:fs'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { ReadableStream } from 'node:stream/web'

const REQUEST_TIMEOUT_MS = 15_000
// Tag writing relies on an MP4 container, so this is not configurable
const DOWNLOAD_FORMAT = 'mp4'
// MeTube codec preference; options: auto, h264, h265, av1, vp9
const DOWNLOAD_VIDEO_CODEC = 'h265'

/** One entry of MeTube's /history; `id` is the YouTube video id, `url` is MeTube's key for /delete. */
export type MetubeDownload = {
  id: string
  url: string
  status: string
  filename?: string | null
  percent?: number | null
  msg?: string | null
  error?: string | null
}

export type MetubeLookup = { download: MetubeDownload; finished: boolean }

type MetubeHistory = Record<'done' | 'queue' | 'pending', MetubeDownload[]>

/** Speaks MeTube's HTTP API: POST /add, GET /history, POST /delete, GET /download/<file>. */
export class MetubeClient {
  readonly #baseUrl: string
  readonly #quality: string

  constructor(baseUrl: string, quality: string) {
    this.#baseUrl = baseUrl
    this.#quality = quality
  }

  async add(url: string): Promise<void> {
    const reply = await this.#post<{ status: string; msg?: string }>('/add', {
      url,
      download_type: 'video',
      codec: DOWNLOAD_VIDEO_CODEC,
      format: DOWNLOAD_FORMAT,
      quality: this.#quality,
    })
    if (reply.status !== 'ok') throw new Error(`MeTube rejected ${url}: ${reply.msg ?? reply.status}`)
  }

  async findByVideoId(videoId: string): Promise<MetubeLookup | undefined> {
    const response = await fetch(`${this.#baseUrl}/history`, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
    if (!response.ok) throw new Error(`MeTube /history failed: ${response.status}`)
    const history = (await response.json()) as MetubeHistory
    const done = history.done.find((d) => d.id === videoId)
    if (done) return { download: done, finished: true }
    const active = [...history.queue, ...history.pending].find((d) => d.id === videoId)
    return active && { download: active, finished: false }
  }

  async downloadFile(filename: string, destination: string): Promise<void> {
    const path = filename.replaceAll('\\', '/').split('/').map(encodeURIComponent).join('/')
    const response = await fetch(`${this.#baseUrl}/download/${path}`)
    if (!response.ok || !response.body) throw new Error(`MeTube file download failed: ${response.status}`)
    await pipeline(Readable.fromWeb(response.body as ReadableStream), createWriteStream(destination))
  }

  /** Removes a finished entry; its file is deleted too when MeTube runs with DELETE_FILE_ON_TRASHCAN. */
  async removeFinished(download: MetubeDownload): Promise<void> {
    await this.#post('/delete', { ids: [download.url], where: 'done', delete_files: true })
  }

  async cancel(download: MetubeDownload): Promise<void> {
    await this.#post('/delete', { ids: [download.url], where: 'queue' })
  }

  async #post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.#baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!response.ok) throw new Error(`MeTube ${path} failed: ${response.status} ${await response.text()}`)
    return (await response.json()) as T
  }
}
