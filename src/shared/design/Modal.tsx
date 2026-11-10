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
  className = 'sm:max-w-[480px] sm:max-h-none sm:overflow-visible',
  children,
}: {
  labelledBy: string
  onClose: () => void
  /** Desktop panel sizing; defaults to a compact form dialog */
  className?: string
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-scrim/40 backdrop-blur-[2px] sm:items-center sm:p-4"
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
        className={`max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-surface pb-[env(safe-area-inset-bottom)] shadow-dialog ring-1 ring-border/70 sm:rounded-2xl sm:pb-0 ${className}`}
      >
        {/* Grabber hints the bottom-sheet presentation on phones */}
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-fill-strong sm:hidden" aria-hidden="true" />
        {children}
      </motion.div>
    </motion.div>
  )
}

/** Title block of a form dialog; `id` is what the Modal's `labelledBy` points at. */
export function ModalHeader({ id, title, description }: { id: string; title: string; description: string }) {
  return (
    <header className="px-6 pt-4 sm:pt-6">
      <h2 id={id} className="text-lg font-semibold leading-tight tracking-tight">
        {title}
      </h2>
      <p className="mt-1.5 text-sm text-muted">{description}</p>
    </header>
  )
}

/** Action row of a form dialog: a secondary action on the left, the primary one on the right. */
export function ModalFooter({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-between gap-2 px-6 pb-6">{children}</div>
}
