import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { CheckIcon, ChevronDownIcon } from '@/shared/design/icon'
import { DROP_UP } from '@/shared/design/motion'
import { useDismiss } from '@/shared/design/useDismiss'
import { useScrollActivity } from '@/shared/design/useScrollActivity'

const LIST_MAX = 300
const LIST_MIN = 120
const VIEWPORT_GAP = 16

export type Suggestion = { id: string; label: string; meta: string; thumbnail: ReactNode }

/** Free-text input that suggests existing values; a value outside the list is flagged as new. */
export function SuggestionCombobox({
  id,
  listId,
  value,
  onChange,
  suggestions,
  placeholder,
  inputRef,
}: {
  id: string
  listId: string
  value: string
  onChange: (v: string) => void
  suggestions: Suggestion[]
  placeholder: string
  inputRef?: React.RefObject<HTMLInputElement | null>
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  // Only typed text filters; opening shows everything so a prefilled value never hides the choices
  const [filter, setFilter] = useState('')
  const [highlight, setHighlight] = useState(0)
  const [maxHeight, setMaxHeight] = useState(LIST_MAX)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const scroll = useScrollActivity()

  const q = filter.trim().toLowerCase()
  const options = q ? suggestions.filter((s) => s.label.toLowerCase().includes(q)) : suggestions
  const normalizedValue = value.trim().toLowerCase()
  const isNew = !!normalizedValue && !suggestions.some((s) => s.label.toLowerCase() === normalizedValue)

  const openList = () => {
    setFilter('')
    setOpen(true)
  }

  const close = useCallback(() => setOpen(false), [])
  useDismiss(rootRef, open, close)

  useEffect(() => setHighlight(0), [filter])

  // Open upward over the preview/fields above; cap height to the space left in the viewport
  useLayoutEffect(() => {
    if (!open || !rootRef.current) return
    const update = () => {
      // Stay inside the dialog (it scrolls as a bottom sheet on phones) and the viewport
      const root = rootRef.current!
      const dialogTop = root.closest('[role="dialog"]')?.getBoundingClientRect().top ?? 0
      const above = root.getBoundingClientRect().top - Math.max(dialogTop, 0) - VIEWPORT_GAP
      setMaxHeight(Math.max(LIST_MIN, Math.min(LIST_MAX, above)))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [open])

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${highlight}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [highlight])

  const choose = (s: Suggestion) => {
    onChange(s.label)
    close()
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) openList()
      else setHighlight((h) => Math.min(options.length - 1, h + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(0, h - 1))
    } else if (e.key === 'Enter' && open && options[highlight]) {
      e.preventDefault()
      choose(options[highlight])
    } else if (e.key === 'Escape' && open) {
      // Close the list only; keep the dialog open
      e.stopPropagation()
      close()
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setFilter(e.target.value)
            setOpen(true)
          }}
          onClick={() => !open && openList()}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          required
          className="input-control pr-20"
        />
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center gap-2">
          {isNew && (
            <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[11px] font-medium text-accent-strong">
              {t.newBadge}
            </span>
          )}
          <button
            type="button"
            tabIndex={-1}
            aria-label={open ? t.collapse : t.expand}
            // Keep focus in the input so typing continues after toggling
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => (open ? close() : openList())}
            className="button-quiet pointer-events-auto -mr-1.5 h-7 w-7 rounded-md"
          >
            <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && options.length > 0 && (
          <motion.ul
            ref={listRef}
            id={listId}
            role="listbox"
            {...DROP_UP}
            style={{ maxHeight }}
            onScroll={scroll.onScroll}
            className={`${scroll.scrollClass} menu-panel absolute inset-x-0 bottom-full z-10 mb-1.5 overflow-y-auto`}
          >
            {options.map((s, i) => {
              const active = i === highlight
              const selected = s.label === value
              return (
                <li
                  key={s.id}
                  data-index={i}
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(s)}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-100 ${active ? 'bg-fill' : ''}`}
                >
                  {s.thumbnail}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{s.label}</span>
                    <span className="block truncate text-xs text-subtle">{s.meta}</span>
                  </span>
                  {selected && <CheckIcon className="h-4 w-4 shrink-0 text-strong" />}
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
