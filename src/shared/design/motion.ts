import type { Transition } from 'motion/react'

export const EASE = [0.22, 1, 0.36, 1] as const
export const SPRING: Transition = { type: 'spring', stiffness: 380, damping: 32 }

/**
 * Grid items: no entrance choreography on navigation; only a short fade when
 * items enter/leave during search, plus a calm layout reflow.
 */
export const GRID_ITEM = {
  layout: 'position' as const,
  initial: false as const,
  exit: { opacity: 0, transition: { duration: 0.12 } },
  transition: { layout: { duration: 0.25, ease: EASE } },
}
