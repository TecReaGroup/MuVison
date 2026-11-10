import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import type { VideoTagInput } from '@/feature/catalog/catalog'
import { useCatalog } from '@/feature/catalog/CatalogProvider'
import { VideoTagFields, areVideoTagsComplete } from '@/feature/catalog/VideoTagFields'
import { useI18n, type TranslationDictionary } from '@/shared/i18n/I18nProvider'
import { ApiError } from '@/shared/http/requestJson'
import { CheckIcon, CloseIcon, LinkIcon, SpinnerIcon } from '@/shared/design/icon'
import { Modal, ModalFooter, ModalHeader } from '@/shared/design/Modal'
import {
  createSubmission,
  fetchSubmissionJob,
  fetchSubmissionPreview,
  isSubmissionSettled,
  type SubmissionJob,
  type SubmissionPreview,
} from './submissionApi'

const JOB_POLL_INTERVAL_MS = 2000
const EMPTY_TAGS: VideoTagInput = { title: '', creator: '', album: '' }
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

const JOB_BADGE: Record<SubmissionJob['status'], { className: string; Icon: typeof CheckIcon }> = {
  downloading: { className: 'bg-fill text-subtle', Icon: SpinnerIcon },
  saving: { className: 'bg-fill text-subtle', Icon: SpinnerIcon },
  saved: { className: 'bg-success-soft text-success', Icon: CheckIcon },
  failed: { className: 'bg-danger-soft text-danger', Icon: CloseIcon },
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
  const [tags, setTags] = useState(EMPTY_TAGS)
  const [job, setJob] = useState<SubmissionJob | null>(null)
  const { refresh: refreshCatalog } = useCatalog()
  const urlRef = useRef<HTMLInputElement>(null)
  const albumRef = useRef<HTMLInputElement>(null)
  const ids = { heading: useId(), url: useId() }

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
      setTags({ title: preview.title, creator: preview.creator, album: '' })
      setStep('form')
    } catch (previewError) {
      setError(previewErrorText(previewError, t))
    } finally {
      setLoading(false)
    }
  }

  const submitVideo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!areVideoTagsComplete(tags)) return
    setError('')
    setLoading(true)
    try {
      setJob(await createSubmission({ url, ...tags }))
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
    setTags(EMPTY_TAGS)
    setJob(null)
    setError('')
  }

  const canSubmit = areVideoTagsComplete(tags) && !loading

  return (
    <Modal labelledBy={ids.heading} onClose={onClose}>
      <ModalHeader
        id={ids.heading}
        title={step === 'done' ? t.submitted : t.submitVideo}
        description={step === 'done' ? t.submittedDesc : t.submitDesc}
      />

      {step === 'input' && (
        <form onSubmit={parseLink}>
          <div className="px-6 pb-8 pt-5">
            <label htmlFor={ids.url} className="sr-only">
              {t.urlLabel}
            </label>
            <div className="relative">
              <div className={`input-shell h-12 gap-3 pl-4 ${url ? 'pr-1.5' : 'pr-4'}`}>
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
                    className="button-quiet h-9 w-9 rounded-lg"
                  >
                    <CloseIcon className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Error floats under the input so it never shifts the layout */}
              {error && <p className="form-error absolute inset-x-0 top-full mt-2">{error}</p>}
            </div>
          </div>

          <ModalFooter>
            <button type="button" onClick={onClose} className="button-secondary">
              {t.cancel}
            </button>
            <button type="submit" disabled={!url.trim() || loading} className="button-primary min-w-20">
              {loading ? <SpinnerIcon className="h-4 w-4" /> : t.parse}
            </button>
          </ModalFooter>
        </form>
      )}

      {step === 'form' && parsed && (
        <form onSubmit={submitVideo}>
          <div className="px-6 pb-6 pt-5">
            <div className="mb-5 flex items-center gap-3.5 rounded-xl bg-surface-muted p-2.5 ring-1 ring-border/70">
              <span className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg bg-fill-strong">
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

            <VideoTagFields tags={tags} onChange={setTags} albumInputRef={albumRef} />
            {error && <p className="form-error mt-4">{error}</p>}
          </div>

          <ModalFooter>
            <button type="button" onClick={onClose} className="button-secondary">
              {t.cancel}
            </button>
            <button type="submit" disabled={!canSubmit} className="button-primary min-w-20">
              {loading ? <SpinnerIcon className="h-4 w-4" /> : t.submit}
            </button>
          </ModalFooter>
        </form>
      )}

      {step === 'done' && job && <SubmissionStatus job={job} tags={tags} onReset={reset} onClose={onClose} />}
    </Modal>
  )
}

function SubmissionStatus({
  job,
  tags,
  onReset,
  onClose,
}: {
  job: SubmissionJob
  tags: VideoTagInput
  onReset: () => void
  onClose: () => void
}) {
  const { t } = useI18n()
  const badge = JOB_BADGE[job.status]
  return (
    <div>
      <div className="px-6 pb-6 pt-5">
        <div className="flex items-center gap-3.5 rounded-xl bg-surface-muted p-2.5 ring-1 ring-border/70">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${badge.className}`}>
            <badge.Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{tags.title}</p>
            <p className="truncate text-xs text-muted">
              {tags.creator} · {tags.album}
            </p>
            <p
              title={job.error ?? undefined}
              className={`mt-1 truncate text-xs ${job.status === 'failed' ? 'text-danger' : 'text-subtle'}`}
            >
              {jobStatusText(job, t)}
            </p>
          </div>
        </div>
      </div>
      <ModalFooter>
        <button onClick={onReset} className="button-secondary">
          {t.submitAnother}
        </button>
        <button onClick={onClose} className="button-primary">
          {t.done}
        </button>
      </ModalFooter>
    </div>
  )
}
