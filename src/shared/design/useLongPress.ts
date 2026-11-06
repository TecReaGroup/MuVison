import { useEffect, useRef } from 'react'

const LONG_PRESS_MS = 500
// Beyond this the finger is scrolling, not holding
const MOVE_TOLERANCE_PX = 10

/**
 * Fires `onLongPress` when a touch is held still; mouse input is ignored.
 *
 * Spread the returned handlers on the target. After a long press, the click that follows the release
 * and the native context menu (Android image menu) are swallowed, so the press does not also play the video.
 */
export function useLongPress(onLongPress: () => void) {
  const timer = useRef<number>(0)
  const origin = useRef({ x: 0, y: 0 })
  const fired = useRef(false)
  const touching = useRef(false)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const cancel = () => window.clearTimeout(timer.current)

  return {
    onPointerDown: (e: React.PointerEvent) => {
      fired.current = false
      touching.current = e.pointerType !== 'mouse'
      if (!touching.current) return
      origin.current = { x: e.clientX, y: e.clientY }
      timer.current = window.setTimeout(() => {
        fired.current = true
        navigator.vibrate?.(10)
        onLongPress()
      }, LONG_PRESS_MS)
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (Math.hypot(e.clientX - origin.current.x, e.clientY - origin.current.y) > MOVE_TOLERANCE_PX) cancel()
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    onClickCapture: (e: React.MouseEvent) => {
      if (!fired.current) return
      e.preventDefault()
      e.stopPropagation()
    },
    onContextMenu: (e: React.MouseEvent) => {
      if (touching.current) e.preventDefault()
    },
  }
}
