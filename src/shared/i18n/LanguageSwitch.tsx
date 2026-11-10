import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { LANGUAGES } from './locale'
import { CheckIcon, ChevronDownIcon, GlobeIcon } from '@/shared/design/icon'
import { EASE } from '@/shared/design/motion'

export function LanguageSwitch() {
  const { lang, setLang, t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = LANGUAGES.find((l) => l.key === lang)!

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative w-9 md:w-[132px]">
      <motion.button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t.language}
        // Mobile: bare icon like the header's search button; desktop: bordered pill showing the current language
        className={`flex h-9 w-full items-center justify-center gap-1 rounded-xl text-[13px] font-medium text-secondary transition-all duration-300 hover:bg-stone-200/60 md:grid md:grid-cols-[16px_1fr_16px] md:bg-surface md:px-3 md:text-stone-700 md:ring-1 md:hover:bg-surface md:hover:text-foreground ${
          open
            ? 'bg-stone-200/60 md:shadow-[0_4px_16px_rgba(0,0,0,0.06)] md:ring-stone-400'
            : 'md:ring-border md:hover:ring-stone-300'
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
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: EASE }}
            className="absolute right-0 top-full z-40 mt-1.5 w-36 rounded-xl bg-surface p-1 md:inset-x-0 md:w-auto shadow-[0_16px_40px_-12px_rgba(0,0,0,0.18)] ring-1 ring-border/80"
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
                      setOpen(false)
                    }}
                    className={`grid w-full grid-cols-[16px_1fr_16px] items-center gap-1 rounded-lg px-2 py-2 text-center text-[13px] transition-colors duration-200 ${
                      active
                        ? 'bg-stone-100 font-medium text-foreground'
                        : 'text-secondary hover:bg-surface-muted hover:text-foreground'
                    }`}
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
