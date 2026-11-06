import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'smol-toml'
import { LOG_LEVELS, type LogLevel } from './log'

export const BACKEND_DIR = fileURLToPath(new URL('../../', import.meta.url))
export const PROJECT_DIR = resolve(BACKEND_DIR, '..')
export const CONFIG_PATH = resolve(BACKEND_DIR, 'config.toml')
export const ENV_PATH = resolve(PROJECT_DIR, '.env')
export const LOG_DIR = resolve(PROJECT_DIR, 'log')
export const TEMP_DIR = resolve(PROJECT_DIR, 'temp')

const METUBE_QUALITIES = ['best', '2160', '1440', '1080', '720', '480', '360', '240', 'worst']

export type SubmissionConfig = {
  metubeUrl: string
  quality: string
  downloadTimeoutMs: number
  pollIntervalMs: number
}

export type AppConfig = {
  host: string
  port: number
  videoDir: string
  creatorPhotoDir: string
  submission: SubmissionConfig
  ffmpegPath: string
  logLevel: LogLevel
  password: string
  sessionMaxAgeMs: number
}

type RawConfig = {
  server: { host: string; port: number }
  library: { video_dir: string; creator_photo_dir: string }
  submission: { quality: string; download_timeout_seconds: number; poll_interval_seconds: number }
  tool: { ffmpeg_path: string }
  log: { level: string }
  auth: { session_days: number }
}

function requireOneOf<T extends string>(value: string, options: readonly T[], key: string): T {
  if (!options.includes(value as T)) {
    throw new Error(`Invalid ${key} "${value}" in config; expected one of ${options.join(', ')}`)
  }
  return value as T
}

export async function loadConfig(path = CONFIG_PATH): Promise<AppConfig> {
  if (existsSync(ENV_PATH)) process.loadEnvFile(ENV_PATH)
  const metubeUrl = process.env.metube_url?.trim()
  if (!metubeUrl) throw new Error(`metube_url is not set; add it to ${ENV_PATH}`)
  const password = process.env.password
  if (!password) throw new Error(`password is not set; add it to ${ENV_PATH}`)

  const raw = parse(await readFile(path, 'utf-8')) as RawConfig
  return {
    host: raw.server.host,
    port: raw.server.port,
    videoDir: resolve(BACKEND_DIR, raw.library.video_dir),
    creatorPhotoDir: resolve(BACKEND_DIR, raw.library.creator_photo_dir),
    submission: {
      metubeUrl: metubeUrl.replace(/\/+$/, ''),
      quality: requireOneOf(raw.submission.quality, METUBE_QUALITIES, 'submission.quality'),
      downloadTimeoutMs: raw.submission.download_timeout_seconds * 1000,
      pollIntervalMs: raw.submission.poll_interval_seconds * 1000,
    },
    ffmpegPath: raw.tool.ffmpeg_path,
    logLevel: requireOneOf(raw.log.level.toUpperCase(), LOG_LEVELS, 'log.level'),
    password,
    sessionMaxAgeMs: raw.auth.session_days * 24 * 60 * 60 * 1000,
  }
}
