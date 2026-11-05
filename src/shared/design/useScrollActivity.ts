import { useCallback, useEffect, useRef, useState } from 'react'

const IDLE_MS = 700

/**
 * Tracks whether an element is actively scrolling so `.thin-scroll.is-scrolling`
 * can emphasize the scrollbar, then let it fade back once scrolling stops.
 */
export function useScrollActivity() {
  const [scrolling, setScrolling] = useState(false)
  const timer = useRef<number>(0)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const onScroll = useCallback(() => {
    setScrolling(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setScrolling(false), IDLE_MS)
  }, [])

  return { scrolling, onScroll, scrollClass: `thin-scroll${scrolling ? ' is-scrolling' : ''}` }
}
