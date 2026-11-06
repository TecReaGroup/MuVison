import { appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

export const LOG_LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR'] as const
export type LogLevel = (typeof LOG_LEVELS)[number]

const UTC8_OFFSET_MS = 8 * 60 * 60 * 1000

let logDir: string | null = null
let minLevel: LogLevel = 'INFO'

/** Enables the daily log file; until called, logs go to the console only. */
export function configureLog(dir: string, level: LogLevel): void {
  mkdirSync(dir, { recursive: true })
  logDir = dir
  minLevel = level
}

// Shifting the epoch by +8h lets toISOString() print +08:00 wall-clock time
function utc8Timestamp(now: Date): { date: string; time: string } {
  const iso = new Date(now.getTime() + UTC8_OFFSET_MS).toISOString()
  return { date: iso.slice(0, 10), time: iso.slice(11, 19) }
}

function write(level: LogLevel, module: string, message: string): void {
  if (LOG_LEVELS.indexOf(level) < LOG_LEVELS.indexOf(minLevel)) return
  const { date, time } = utc8Timestamp(new Date())
  const line = `[${date} ${time} +08:00] [${level}] [${module}] - ${message}`
  if (level === 'ERROR') console.error(line)
  else console.log(line)
  if (logDir) appendFileSync(join(logDir, `log_${date}.log`), `${line}\n`, 'utf-8')
}

export type Logger = Record<'debug' | 'info' | 'warn' | 'error', (message: string) => void>

export function createLogger(module: string): Logger {
  return {
    debug: (message) => write('DEBUG', module, message),
    info: (message) => write('INFO', module, message),
    warn: (message) => write('WARN', module, message),
    error: (message) => write('ERROR', module, message),
  }
}
