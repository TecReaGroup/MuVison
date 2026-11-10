import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createLogger } from '../../shared/log'
import type { LibraryVideo } from './library'

const execFileAsync = promisify(execFile)
const log = createLogger('catalog')

// ffprobe is a process spawn per file; a few at a time keeps a large library from forking hundreds at once
const PROBE_CONCURRENCY = 4

/** Stream facts of one file; a field is null when the file has no such stream or ffprobe cannot tell. */
export type VideoProbe = {
  videoCodec: string | null
  audioCodec: string | null
  width: number | null
  height: number | null
  frameRate: number | null
  bitRate: number | null
}

type FfprobeStream = {
  codec_type: string
  codec_name?: string
  width?: number
  height?: number
  avg_frame_rate?: string
  disposition?: { attached_pic?: number }
}
type FfprobeOutput = { streams?: FfprobeStream[]; format?: { bit_rate?: string } }

const EMPTY_PROBE: VideoProbe = {
  videoCodec: null,
  audioCodec: null,
  width: null,
  height: null,
  frameRate: null,
  bitRate: null,
}

/** "60000/1001" → 59.94; "0/0" (unknown) → null */
function parseFrameRate(rate: string | undefined): number | null {
  const [numerator, denominator] = (rate ?? '').split('/').map(Number)
  return numerator && denominator ? Math.round((numerator / denominator) * 100) / 100 : null
}

/** Reads codec/resolution/bitrate via ffprobe, cached per file version so only new or rewritten files are probed. */
export class VideoProber {
  readonly #ffprobePath: string
  #cache = new Map<string, { version: string; probe: VideoProbe }>()

  constructor(ffprobePath: string) {
    this.#ffprobePath = ffprobePath
  }

  async probeAll(videos: LibraryVideo[]): Promise<Map<string, VideoProbe>> {
    const probes = new Map<string, VideoProbe>()
    const queue = [...videos]
    const worker = async () => {
      for (let video = queue.shift(); video; video = queue.shift()) probes.set(video.id, await this.#probe(video))
    }
    await Promise.all(Array.from({ length: PROBE_CONCURRENCY }, worker))
    // Forget files that left the library
    this.#cache = new Map([...this.#cache].filter(([id]) => probes.has(id)))
    return probes
  }

  async #probe(video: LibraryVideo): Promise<VideoProbe> {
    const cached = this.#cache.get(video.id)
    if (cached?.version === video.version) return cached.probe
    const probe = await this.#runFfprobe(video).catch((error) => {
      log.warn(`Cannot probe ${video.relativePath}: ${error instanceof Error ? error.message : error}`)
      return EMPTY_PROBE
    })
    this.#cache.set(video.id, { version: video.version, probe })
    return probe
  }

  async #runFfprobe(video: LibraryVideo): Promise<VideoProbe> {
    const entries = 'format=bit_rate:stream=codec_type,codec_name,width,height,avg_frame_rate:stream_disposition=attached_pic'
    const args = ['-v', 'error', '-print_format', 'json', '-show_entries', entries, video.absolutePath]
    const { stdout } = await execFileAsync(this.#ffprobePath, args, { windowsHide: true })
    const { streams = [], format } = JSON.parse(stdout) as FfprobeOutput
    // An embedded cover is also a "video" stream (mjpeg/png); skip it to find the real picture track
    const picture = streams.find((s) => s.codec_type === 'video' && !s.disposition?.attached_pic)
    const sound = streams.find((s) => s.codec_type === 'audio')
    const bitRate = Number(format?.bit_rate)
    return {
      videoCodec: picture?.codec_name ?? null,
      audioCodec: sound?.codec_name ?? null,
      width: picture?.width ?? null,
      height: picture?.height ?? null,
      frameRate: parseFrameRate(picture?.avg_frame_rate),
      bitRate: Number.isFinite(bitRate) && bitRate > 0 ? bitRate : null,
    }
  }
}
