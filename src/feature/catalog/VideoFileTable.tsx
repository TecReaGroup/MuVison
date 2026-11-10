import { useEffect, useState } from 'react'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { SpinnerIcon } from '@/shared/design/icon'
import { useScrollActivity } from '@/shared/design/useScrollActivity'
import { fetchVideoFiles, formatDuration, readVideoFileSnapshot, type VideoFile } from './catalog'
import { useCatalog } from './CatalogProvider'

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB']
// ffprobe reports codec ids; show the names people know them by
const CODEC_LABELS: Record<string, string> = {
  h264: 'H.264',
  hevc: 'H.265',
  av1: 'AV1',
  vp8: 'VP8',
  vp9: 'VP9',
  aac: 'AAC',
  mp3: 'MP3',
  opus: 'Opus',
  vorbis: 'Vorbis',
  flac: 'FLAC',
  ac3: 'AC-3',
  eac3: 'E-AC-3',
}
const PLACEHOLDER = '—'

function formatBytes(bytes: number): string {
  const exponent = bytes > 0 ? Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), BYTE_UNITS.length - 1) : 0
  const value = bytes / 1024 ** exponent
  return `${exponent ? value.toFixed(value < 10 ? 2 : 1) : value} ${BYTE_UNITS[exponent]}`
}

const formatBitRate = (bitsPerSecond: number) =>
  bitsPerSecond >= 1_000_000 ? `${(bitsPerSecond / 1_000_000).toFixed(1)} Mbps` : `${Math.round(bitsPerSecond / 1000)} kbps`

const codecLabel = (codec: string | null) => (codec ? (CODEC_LABELS[codec] ?? codec.toUpperCase()) : PLACEHOLDER)

const codecPairLabel = (file: VideoFile) => `${codecLabel(file.videoCodec)} / ${codecLabel(file.audioCodec)}`

/** One file as a compact card; phones have no room for the table's columns. */
function VideoFileCard({ file }: { file: VideoFile }) {
  const facts = [
    formatDuration(file.durationSeconds),
    file.height && `${file.height}p${file.frameRate ? Math.round(file.frameRate) : ''}`,
    codecPairLabel(file),
    formatBytes(file.sizeBytes),
  ].filter(Boolean)
  return (
    <li className="py-3">
      <p className="line-clamp-2 text-sm font-medium leading-snug">{file.title}</p>
      <p className="mt-1 truncate text-xs text-muted">
        {file.creator} · {file.album}
      </p>
      <p className="mt-1.5 text-xs tabular-nums text-subtle">{facts.join(' · ')}</p>
    </li>
  )
}

type LoadState = { status: 'loading' } | { status: 'failed' } | { status: 'loaded'; files: VideoFile[] }

const newestFirst = (files: VideoFile[]) => files.toSorted((a, b) => b.addedAt - a.addedAt)

const initialLoadState = (): LoadState => {
  const snapshot = readVideoFileSnapshot()
  return snapshot ? { status: 'loaded', files: newestFirst(snapshot) } : { status: 'loading' }
}

/**
 * Every library file with tags, size and encoding details.
 * Renders the last snapshot at once, then refetches on open and whenever the catalog changes
 * (edit, delete, new download); a failed refetch keeps the list on screen.
 */
export function VideoFileTable() {
  const { t, lang } = useI18n()
  const { videos } = useCatalog()
  const [state, setState] = useState<LoadState>(initialLoadState)
  const [attempt, setAttempt] = useState(0)
  const tableScroll = useScrollActivity()

  useEffect(() => {
    const controller = new AbortController()
    setState((current) => (current.status === 'failed' ? { status: 'loading' } : current))
    fetchVideoFiles(controller.signal)
      .then((files) => setState({ status: 'loaded', files: newestFirst(files) }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        console.error(error)
        setState((current) => (current.status === 'loading' ? { status: 'failed' } : current))
      })
    return () => controller.abort()
  }, [videos, attempt])

  if (state.status === 'loading') {
    return (
      <div className="flex justify-center py-16 text-subtle">
        <SpinnerIcon className="h-6 w-6" />
      </div>
    )
  }
  if (state.status === 'failed') {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-sm text-muted">
        {t.videoFilesLoadFailed}
        <button
          onClick={() => setAttempt((n) => n + 1)}
          className="button-secondary"
        >
          {t.retry}
        </button>
      </div>
    )
  }

  const { files } = state
  const totalBytes = files.reduce((sum, file) => sum + file.sizeBytes, 0)
  const dateFormat = new Intl.DateTimeFormat(lang, { year: 'numeric', month: '2-digit', day: '2-digit' })
  const headerCell = 'h-9 whitespace-nowrap px-3 font-medium'
  const bodyCell = 'whitespace-nowrap px-3 py-2.5'

  return (
    // Desktop: fills the panel's remaining height so only the table scrolls; phones scroll the whole sheet
    <div className="flex flex-col sm:min-h-0 sm:flex-1">
      <p className="mb-2.5 text-[13px] font-medium tabular-nums text-secondary">{t.videoFilesSummary(files.length, formatBytes(totalBytes))}</p>
      <ul className="divide-y divide-border/70 sm:hidden">
        {files.map((file) => (
          <VideoFileCard key={file.id} file={file} />
        ))}
      </ul>
      {/* Content cannot paint under the scrollbar, so the frame draws a header-tall band (h-9 = 2.25rem) beside it.
          A stable gutter would leave a blank strip while nothing overflows (unlayered, hence `!`) */}
      <div
        onScroll={tableScroll.onScroll}
        className={`${tableScroll.scrollClass} hidden min-h-0 flex-1 overflow-auto rounded-xl bg-[linear-gradient(var(--color-surface-muted)_2.25rem,var(--color-surface)_0)] [scrollbar-gutter:auto]! ring-1 ring-border sm:block`}
      >
        <table className="w-full min-w-[920px] text-left text-[13px]">
          <thead className="sticky top-0 z-10 bg-surface-muted text-xs text-muted">
            <tr>
              <th className={headerCell}>{t.fieldTitle}</th>
              <th className={headerCell}>{t.fieldAuthor}</th>
              <th className={headerCell}>{t.fieldAlbum}</th>
              <th className={`${headerCell} text-right`}>{t.columnDuration}</th>
              <th className={headerCell}>{t.columnResolution}</th>
              <th className={headerCell}>{t.columnCodec}</th>
              <th className={`${headerCell} text-right`}>{t.columnBitRate}</th>
              <th className={`${headerCell} text-right`}>{t.columnSize}</th>
              <th className={headerCell}>{t.columnAdded}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70 tabular-nums">
            {files.map((file) => (
              <tr key={file.id} className="transition-colors hover:bg-surface-muted/70">
                <td className="max-w-64 px-3 py-2.5" title={file.path}>
                  <span className="line-clamp-1 font-medium text-foreground">{file.title}</span>
                </td>
                <td className={`${bodyCell} max-w-40 truncate text-secondary`}>{file.creator}</td>
                <td className={`${bodyCell} max-w-40 truncate text-secondary`}>{file.album}</td>
                <td className={`${bodyCell} text-right text-secondary`}>{formatDuration(file.durationSeconds)}</td>
                <td className={`${bodyCell} text-secondary`}>
                  {file.width && file.height ? `${file.width}×${file.height}` : PLACEHOLDER}
                  {file.frameRate && <span className="text-subtle"> · {Math.round(file.frameRate)} fps</span>}
                </td>
                <td className={`${bodyCell} text-secondary`}>{codecPairLabel(file)}</td>
                <td className={`${bodyCell} text-right text-secondary`}>
                  {file.bitRate ? formatBitRate(file.bitRate) : PLACEHOLDER}
                </td>
                <td className={`${bodyCell} text-right text-secondary`}>{formatBytes(file.sizeBytes)}</td>
                <td className={`${bodyCell} text-secondary`}>{dateFormat.format(file.addedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
