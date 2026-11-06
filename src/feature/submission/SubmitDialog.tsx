import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { useCatalog } from '@/feature/catalog/CatalogProvider'
import { useI18n, type TranslationDictionary } from '@/shared/i18n/I18nProvider'
import { ApiError } from '@/shared/http/requestJson'
import { CheckIcon, CloseIcon, LinkIcon, SpinnerIcon } from '@/shared/design/icon'
import { Modal } from '@/shared/design/Modal'
import { Field } from '@/shared/design/Field'
import { SuggestionCombobox } from '@/shared/design/SuggestionCombobox'
import { useAlbumSuggestions, useCreatorSuggestions } from '@/feature/catalog/catalogSuggestion'
import {
  createSubmission,
  fetchSubmissionJob,
  fetchSubmissionPreview,
  isSubmissionSettled,
  type SubmissionJob,
  type SubmissionPreview,
} from './submissionApi'

const JOB_POLL_INTERVAL_MS = 2000
type Step = 'input' | 'form' | 'done'

function previewErrorText(error: unknown, t: TranslationDictionary) {
  if (error instanceof ApiError && error.status === 400) return t.invalidUrl
  if (error instanceof ApiError && error.status === 404) return t.videoUnavailable
  return t.previewFailed
}

function jobStatusText(job: SubmissionJob, t: TranslationDictionary) {
  switch (job.status) {
    case 'downloading':
      return t.jobDownloading(job.percent)
    case 'saving':
      return t.jobSaving
    case 'saved':
      return t.jobSaved
    case 'failed':
      return t.jobFailed(job.error ?? '')
  }
}

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
  const [job, setJob] = useState<SubmissionJob | null>(null)
  const { refresh: refreshCatalog } = useCatalog()
  const albumSuggestions = useAlbumSuggestions()
  const creatorSuggestions = useCreatorSuggestions()
  const urlRef = useRef<HTMLInputElement>(null)
  const albumRef = useRef<HTMLInputElement>(null)
  const ids = {
    title: useId(),
    url: useId(),
    name: useId(),
    author: useId(),
    authorList: useId(),
    album: useId(),
    albumList: useId(),
  }

  useEffect(() => {
    if (step === 'input') urlRef.current?.focus()
    if (step === 'form') albumRef.current?.focus()
  }, [step])

  // Poll until the backend settles the job; a saved video is pulled into the catalog right away
  useEffect(() => {
    if (!job || isSubmissionSettled(job)) return
    const timer = window.setTimeout(async () => {
      try {
        const next = await fetchSubmissionJob(job.id)
        setJob(next)
        if (next.status === 'saved') void refreshCatalog()
      } catch (pollError) {
        console.error(pollError)
        // A new object re-arms this effect, so a transient failure only delays the next poll
        setJob({ ...job })
      }
    }, JOB_POLL_INTERVAL_MS)
    return () => window.clearTimeout(timer)
  }, [job, refreshCatalog])

  const parseLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const preview = await fetchSubmissionPreview(url)
      setParsed(preview)
      setTitle(preview.title)
      setAuthor(preview.creator)
      setStep('form')
    } catch (previewError) {
      setError(previewErrorText(previewError, t))
    } finally {
      setLoading(false)
    }
  }

  const submitVideo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!album.trim() || !title.trim() || !author.trim()) return
    setError('')
    setLoading(true)
    try {
      setJob(await createSubmission({ url, title, creator: author, album }))
      setStep('done')
    } catch (submitError) {
      setError(submitError instanceof ApiError && submitError.status === 409 ? t.alreadySubmitted : t.submitFailed)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setStep('input')
    setUrl('')
    setParsed(null)
    setTitle('')
    setAuthor('')
    setAlbum('')
    setJob(null)
    setError('')
  }

  const canSubmit = !!album.trim() && !!title.trim() && !!author.trim() && !loading

  return (
    <Modal labelledBy={ids.title} onClose={onClose}>
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
                  onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
                  className="h-full w-full object-cover"
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-subtle">youtu.be/{parsed.videoId}</p>
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
                <SuggestionCombobox
                  id={ids.author}
                  listId={ids.authorList}
                  value={author}
                  onChange={setAuthor}
                  suggestions={creatorSuggestions}
                  placeholder={t.creatorPlaceholder}
                />
              </Field>
              <Field id={ids.album} label={t.fieldAlbum} required>
                <SuggestionCombobox
                  inputRef={albumRef}
                  id={ids.album}
                  listId={ids.albumList}
                  value={album}
                  onChange={setAlbum}
                  suggestions={albumSuggestions}
                  placeholder={t.albumPlaceholder}
                />
              </Field>
            </div>
            {error && <p className="mt-4 text-[13px] text-red-500">{error}</p>}
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

      {step === 'done' && job && (
        <div>
          <div className="px-6 pb-6 pt-5">
            <div className="flex items-center gap-3.5 rounded-xl bg-surface-muted p-2.5 ring-1 ring-border/70">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  job.status === 'saved'
                    ? 'bg-emerald-50 text-emerald-600'
                    : job.status === 'failed'
                      ? 'bg-red-50 text-red-500'
                      : 'bg-stone-100 text-subtle'
                }`}
              >
                {job.status === 'saved' ? (
                  <CheckIcon className="h-5 w-5" />
                ) : job.status === 'failed' ? (
                  <CloseIcon className="h-5 w-5" />
                ) : (
                  <SpinnerIcon className="h-5 w-5" />
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{title}</p>
                <p className="truncate text-xs text-muted">
                  {author} · {album}
                </p>
                <p
                  title={job.error ?? undefined}
                  className={`mt-1 truncate text-xs ${job.status === 'failed' ? 'text-red-500' : 'text-subtle'}`}
                >
                  {jobStatusText(job, t)}
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
    </Modal>
  )
}
