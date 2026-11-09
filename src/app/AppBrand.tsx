import { LogoMark } from '@/shared/design/icon'

/** Logo plus wordmark; the caller supplies the wrapper that lays it out. */
export function AppBrand() {
  return (
    <>
      <LogoMark className="h-8 w-8 shrink-0" />
      <span className="text-[18px] font-semibold leading-none tracking-[-0.02em]">
        Mu<span className="text-subtle">Vision</span>
      </span>
    </>
  )
}
