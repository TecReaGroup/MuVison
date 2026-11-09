/**
 * New deploys install silently and take effect on the next launch; the open page is never reloaded mid-use.
 * The service worker itself is registered by the script vite-plugin-pwa injects into index.html.
 */
export function keepAppUpToDate(): void {
  // An installed app is resumed from the background rather than reloaded, so it would rarely look for a new deploy
  if ('serviceWorker' in navigator) {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return
      void navigator.serviceWorker.getRegistration().then((registration) => registration?.update().catch(() => undefined))
    })
  }

  // A page opened before a deploy may lazy-load a chunk the new build removed; switch to the new build instead of failing
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault()
    window.location.reload()
  })
}
