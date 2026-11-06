type IconProps = { className?: string }
const ICON_STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
  'aria-hidden': true as const,
}

export const SearchIcon = ({ className }: IconProps) => (
  <svg {...ICON_STROKE} className={className}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)
export const VideoIcon = ({ className }: IconProps) => (
  <svg {...ICON_STROKE} className={className}>
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="m10 9.5 4.5 2.5-4.5 2.5z" />
  </svg>
)
export const AlbumIcon = ({ className }: IconProps) => (
  <svg {...ICON_STROKE} className={className}>
    <rect x="3" y="7" width="14" height="13" rx="2.5" />
    <path d="M7 4h11.5A2.5 2.5 0 0 1 21 6.5V16" />
  </svg>
)
export const UserIcon = ({ className }: IconProps) => (
  <svg {...ICON_STROKE} className={className}>
    <circle cx="12" cy="8.5" r="3.5" />
    <path d="M5 20c1.2-3.5 4-5 7-5s5.8 1.5 7 5" />
  </svg>
)
// Optically centered: the outline sits 1px right of center and the centroid 1px left, so the triangle's
// visual mass lands in the middle. Callers must not nudge it. The matching stroke rounds the corners.
export const PlayIcon = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
  >
    <path d="M7 4.8v14.4L19 12z" />
  </svg>
)
export const CloseIcon = ({ className }: IconProps) => (
  <svg {...ICON_STROKE} className={className}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)
export const ArrowLeftIcon = ({ className }: IconProps) => (
  <svg {...ICON_STROKE} className={className}>
    <path d="M19 12H5m6-6-6 6 6 6" />
  </svg>
)

/** MuVision mark: a monoline "M" with a warm accent dot. */
export const LogoMark = ({ className }: IconProps) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
    <rect width="32" height="32" rx="8" fill="var(--color-foreground)" />
    <polyline
      points="9 22 9 10.5 16 18 23 10.5 23 22"
      fill="none"
      stroke="var(--color-canvas)"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="16" cy="9.5" r="1.7" fill="var(--color-accent)" />
  </svg>
)

export const PauseIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="6" y="5" width="4" height="14" rx="1.2" />
    <rect x="14" y="5" width="4" height="14" rx="1.2" />
  </svg>
)
export const VolumeIcon = ({ className }: IconProps) => (
  <svg {...ICON_STROKE} className={className}>
    <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" />
    <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
  </svg>
)
export const MuteIcon = ({ className }: IconProps) => (
  <svg {...ICON_STROKE} className={className}>
    <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" />
    <path d="m16 9.5 5 5m0-5-5 5" />
  </svg>
)
export const ExpandIcon = ({ className }: IconProps) => (
  <svg {...ICON_STROKE} className={className}>
    <path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15" />
  </svg>
)
export const CollapseIcon = ({ className }: IconProps) => (
  <svg {...ICON_STROKE} className={className}>
    <path d="M9 4v3.5A1.5 1.5 0 0 1 7.5 9H4M20 9h-3.5A1.5 1.5 0 0 1 15 7.5V4M15 20v-3.5a1.5 1.5 0 0 1 1.5-1.5H20M4 15h3.5A1.5 1.5 0 0 1 9 16.5V20" />
  </svg>
)
export const ReplayIcon = ({ className }: IconProps) => (
  <svg {...ICON_STROKE} className={className}>
    <path d="M4 12a8 8 0 1 0 2.4-5.7" />
    <path d="M4 4v4.5h4.5" />
  </svg>
)
export const NextIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M5 6.2v11.6a.8.8 0 0 0 1.24.66L14.5 13a1.2 1.2 0 0 0 0-2L6.24 5.54A.8.8 0 0 0 5 6.2z" />
    <rect x="16.5" y="5" width="2.5" height="14" rx="1" />
  </svg>
)
export const ArrowRightIcon = ({ className }: IconProps) => (
  <svg {...ICON_STROKE} className={className}>
    <path d="M5 12h14m-6-6 6 6-6 6" />
  </svg>
)
export const GlobeIcon = ({ className }: IconProps) => (
  <svg {...ICON_STROKE} className={className}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.1 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.1-3.6-8.5s1.2-6.2 3.6-8.5z" />
  </svg>
)
export const ChevronDownIcon = ({ className }: IconProps) => (
  <svg {...ICON_STROKE} className={className}>
    <path d="m6 9.5 6 6 6-6" />
  </svg>
)
export const CheckIcon = ({ className }: IconProps) => (
  <svg {...ICON_STROKE} className={className}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
)
export const PlusIcon = ({ className }: IconProps) => (
  <svg {...ICON_STROKE} className={className}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)
export const LinkIcon = ({ className }: IconProps) => (
  <svg {...ICON_STROKE} className={className}>
    <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />
  </svg>
)
export const PencilIcon = ({ className }: IconProps) => (
  <svg {...ICON_STROKE} className={className}>
    <path d="M12 20h8" />
    <path d="M16.4 3.6a2.12 2.12 0 0 1 3 3L7.5 18.5 4 19.5l1-3.5z" />
  </svg>
)
export const SpinnerIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={`animate-spin ${className ?? ''}`}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
)
