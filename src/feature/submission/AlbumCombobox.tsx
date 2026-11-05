import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ALBUMS, authorById, VIDEOS } from '@/feature/catalog/catalog'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { CheckIcon, ChevronDownIcon } from '@/shared/design/icon'
import { EASE } from '@/shared/design/motion'
import { useScrollActivity } from '@/shared/design/useScrollActivity'

const LIST_MAX = 300
const LIST_MIN = 120
const VIEWPORT_GAP = 16

type AlbumOption = { id: string; title: string; meta: string; cover?: string }

/** Searchable album picker that also accepts a new album name. */
export function AlbumCombobox({
  id,
  listId,
  value,
  onChange,
  inputRef,
}: {
  id: string
  listId: string
  value: string
  onChange: (v: string) => void
  inputRef: React.RefObject<HTMLInputElement | null>
}) {
  const { t, tr } = useI18n()
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [maxHeight, setMaxHeight] = useState(LIST_MAX)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const scroll = useScrollActivity()

  const all = ALBUMS.map((a) => {
    const items = VIDEOS.filter((v) => v.albumId === a.id)
    return {
      id: a.id,
      title: tr(a.title),
      meta: `${tr(authorById(a.authorId).name)} · ${t.videoCount(items.length)}`,
      cover: items[0]?.cover,
    }
  })
  const q = value.trim().toLowerCase()
  const matches = q ? all.filter((a) => a.title.toLowerCase().includes(q)) : all
  const exact = all.find((a) => a.title.toLowerCase() === q)
  // New names are flagged by the "New" badge in the input, so the list only shows existing matches
  const options: AlbumOption[] = matches
  const isNew = !!q && !exact

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !rootRef.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  useEffect(() => setHighlight(0), [value])

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

  const choose = (o: AlbumOption) => {
    onChange(o.title)
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) setOpen(true)
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
      setOpen(false)
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
            setOpen(true)
          }}
          onClick={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={t.albumPlaceholder}
          required
          className="input-control pr-20"
        />
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center gap-2">
          {isNew && (
            <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-600">
              {t.newBadge}
            </span>
          )}
          <ChevronDownIcon
            className={`h-4 w-4 text-subtle transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      <AnimatePresence>
        {open && options.length > 0 && (
          <motion.ul
            ref={listRef}
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15, ease: EASE }}
            style={{ maxHeight }}
            onScroll={scroll.onScroll}
            className={`${scroll.scrollClass} absolute inset-x-0 z-10 bottom-full mb-1.5 overflow-y-auto rounded-xl bg-surface p-1 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.2)] ring-1 ring-border/80`}
          >
            {options.map((o, i) => {
              const active = i === highlight
              const selected = o.title === value
              return (
                <li
                  key={o.id}
                  data-index={i}
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(o)}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-100 ${active ? 'bg-stone-100' : ''}`}
                >
                  <span className="aspect-video w-12 shrink-0 overflow-hidden rounded-md bg-stone-200 ring-1 ring-black/5">
                    {o.cover && <img src={o.cover} alt="" className="h-full w-full object-cover" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-stone-800">{o.title}</span>
                    <span className="block truncate text-xs text-subtle">{o.meta}</span>
                  </span>
                  {selected && <CheckIcon className="h-4 w-4 shrink-0 text-stone-700" />}
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
