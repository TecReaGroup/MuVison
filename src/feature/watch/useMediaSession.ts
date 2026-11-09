import { useEffect, useRef } from 'react'

type NowPlaying = { title: string; artist: string; album: string; artwork: string }

const mediaSession = 'mediaSession' in navigator ? navigator.mediaSession : null

/**
 * Shows the current video on the lock screen and system media controls.
 * Play/pause there already drive the <video> natively; this adds metadata and, when `onNext` is given, a next button.
 */
export function useMediaSession({ title, artist, album, artwork }: NowPlaying, onNext?: () => void): void {
  // Ref keeps the action handler current without re-registering it on every render's new closure
  const onNextRef = useRef(onNext)
  onNextRef.current = onNext
  const hasNext = onNext !== undefined

  useEffect(() => {
    if (!mediaSession) return
    mediaSession.metadata = new MediaMetadata({ title, artist, album, artwork: [{ src: artwork }] })
    return () => {
      mediaSession.metadata = null
    }
  }, [title, artist, album, artwork])

  useEffect(() => {
    if (!mediaSession || !hasNext) return
    mediaSession.setActionHandler('nexttrack', () => onNextRef.current?.())
    return () => mediaSession.setActionHandler('nexttrack', null)
  }, [hasNext])
}
