import { useEffect, type RefObject } from 'react'

/** While `open`, calls `onDismiss` on a press outside `ref` or on Escape. */
export function useDismiss(ref: RefObject<HTMLElement | null>, open: boolean, onDismiss: () => void) {
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && onDismiss()
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && onDismiss()
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [ref, open, onDismiss])
}
