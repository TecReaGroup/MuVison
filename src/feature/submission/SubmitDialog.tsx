import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { VIDEOS } from '@/feature/catalog/catalog'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { CheckIcon, CloseIcon, LinkIcon, SpinnerIcon } from '@/shared/design/icon'
import { EASE } from '@/shared/design/motion'
import { Field } from '@/shared/design/Field'
import { AlbumCombobox } from './AlbumCombobox'
import { parseYouTubeId } from './youtubeUrl'
import { loadSubmissionPreview, type SubmissionPreview } from './submissionPreview'

const SUBMIT_DELAY_MS = 800
type Step = 'input' | 'form' | 'done'

export default function SubmitDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <AnimatePresence>{open && <Dialog onClose={onClose} />}</AnimatePresence>
}

function Dialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  const [step, setStep] = useState<Step>('input')
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [parsed, setParsed] = useState<SubmissionPreview | null>(null)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [album, setAlbum] = useState('')
  const urlRef = useRef<HTMLInputElement>(null)
  const albumRef = useRef<HTMLInputElement>(null)
  const ids = { title: useId(), url: useId(), name: useId(), author: useId(), album: useId(), list: useId() }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  useEffect(() => {
    if (step === 'input') urlRef.current?.focus()
    if (step === 'form') albumRef.current?.focus()
  }, [step])

  const parseLink = async (e: React.FormEvent) => {
    e.preventDefault()
    const id = parseYouTubeId(url)
    if (!id) {
      setError(t.invalidUrl)
      return
    }
    setError('')
    setLoading(true)
    const preview = await loadSubmissionPreview(id)
    setLoading(false)
    setParsed(preview)
    setTitle(preview.title)
    setAuthor(preview.author)
    setStep('form')
  }

  const submitVideo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!album.trim() || !title.trim() || !author.trim()) return
    setLoading(true)
    await new Promise((r) => window.setTimeout(r, SUBMIT_DELAY_MS))
    setLoading(false)
    setStep('done')
  }

  const reset = () => {
    setStep('input')
    setUrl('')
    setParsed(null)
    setTitle('')
    setAuthor('')
    setAlbum('')
    setError('')
  }

  const canSubmit = !!album.trim() && !!title.trim() && !!author.trim() && !loading

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/40 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={ids.title}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.2, ease: EASE }}
        onMouseDown={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)] ring-1 ring-border/70 sm:max-h-none sm:max-w-[480px] sm:overflow-visible sm:rounded-2xl sm:pb-0"
      >
        {/* Grabber hints the bottom-sheet presentation on phones */}
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-stone-200 sm:hidden" aria-hidden="true" />
        <header className="px-6 pt-4 sm:pt-6">
          <h2 id={ids.title} className="text-lg font-semibold leading-tight tracking-tight">
            {step === 'done' ? t.submitted : t.submitVideo}
          </h2>
          <p className="mt-1.5 text-sm text-muted">{step === 'done' ? t.submittedDesc : t.submitDesc}</p>
        </header>

        {step === 'input' && (
          <form onSubmit={parseLink}>
            <div className="px-6 pb-8 pt-5">
              <label htmlFor={ids.url} className="sr-only">
                {t.urlLabel}
              </label>
              <div className="relative">
                <div
                  className={`flex h-12 items-center gap-3 rounded-xl bg-surface-muted pl-4 ${url ? 'pr-1.5' : 'pr-4'} ring-1 transition-[box-shadow,background-color] focus-within:bg-surface ${
                    error ? 'ring-red-300' : 'ring-border focus-within:ring-stone-400'
                  }`}
                >
                  <LinkIcon className="h-4 w-4 shrink-0 text-subtle" />
                  <input
                    ref={urlRef}
                    id={ids.url}
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value)
                      if (error) setError('')
                    }}
                    placeholder="https://www.youtube.com/watch?v=…"
                    aria-invalid={!!error}
                    spellCheck={false}
                    className="h-full min-w-0 flex-1 truncate bg-transparent text-base outline-none placeholder:text-subtle sm:text-sm"
                  />
                  {url && (
                    <button
                      type="button"
                      onClick={() => {
                        setUrl('')
                        setError('')
                        urlRef.current?.focus()
                      }}
                      aria-label={t.clear}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-stone-100 hover:text-stone-700"
                    >
                      <CloseIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Error floats under the input so it never shifts the layout */}
                {error && <p className="absolute inset-x-0 top-full mt-2 text-[13px] text-red-500">{error}</p>}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 px-6 pb-6">
              <button type="button" onClick={onClose} className="button-secondary">
                {t.cancel}
              </button>
              <button type="submit" disabled={!url.trim() || loading} className="button-primary min-w-20">
                {loading ? <SpinnerIcon className="h-4 w-4" /> : t.parse}
              </button>
            </div>
          </form>
        )}

        {step === 'form' && parsed && (
          <form onSubmit={submitVideo}>
            <div className="px-6 pb-6 pt-5">
              <div className="flex items-center gap-3.5 rounded-xl bg-surface-muted p-2.5 ring-1 ring-border/70">
                <span className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg bg-stone-200">
                  <img
                    src={parsed.thumbnail}
                    alt=""
                    onError={(e) => (e.currentTarget.src = VIDEOS[0].cover)}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute bottom-1 right-1 rounded bg-stone-950/75 px-1 py-px text-[10px] font-medium tabular-nums text-white">
                    {parsed.duration}
                  </span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-subtle">youtu.be/{parsed.id}</p>
                  <button
                    type="button"
                    onClick={reset}
                    className="mt-1 text-[13px] font-medium text-secondary underline-offset-2 hover:text-foreground hover:underline"
                  >
                    {t.changeLink}
                  </button>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <Field id={ids.name} label={t.fieldTitle} required>
                  <input
                    id={ids.name}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="input-control"
                  />
                </Field>
                <Field id={ids.author} label={t.fieldAuthor} required>
                  <input
                    id={ids.author}
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    required
                    className="input-control"
                  />
                </Field>
                <Field id={ids.album} label={t.fieldAlbum} required>
                  <AlbumCombobox
                    inputRef={albumRef}
                    id={ids.album}
                    listId={ids.list}
                    value={album}
                    onChange={setAlbum}
                  />
                </Field>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 px-6 pb-6">
              <button type="button" onClick={onClose} className="button-secondary">
                {t.cancel}
              </button>
              <button type="submit" disabled={!canSubmit} className="button-primary min-w-20">
                {loading ? <SpinnerIcon className="h-4 w-4" /> : t.submit}
              </button>
            </div>
          </form>
        )}

        {step === 'done' && parsed && (
          <div>
            <div className="px-6 pb-6 pt-5">
              <div className="flex items-center gap-3.5 rounded-xl bg-surface-muted p-2.5 ring-1 ring-border/70">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{title}</p>
                  <p className="truncate text-xs text-muted">
                    {author} · {album}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 px-6 pb-6">
              <button onClick={reset} className="button-secondary">
                {t.submitAnother}
              </button>
              <button onClick={onClose} className="button-primary">
                {t.done}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
