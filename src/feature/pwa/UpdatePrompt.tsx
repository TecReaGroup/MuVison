import { AnimatePresence, motion } from 'motion/react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { CloseIcon } from '@/shared/design/icon'
import { SPRING } from '@/shared/design/motion'

// An installed app is resumed from the background rather than reloaded, so it would never see a new deploy otherwise
function checkForUpdateWhenVisible(_swUrl: string, registration: ServiceWorkerRegistration | undefined) {
  if (!registration) return
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') registration.update().catch(() => undefined)
  })
}

/** Registers the service worker and offers a reload once a new version has been downloaded. */
export function UpdatePrompt() {
  const { t } = useI18n()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({ onRegisteredSW: checkForUpdateWhenVisible })

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={SPRING}
          // Clears the mobile tab bar (h-14) and the home indicator
          className="fixed inset-x-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-sm items-center gap-3 rounded-2xl bg-foreground py-2 pl-4 pr-2 text-sm text-canvas shadow-[0_16px_40px_-12px_rgba(0,0,0,0.45)] md:bottom-6"
        >
          <span className="min-w-0 flex-1 truncate">{t.updateReady}</span>
          <button
            onClick={() => updateServiceWorker(true)}
            className="shrink-0 rounded-xl bg-canvas/15 px-3.5 py-1.5 font-medium transition-colors hover:bg-canvas/25"
          >
            {t.updateNow}
          </button>
          <button
            onClick={() => setNeedRefresh(false)}
            aria-label={t.cancel}
            className="shrink-0 rounded-xl p-1.5 text-canvas/60 transition-colors hover:text-canvas"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
