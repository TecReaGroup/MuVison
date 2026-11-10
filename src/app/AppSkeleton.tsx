import { VIDEO_GRID_CLASS } from '@/feature/catalog/VideoGrid'
import { AppBrand } from '@/shared/design/Brand'

const PLACEHOLDER_CARD_COUNT = 8
const NAV_ITEM_COUNT = 3
// Three sections plus the submit button
const TAB_ITEM_COUNT = 4

const repeat = (count: number) => Array.from({ length: count }, (_, i) => i)

const Bone = ({ className }: { className: string }) => (
  <div className={`bg-fill-strong/80 motion-safe:animate-pulse ${className}`} />
)

/**
 * Stand-in for the App shell while the session and catalog load.
 * Mirrors App's layout classes so the real UI replaces it without anything shifting.
 */
export function AppSkeleton() {
  return (
    <div
      aria-busy="true"
      className="flex h-dvh flex-col overflow-hidden pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
    >
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/70 bg-canvas px-4 md:h-16 md:gap-6 md:px-6">
        <div className="flex shrink-0 items-center gap-2.5 md:w-52">
          <AppBrand />
        </div>
        <div className="hidden flex-1 justify-center md:flex">
          <Bone className="h-11 w-full max-w-xl rounded-full" />
        </div>
        <div className="flex-1 md:hidden" />
        <div className="flex h-9 w-9 items-center justify-center md:hidden">
          <Bone className="h-5 w-5 rounded-full" />
        </div>
        <div className="flex shrink-0 justify-end lg:w-52">
          <div className="flex h-9 w-9 items-center justify-center md:hidden">
            <Bone className="h-5 w-5 rounded-full" />
          </div>
          <Bone className="hidden h-9 w-[132px] rounded-xl md:block" />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 flex-col space-y-1 px-4 py-6 md:flex">
          {repeat(NAV_ITEM_COUNT).map((i) => (
            <div key={i} className="flex items-center gap-3.5 px-4 py-2.5">
              <Bone className="h-5 w-5 rounded-md" />
              <Bone className="h-4 w-14 rounded-md" />
            </div>
          ))}
        </aside>

        <main className="min-w-0 flex-1 overflow-hidden">
          <div className="px-4 pb-10 pt-5 md:pb-16 md:pl-2 md:pr-6 md:pt-6">
            <div className="mb-5 flex items-end gap-3 md:mb-8">
              <Bone className="h-7 w-16 rounded-lg md:h-8 md:w-20" />
              <Bone className="mb-1 h-4 w-14 rounded-md" />
            </div>
            <div className={VIDEO_GRID_CLASS}>
              {repeat(PLACEHOLDER_CARD_COUNT).map((i) => (
                <div key={i}>
                  <Bone className="aspect-video w-full rounded-xl" />
                  <Bone className="mt-2.5 h-4 w-4/5 rounded-md sm:mt-3.5" />
                  <Bone className="mt-2 h-3 w-1/3 rounded-md sm:h-3.5" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      <nav className="flex shrink-0 border-t border-border/70 bg-canvas pb-[env(safe-area-inset-bottom)] md:hidden">
        {repeat(TAB_ITEM_COUNT).map((i) => (
          <div key={i} className="flex h-14 flex-1 flex-col items-center justify-center gap-1.5">
            <Bone className="h-[22px] w-[22px] rounded-md" />
            <Bone className="h-2.5 w-7 rounded-sm" />
          </div>
        ))}
      </nav>
    </div>
  )
}
