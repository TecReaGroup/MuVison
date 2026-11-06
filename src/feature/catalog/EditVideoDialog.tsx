import { useId, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { ApiError } from '@/shared/http/requestJson'
import { SpinnerIcon } from '@/shared/design/icon'
import { Field } from '@/shared/design/Field'
import { Modal } from '@/shared/design/Modal'
import { SuggestionCombobox } from '@/shared/design/SuggestionCombobox'
import { deleteVideo, updateVideoTags, type Video } from './catalog'
import { useCatalog } from './CatalogProvider'
import { useAlbumSuggestions, useCreatorSuggestions } from './catalogSuggestion'

/** Edits a video's Title / Creator / Album; open while `video` is set. */
export function EditVideoDialog({ video, onClose }: { video: Video | null; onClose: () => void }) {
  return <AnimatePresence>{video && <EditVideoForm key={video.id} video={video} onClose={onClose} />}</AnimatePresence>
}

function EditVideoForm({ video, onClose }: { video: Video; onClose: () => void }) {
  const { t } = useI18n()
  const { authorById, albumById, refresh } = useCatalog()
  const albumSuggestions = useAlbumSuggestions()
  const creatorSuggestions = useCreatorSuggestions()
  const [title, setTitle] = useState(video.title)
  const [creator, setCreator] = useState(() => authorById(video.authorId).name)
  const [album, setAlbum] = useState(() => albumById(video.albumId).title)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [error, setError] = useState('')
  const ids = {
    heading: useId(),
    title: useId(),
    creator: useId(),
    creatorList: useId(),
    album: useId(),
    albumList: useId(),
  }

  const busy = saving || deleting
  const canSave = !!title.trim() && !!creator.trim() && !!album.trim() && !busy

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    setError('')
    setSaving(true)
    try {
      await updateVideoTags(video.id, { title, creator, album })
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
    <Modal labelledBy={ids.heading} onClose={onClose}>
      <header className="px-6 pt-4 sm:pt-6">
        <h2 id={ids.heading} className="text-lg font-semibold leading-tight tracking-tight">
          {t.editVideo}
        </h2>
        <p className="mt-1.5 text-sm text-muted">{t.editVideoDesc}</p>
      </header>

      <form onSubmit={save}>
        <div className="px-6 pb-6 pt-5">
          <img
            src={video.cover}
            alt=""
            className="aspect-video w-28 rounded-lg bg-stone-200 object-cover ring-1 ring-border/70"
          />

          <div className="mt-5 space-y-4">
            <Field id={ids.title} label={t.fieldTitle} required>
              <input
                id={ids.title}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="input-control"
              />
            </Field>
            <Field id={ids.creator} label={t.fieldAuthor} required>
              <SuggestionCombobox
                id={ids.creator}
                listId={ids.creatorList}
                value={creator}
                onChange={setCreator}
                suggestions={creatorSuggestions}
                placeholder={t.creatorPlaceholder}
              />
            </Field>
            <Field id={ids.album} label={t.fieldAlbum} required>
              <SuggestionCombobox
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
          <button type="submit" disabled={!canSave} className="button-primary min-w-20">
            {saving ? <SpinnerIcon className="h-4 w-4" /> : t.save}
          </button>
        </div>

        <div className="border-t border-border/70 px-6 py-4">
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className={`flex h-10 w-full items-center justify-center rounded-xl text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              confirmingDelete ? 'bg-red-500 text-white hover:bg-red-600' : 'text-red-500 hover:bg-red-50'
            }`}
          >
            {deleting ? <SpinnerIcon className="h-4 w-4" /> : confirmingDelete ? t.confirmDeleteVideo : t.deleteVideo}
          </button>
        </div>
      </form>
    </Modal>
  )
}
