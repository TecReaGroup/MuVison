import { LogoMark } from '@/shared/design/icon'

/** "MuVision" set in the brand's type; the caller picks its size. */
export function Wordmark({ className }: { className: string }) {
  return (
    <span className={`font-semibold leading-none tracking-[-0.02em] ${className}`}>
      Mu<span className="text-subtle">Vision</span>
    </span>
  )
}

/** Logo plus wordmark; the caller supplies the wrapper that lays it out. */
export function AppBrand() {
  return (
    <>
      <LogoMark className="h-8 w-8 shrink-0" />
      <Wordmark className="text-[18px]" />
    </>
  )
}
