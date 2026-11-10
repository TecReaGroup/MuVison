import { useId, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { ApiError } from '@/shared/http/requestJson'
import { SpinnerIcon } from '@/shared/design/icon'
import { Modal, ModalFooter, ModalHeader } from '@/shared/design/Modal'
import { deleteVideo, updateVideoTags, type Video, type VideoTagInput } from './catalog'
import { useCatalog } from './CatalogProvider'
import { VideoTagFields, areVideoTagsComplete } from './VideoTagFields'

/** Edits a video's Title / Creator / Album; open while `video` is set. */
export function EditVideoDialog({ video, onClose }: { video: Video | null; onClose: () => void }) {
  return <AnimatePresence>{video && <EditVideoForm key={video.id} video={video} onClose={onClose} />}</AnimatePresence>
}

function EditVideoForm({ video, onClose }: { video: Video; onClose: () => void }) {
  const { t } = useI18n()
  const { authorById, albumById, refresh } = useCatalog()
  const [tags, setTags] = useState<VideoTagInput>(() => ({
    title: video.title,
    creator: authorById(video.authorId).name,
    album: albumById(video.albumId).title,
  }))
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [error, setError] = useState('')
  const headingId = useId()

  const busy = saving || deleting
  const canSave = areVideoTagsComplete(tags) && !busy

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    setError('')
    setSaving(true)
    try {
      await updateVideoTags(video.id, tags)
      await refresh()
      onClose()
    } catch (saveError) {
      setError(saveError instanceof ApiError && saveError.status === 409 ? t.videoInUse : t.saveFailed)
      setSaving(false)
    }
  }

  // First click only arms the button: deletion removes the file from disk and cannot be undone
  const remove = async () => {
    if (!confirmingDelete) return setConfirmingDelete(true)
    setError('')
    setDeleting(true)
    try {
      await deleteVideo(video.id)
      await refresh()
      onClose()
    } catch (deleteError) {
      setError(deleteError instanceof ApiError && deleteError.status === 409 ? t.videoInUseDelete : t.deleteFailed)
      setDeleting(false)
      setConfirmingDelete(false)
    }
  }

  return (
    <Modal labelledBy={headingId} onClose={onClose}>
      <ModalHeader id={headingId} title={t.editVideo} description={t.editVideoDesc} />

      <form onSubmit={save}>
        <div className="px-6 pb-6 pt-5">
          <img
            src={video.cover}
            alt=""
            className="mb-5 block aspect-video w-28 rounded-lg bg-fill-strong object-cover ring-1 ring-border/70"
          />
          <VideoTagFields tags={tags} onChange={setTags} />
          {error && <p className="form-error mt-4">{error}</p>}
        </div>

        <ModalFooter>
          <button type="button" onClick={onClose} className="button-secondary">
            {t.cancel}
          </button>
          <button type="submit" disabled={!canSave} className="button-primary min-w-20">
            {saving ? <SpinnerIcon className="h-4 w-4" /> : t.save}
          </button>
        </ModalFooter>

        <div className="border-t border-border/70 px-6 py-4">
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className={`flex h-10 w-full items-center justify-center rounded-xl text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              confirmingDelete ? 'bg-danger text-white hover:bg-danger-strong' : 'text-danger hover:bg-danger-soft'
            }`}
          >
            {deleting ? <SpinnerIcon className="h-4 w-4" /> : confirmingDelete ? t.confirmDeleteVideo : t.deleteVideo}
          </button>
        </div>
      </form>
    </Modal>
  )
}
