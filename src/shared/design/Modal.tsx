import { useEffect, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { EASE } from './motion'

/**
 * Centered dialog on desktop, bottom sheet on phones. Closes on Escape or a backdrop press,
 * and locks page scroll while open. Render it inside <AnimatePresence> so it can animate out.
 */
export function Modal({
  labelledBy,
  onClose,
  children,
}: {
  labelledBy: string
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/40 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.2, ease: EASE }}
        onMouseDown={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)] ring-1 ring-border/70 sm:max-h-none sm:max-w-[480px] sm:overflow-visible sm:rounded-2xl sm:pb-0"
      >
        {/* Grabber hints the bottom-sheet presentation on phones */}
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-stone-200 sm:hidden" aria-hidden="true" />
        {children}
      </motion.div>
    </motion.div>
  )
}
