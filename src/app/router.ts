import { useEffect, useState } from 'react'
import type { CatalogSection } from '@/feature/catalog/CatalogPage'

export type Detail = { type: 'album' | 'author'; id: string }
/** `section` is kept while watching so the navigation still highlights where the user came from. */
export type Route = { section: CatalogSection; detail: Detail | null; videoId: string | null }

/** Stored as `history.state`, so "back" knows its destination and a reload restores the highlighted section. */
type HistoryEntry = { route: Route; previous: Route | null }

export const HOME_ROUTE: Route = { section: 'videos', detail: null, videoId: null }

// "authors" reads as "creators" to users, matching the backend's naming
const SECTION_PATH: Record<CatalogSection, string> = { videos: '/', albums: '/albums', authors: '/creators' }

/** Ids are hex hashes, so they need no URL encoding. */
export function routePath({ section, detail, videoId }: Route): string {
  if (videoId) return `/watch/${videoId}`
  if (detail) return `${SECTION_PATH[detail.type === 'album' ? 'albums' : 'authors']}/${detail.id}`
  return SECTION_PATH[section]
}

/** Unknown paths fall back to home; ids are checked against the catalog by the caller. */
function parseRoute(pathname: string): Route {
  const [head, id, ...extra] = pathname.split('/').filter(Boolean)
  if (extra.length) return HOME_ROUTE
  if (head === 'watch' && id) return { ...HOME_ROUTE, videoId: id }
  if (head === 'albums') return { section: 'albums', detail: id ? { type: 'album', id } : null, videoId: null }
  if (head === 'creators') return { section: 'authors', detail: id ? { type: 'author', id } : null, videoId: null }
  return HOME_ROUTE
}

function readInitialEntry(): HistoryEntry {
  const saved = window.history.state as HistoryEntry | null
  const entry = saved?.route ? saved : { route: parseRoute(window.location.pathname), previous: null }
  // Rewrites unknown or sloppy paths (trailing slash, leftover query) to the canonical URL
  window.history.replaceState(entry, '', routePath(entry.route))
  return entry
}

/** Keeps the current route in sync with the address bar and the browser's back/forward buttons. */
export function useRouter() {
  const [entry, setEntry] = useState(readInitialEntry)

  useEffect(() => {
    const onPopState = (e: PopStateEvent) =>
      setEntry((e.state as HistoryEntry | null) ?? { route: parseRoute(window.location.pathname), previous: null })
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const push = (route: Route) => {
    // Re-selecting the current page should not stack a duplicate history entry
    if (routePath(route) === routePath(entry.route)) return replace(route)
    const next = { route, previous: entry.route }
    window.history.pushState(next, '', routePath(route))
    setEntry(next)
  }

  const replace = (route: Route) => {
    const next = { route, previous: entry.previous }
    window.history.replaceState(next, '', routePath(route))
    setEntry(next)
  }

  /** Returns to the previous page, or to the parent page when the app was opened on a deep link. */
  const back = () => {
    if (entry.previous) return window.history.back()
    const { route } = entry
    replace(route.videoId ? { ...route, videoId: null } : { ...route, detail: null })
  }

  return { route: entry.route, previous: entry.previous, push, replace, back }
}
