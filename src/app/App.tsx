import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import type { Video } from '@/feature/catalog/catalog'
import { CatalogPage, type CatalogSection } from '@/feature/catalog/CatalogPage'
import { AuthorDetail } from '@/feature/catalog/AuthorDetail'
import { AlbumDetail } from '@/feature/catalog/AlbumDetail'
import WatchPage from '@/feature/watch/WatchPage'
import SubmitDialog from '@/feature/submission/SubmitDialog'
import { LanguageSwitch } from '@/shared/i18n/LanguageSwitch'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { AlbumIcon, CloseIcon, LogoMark, PlusIcon, SearchIcon, UserIcon, VideoIcon } from '@/shared/design/icon'
import { SPRING } from '@/shared/design/motion'
import { useScrollActivity } from '@/shared/design/useScrollActivity'

type Section = CatalogSection
type Detail = { type: 'album' | 'author'; id: string } | null
type View = { section: Section; detail: Detail; watching: Video | null }

const NAVIGATION: { key: Section; label: 'navVideos' | 'navAlbums' | 'navAuthors'; Icon: typeof VideoIcon }[] = [
  { key: 'videos', label: 'navVideos', Icon: VideoIcon },
  { key: 'albums', label: 'navAlbums', Icon: AlbumIcon },
  { key: 'authors', label: 'navAuthors', Icon: UserIcon },
]

export default function App() {
  const [view, setView] = useState<View>({ section: 'videos', detail: null, watching: null })
  // Views visited before the current one, so "back" returns to where the user came from
  const [history, setHistory] = useState<View[]>([])
  const [query, setQuery] = useState('')
  const [submitOpen, setSubmitOpen] = useState(false)
  const [mobileSearch, setMobileSearch] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const mainScroll = useScrollActivity()
  const { t } = useI18n()
  const { section, detail, watching } = view

  const push = (next: View) => {
    setHistory((h) => [...h, view])
    setView(next)
  }
  const back = () => {
    const prev = history[history.length - 1]
    if (prev) {
      setHistory((h) => h.slice(0, -1))
      setView(prev)
    } else {
      // No history (e.g. fresh load): fall back to the parent list
      setView({ section, detail: watching ? detail : null, watching: null })
    }
  }

  const closeSubmit = useCallback(() => setSubmitOpen(false), [])

  const go = (s: Section) => {
    setHistory([])
    setView({ section: s, detail: null, watching: null })
  }
  const openAuthor = (id: string) => push({ section: 'authors', detail: { type: 'author', id }, watching: null })
  const openAlbum = (id: string) => push({ section: 'albums', detail: { type: 'album', id }, watching: null })
  // Switching videos replaces the current entry instead of stacking history.
  const play = (v: Video) => (watching ? setView({ ...view, watching: v }) : push({ ...view, watching: v }))

  // Searching from a detail or watch page jumps to the matching list so results are visible
  const onSearch = (value: string) => {
    setQuery(value)
    if (value.trim() && (watching || detail))
      push({ section: watching ? 'videos' : section, detail: null, watching: null })
  }
  const closeMobileSearch = () => {
    setMobileSearch(false)
    setQuery('')
  }

  const prevView = history[history.length - 1]
  const detailBackLabel = detail
    ? prevView?.watching
      ? t.back
      : t.backTo(detail.type === 'author' ? t.navAuthors : t.navAlbums)
    : ''

  // Keep the watch view mounted when switching videos.
  const viewKey = watching ? 'watch' : detail ? `${detail.type}-${detail.id}` : section

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [viewKey])

  return (
    <MotionConfig reducedMotion="user">
      {/* App shell: only the content area scrolls, never the whole page */}
      <div className="flex h-dvh flex-col overflow-hidden">
        {/* Header */}
        <header className="relative z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border/70 bg-canvas px-4 md:h-16 md:gap-6 md:px-6">
          {mobileSearch ? (
            // Mobile: search takes over the whole header
            <div className="flex flex-1 items-center gap-2 md:hidden">
              <label className="flex h-10 flex-1 items-center gap-2.5 rounded-xl bg-surface px-3.5 ring-1 ring-border focus-within:ring-stone-400">
                <SearchIcon className="h-[18px] w-[18px] shrink-0 text-subtle" />
                <input
                  autoFocus
                  type="search"
                  enterKeyHint="search"
                  value={query}
                  onChange={(e) => onSearch(e.target.value)}
                  placeholder={t.search}
                  className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-subtle [&::-webkit-search-cancel-button]:hidden"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    aria-label={t.clear}
                    className="-mr-1.5 rounded-lg p-1.5 text-subtle"
                  >
                    <CloseIcon className="h-4 w-4" />
                  </button>
                )}
              </label>
              <button onClick={closeMobileSearch} className="h-10 shrink-0 px-1.5 text-sm font-medium text-secondary">
                {t.cancel}
              </button>
            </div>
          ) : null}

          <button
            onClick={() => go('videos')}
            className={`${mobileSearch ? 'hidden md:flex' : 'flex'} shrink-0 items-center gap-2.5 md:w-52`}
          >
            <LogoMark className="h-8 w-8 shrink-0" />
            <span className="text-[18px] font-semibold leading-none tracking-[-0.02em]">
              Mu<span className="text-subtle">Vision</span>
            </span>
          </button>

          <div className="hidden flex-1 justify-center md:flex">
            <label className="group flex h-11 w-full max-w-xl items-center gap-3 rounded-full border border-border bg-surface px-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-[border-color,box-shadow] duration-200 focus-within:border-stone-400 focus-within:shadow-[0_6px_24px_rgba(0,0,0,0.07)]">
              <SearchIcon className="h-[18px] w-[18px] text-subtle transition-colors duration-300 group-focus-within:text-stone-700" />
              <input
                value={query}
                onChange={(e) => onSearch(e.target.value)}
                placeholder={t.search}
                className="h-full flex-1 bg-transparent text-[15px] outline-none placeholder:text-subtle"
              />
              <AnimatePresence>
                {query && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => setQuery('')}
                    aria-label={t.clear}
                    className="rounded-full p-1 text-subtle transition-colors hover:bg-stone-100 hover:text-stone-700"
                  >
                    <CloseIcon className="h-4 w-4" />
                  </motion.button>
                )}
              </AnimatePresence>
            </label>
          </div>

          {!mobileSearch && (
            <>
              <div className="flex-1 md:hidden" />
              <button
                onClick={() => setMobileSearch(true)}
                aria-label={t.search}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-secondary transition-colors hover:bg-stone-200/60 md:hidden"
              >
                <SearchIcon className="h-5 w-5" />
              </button>
            </>
          )}
          <div className={`${mobileSearch ? 'hidden md:flex' : 'flex'} shrink-0 justify-end lg:w-52`}>
            <LanguageSwitch />
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          {/* Sidebar */}
          <aside className="no-scrollbar hidden w-64 shrink-0 flex-col overflow-y-auto px-4 py-6 md:flex">
            <nav className="space-y-1">
              {NAVIGATION.map(({ key, label, Icon }) => {
                const active = section === key
                return (
                  <motion.button
                    key={key}
                    onClick={() => go(key)}
                    className={`relative flex w-full items-center gap-3.5 rounded-xl px-4 py-2.5 text-[15px] transition-colors duration-300 ${
                      active ? 'text-white' : 'text-secondary hover:bg-stone-200/60 hover:text-foreground'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-pill"
                        transition={SPRING}
                        className="absolute inset-0 rounded-xl bg-foreground"
                      />
                    )}
                    <Icon className="relative h-5 w-5" />
                    <span className="relative">{t[label]}</span>
                  </motion.button>
                )
              })}
            </nav>

            <div className="mt-auto pt-8">
              <button
                onClick={() => setSubmitOpen(true)}
                aria-label={t.submitVideo}
                title={t.submitVideo}
                className="flex h-[42px] w-full items-center justify-center rounded-xl bg-stone-200/60 text-muted transition-colors duration-200 hover:bg-stone-200 hover:text-stone-800"
              >
                <PlusIcon className="h-5 w-5" />
              </button>
            </div>
          </aside>

          {/* Main */}
          <main
            ref={mainRef}
            onScroll={mainScroll.onScroll}
            className={`${mainScroll.scrollClass} min-w-0 flex-1 overflow-y-auto`}
          >
            {/* Resets text color: .thin-scroll uses `color` to paint its scrollbar thumb */}
            <div
              className={`px-4 text-foreground md:pl-2 md:pr-6 ${watching ? 'pb-6 pt-3 md:pt-4' : 'pb-10 pt-5 md:pb-16 md:pt-6'}`}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={viewKey}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12, ease: 'easeOut' }}
                >
                  {watching ? (
                    <WatchPage video={watching} onBack={back} onPlay={play} onAuthor={openAuthor} onAlbum={openAlbum} />
                  ) : detail?.type === 'author' ? (
                    <AuthorDetail
                      id={detail.id}
                      backLabel={detailBackLabel}
                      onBack={back}
                      onPlay={play}
                      onAuthor={openAuthor}
                    />
                  ) : detail?.type === 'album' ? (
                    <AlbumDetail
                      id={detail.id}
                      backLabel={detailBackLabel}
                      onBack={back}
                      onPlay={play}
                      onAuthor={openAuthor}
                    />
                  ) : (
                    <CatalogPage
                      section={section}
                      query={query}
                      onPlay={play}
                      onAuthor={openAuthor}
                      onAlbum={openAlbum}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>

        {/* Mobile tab bar: primary navigation within thumb reach */}
        <nav className="flex shrink-0 border-t border-border/70 bg-canvas pb-[env(safe-area-inset-bottom)] md:hidden">
          {NAVIGATION.map(({ key, label, Icon }) => {
            const active = section === key
            return (
              <button
                key={key}
                onClick={() => go(key)}
                aria-current={active ? 'page' : undefined}
                className={`flex h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                  active ? 'text-foreground' : 'text-subtle'
                }`}
              >
                <Icon className="h-[22px] w-[22px]" />
                {t[label]}
              </button>
            )
          })}
          <button
            onClick={() => setSubmitOpen(true)}
            className="flex h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium text-subtle"
          >
            <span className="flex h-[22px] w-8 items-center justify-center rounded-lg bg-stone-200/70 text-secondary">
              <PlusIcon className="h-4 w-4" />
            </span>
            {t.submit}
          </button>
        </nav>
      </div>
      <SubmitDialog open={submitOpen} onClose={closeSubmit} />
    </MotionConfig>
  )
}
