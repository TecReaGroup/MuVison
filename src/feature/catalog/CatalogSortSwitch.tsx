import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { ArrowRightIcon, ChevronDownIcon, ListSortAscendingIcon, ListSortDescendingIcon } from '@/shared/design/icon'
import { EASE } from '@/shared/design/motion'
import type { CatalogSection } from './CatalogPage'

export type SortField = 'date' | 'name'
export type SortDirection = 'ascending' | 'descending'
export type CatalogSort = { field: SortField; direction: SortDirection }

const storageKeyOf = (section: CatalogSection) => `muvision-catalog-sort-${section}`
const SORT_FIELDS: { field: SortField; label: 'sortDate' | 'sortName'; defaultDirection: SortDirection }[] = [
  { field: 'date', label: 'sortDate', defaultDirection: 'descending' },
  { field: 'name', label: 'sortName', defaultDirection: 'ascending' },
]
const SORT_DIRECTIONS: SortDirection[] = ['ascending', 'descending']
const DEFAULT_SORT: CatalogSort = { field: 'date', direction: 'descending' }

function savedSort(section: CatalogSection): CatalogSort {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKeyOf(section)) ?? 'null')
    const fieldIsKnown = SORT_FIELDS.some((s) => s.field === saved?.field)
    const directionIsKnown = SORT_DIRECTIONS.includes(saved?.direction)
    return fieldIsKnown && directionIsKnown ? saved : DEFAULT_SORT
  } catch {
    return DEFAULT_SORT
  }
}

/** Sort order of one catalog section, independent of the others and remembered across visits. */
export function useCatalogSort(section: CatalogSection) {
  const [sorts, setSorts] = useState<Partial<Record<CatalogSection, CatalogSort>>>({})
  const sort = sorts[section] ?? savedSort(section)
  const setSort = (next: CatalogSort) => {
    setSorts((current) => ({ ...current, [section]: next }))
    localStorage.setItem(storageKeyOf(section), JSON.stringify(next))
  }
  return [sort, setSort] as const
}

function SortOption({
  label,
  direction,
  onSelect,
}: {
  label: string
  /** Set only on the active field */
  direction?: SortDirection
  onSelect: () => void
}) {
  const active = direction !== undefined
  return (
    <li>
      <button
        role="option"
        aria-selected={active}
        onClick={onSelect}
        className={`grid w-full grid-cols-[1fr_16px] items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors duration-200 ${
          active ? 'bg-stone-100 font-medium text-foreground' : 'text-secondary hover:bg-surface-muted hover:text-foreground'
        }`}
      >
        <span>{label}</span>
        {active && (
          <motion.span
            initial={false}
            animate={{ rotate: direction === 'ascending' ? -90 : 90 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="flex justify-center"
          >
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </motion.span>
        )}
      </button>
    </li>
  )
}

export function CatalogSortSwitch({ sort, onSort }: { sort: CatalogSort; onSort: (sort: CatalogSort) => void }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const currentField = SORT_FIELDS.find((s) => s.field === sort.field)!
  const DirectionIcon = sort.direction === 'ascending' ? ListSortAscendingIcon : ListSortDescendingIcon

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
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t.sortBy}
        className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors duration-200 hover:bg-stone-200/60 hover:text-foreground ${
          open ? 'bg-stone-200/60 text-foreground' : 'text-secondary'
        }`}
      >
        <DirectionIcon className="h-4 w-4 shrink-0" />
        <span>{t[currentField.label]}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: EASE }}
          className="flex text-subtle"
        >
          <ChevronDownIcon className="h-3.5 w-3.5" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: EASE }}
            className="absolute right-0 top-full z-40 mt-1.5 w-32 rounded-xl bg-surface p-1 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.18)] ring-1 ring-border/80"
          >
            <ul role="listbox" aria-label={t.sortBy}>
              {SORT_FIELDS.map(({ field, label, defaultDirection }) => {
                const active = sort.field === field
                return (
                  <SortOption
                    key={field}
                    label={t[label]}
                    direction={active ? sort.direction : undefined}
                    // Re-clicking the active field flips it; a new field starts newest-first for dates, A→Z for names
                    onSelect={() =>
                      onSort(
                        active
                          ? { field, direction: sort.direction === 'ascending' ? 'descending' : 'ascending' }
                          : { field, direction: defaultDirection },
                      )
                    }
                  />
                )
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
