import { useEffect, useRef, useState, type ReactNode } from 'react'

// Items added per step: several screens of cards even on a wide monitor
const PAGE_SIZE = 48
// How far ahead of the list's end the next page starts rendering, so scrolling never reaches a blank edge
const LOOKAHEAD = '150vh'

/**
 * Renders a long list a page at a time, adding the next page as the user scrolls toward its end.
 * Place `loadMoreAnchor` inside the positioned (`relative`) container that wraps the list.
 */
export function useIncrementalList<T>(items: T[]): { visibleItems: T[]; loadMoreAnchor: ReactNode } {
  const [limit, setLimit] = useState(PAGE_SIZE)
  const anchorRef = useRef<HTMLDivElement>(null)
  const hasMore = items.length > limit

  // Re-observing after every growth fires an initial callback, so a page that still leaves
  // the anchor in view loads the next one without waiting for another scroll
  useEffect(() => {
    const anchor = anchorRef.current
    if (!anchor) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setLimit((current) => current + PAGE_SIZE)
    })
    observer.observe(anchor)
    return () => observer.disconnect()
  }, [limit, hasMore])

  // A tall anchor ending at the list's bottom, rather than a rootMargin: the list scrolls inside <main>,
  // whose overflow clip would cut a root margin off
  const loadMoreAnchor = hasMore ? (
    <div
      ref={anchorRef}
      aria-hidden="true"
      style={{ height: LOOKAHEAD }}
      className="pointer-events-none absolute inset-x-0 bottom-0"
    />
  ) : null

  return { visibleItems: hasMore ? items.slice(0, limit) : items, loadMoreAnchor }
}
