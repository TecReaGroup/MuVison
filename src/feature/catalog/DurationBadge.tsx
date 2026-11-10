import { formatDuration } from './catalog'

/** Duration chip laid over a thumbnail's corner; the caller places and sizes it. */
export function DurationBadge({ seconds, className }: { seconds: number; className: string }) {
  return (
    <span className={`absolute rounded-md bg-scrim/75 px-1.5 font-medium tabular-nums text-white ${className}`}>
      {formatDuration(seconds)}
    </span>
  )
}
