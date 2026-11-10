import type { Transition } from 'motion/react'

export const EASE = [0.22, 1, 0.36, 1] as const
export const SPRING: Transition = { type: 'spring', stiffness: 380, damping: 32 }

const POPOVER_TRANSITION = { duration: 0.15, ease: EASE }

/** Popover opening below its trigger. */
export const DROP_DOWN = {
  initial: { opacity: 0, y: -4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: POPOVER_TRANSITION,
}

/** Popover opening above its trigger. */
export const DROP_UP = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 4 },
  transition: POPOVER_TRANSITION,
}

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
