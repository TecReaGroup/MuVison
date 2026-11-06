import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { SpinnerIcon } from '@/shared/design/icon'
import { fetchCatalog, type Album, type Author, type Catalog } from './catalog'

type CatalogIndex = Catalog & {
  authorById: (id: string) => Author
  albumById: (id: string) => Album
  /** Reloads in place, keeping the current catalog on screen; a failed reload keeps it unchanged. */
  refresh: () => Promise<void>
}

type LoadState = { status: 'loading' } | { status: 'failed' } | { status: 'ready'; catalog: Catalog }

// The backend may still be starting (or restarting under watch) when the page loads
const AUTO_RETRY_LIMIT = 5
const AUTO_RETRY_DELAY_MS = 1000

const CatalogContext = createContext<CatalogIndex | null>(null)

async function fetchCatalogWithRetry(signal: AbortSignal): Promise<Catalog> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetchCatalog(signal)
    } catch (error) {
      if (signal.aborted || attempt > AUTO_RETRY_LIMIT) throw error
      await new Promise((resolve) => window.setTimeout(resolve, AUTO_RETRY_DELAY_MS))
    }
  }
}

/** Loads the catalog once; children render only after it arrives, so they can trust every id resolves. */
export function CatalogProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setState({ status: 'loading' })
    fetchCatalogWithRetry(controller.signal)
      .then((catalog) => setState({ status: 'ready', catalog }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.error(error)
          setState({ status: 'failed' })
        }
      })
    return () => controller.abort()
  }, [attempt])

  const refresh = useCallback(async () => {
    try {
      const catalog = await fetchCatalog()
      setState({ status: 'ready', catalog })
    } catch (error) {
      console.error(error)
    }
  }, [])

  const index = useMemo<CatalogIndex | null>(() => {
    if (state.status !== 'ready') return null
    const { catalog } = state
    const authors = new Map(catalog.authors.map((a) => [a.id, a]))
    const albums = new Map(catalog.albums.map((a) => [a.id, a]))
    return { ...catalog, authorById: (id) => authors.get(id)!, albumById: (id) => albums.get(id)!, refresh }
  }, [state, refresh])

  if (index) return <CatalogContext.Provider value={index}>{children}</CatalogContext.Provider>

  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 text-secondary">
      {state.status === 'loading' ? (
        <SpinnerIcon className="h-6 w-6 text-subtle" />
      ) : (
        <>
          <p>{t.catalogLoadFailed}</p>
          <button onClick={() => setAttempt((n) => n + 1)} className="button-secondary">
            {t.retry}
          </button>
        </>
      )}
    </div>
  )
}

export function useCatalog() {
  const context = useContext(CatalogContext)
  if (!context) throw new Error('useCatalog must be used within CatalogProvider')
  return context
}
