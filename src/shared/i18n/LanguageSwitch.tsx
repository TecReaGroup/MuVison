import { useCallback, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { LANGUAGES } from './locale'
import { CheckIcon, ChevronDownIcon, GlobeIcon } from '@/shared/design/icon'
import { DROP_DOWN, EASE } from '@/shared/design/motion'
import { useDismiss } from '@/shared/design/useDismiss'

export function LanguageSwitch() {
  const { lang, setLang, t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = LANGUAGES.find((l) => l.key === lang)!

  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, open, close)

  return (
    <div ref={ref} className="relative w-9 md:w-[132px]">
      <motion.button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t.language}
        // Mobile: bare icon like the header's search button; desktop: bordered pill showing the current language
        className={`flex h-9 w-full items-center justify-center gap-1 rounded-xl text-[13px] font-medium text-secondary transition-all duration-300 hover:bg-fill-strong/60 md:grid md:grid-cols-[16px_1fr_16px] md:bg-surface md:px-3 md:text-strong md:ring-1 md:hover:bg-surface md:hover:text-foreground ${
          open
            ? 'bg-fill-strong/60 md:shadow-raised md:ring-focus'
            : 'md:ring-border md:hover:ring-border-strong'
        }`}
      >
        <GlobeIcon className="h-5 w-5 shrink-0 md:h-4 md:w-4 md:text-muted" />
        <span className="hidden text-center md:inline">{current.label}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: EASE }}
          className="hidden justify-center text-subtle md:flex"
        >
          <ChevronDownIcon className="h-3.5 w-3.5" />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label={t.language}
            {...DROP_DOWN}
            className="menu-panel absolute right-0 top-full z-40 mt-1.5 w-36 md:inset-x-0 md:w-auto"
          >
            {LANGUAGES.map(({ key, label }) => {
              const active = lang === key
              return (
                <li key={key}>
                  <button
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      setLang(key)
                      close()
                    }}
                    className="menu-option grid grid-cols-[16px_1fr_16px] items-center gap-1 px-2 text-center"
                  >
                    <span aria-hidden="true" />
                    <span>{label}</span>
                    <span className="flex justify-center">
                      {active && <CheckIcon className="h-3.5 w-3.5 text-foreground" />}
                    </span>
                  </button>
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
