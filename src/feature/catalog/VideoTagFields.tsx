import { useId, type RefObject } from 'react'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { Field } from '@/shared/design/Field'
import { SuggestionCombobox } from '@/shared/design/SuggestionCombobox'
import type { VideoTagInput } from './catalog'
import { useAlbumSuggestions, useCreatorSuggestions } from './catalogSuggestion'

export const areVideoTagsComplete = ({ title, creator, album }: VideoTagInput) =>
  !!title.trim() && !!creator.trim() && !!album.trim()

/** Title / Creator / Album inputs; creator and album suggest the library's existing values. */
export function VideoTagFields({
  tags,
  onChange,
  albumInputRef,
}: {
  tags: VideoTagInput
  onChange: (tags: VideoTagInput) => void
  albumInputRef?: RefObject<HTMLInputElement | null>
}) {
  const { t } = useI18n()
  const albumSuggestions = useAlbumSuggestions()
  const creatorSuggestions = useCreatorSuggestions()
  const ids = { title: useId(), creator: useId(), creatorList: useId(), album: useId(), albumList: useId() }

  return (
    <div className="space-y-4">
      <Field id={ids.title} label={t.fieldTitle} required>
        <input
          id={ids.title}
          value={tags.title}
          onChange={(e) => onChange({ ...tags, title: e.target.value })}
          required
          className="input-control"
        />
      </Field>
      <Field id={ids.creator} label={t.fieldAuthor} required>
        <SuggestionCombobox
          id={ids.creator}
          listId={ids.creatorList}
          value={tags.creator}
          onChange={(creator) => onChange({ ...tags, creator })}
          suggestions={creatorSuggestions}
          placeholder={t.creatorPlaceholder}
        />
      </Field>
      <Field id={ids.album} label={t.fieldAlbum} required>
        <SuggestionCombobox
          inputRef={albumInputRef}
          id={ids.album}
          listId={ids.albumList}
          value={tags.album}
          onChange={(album) => onChange({ ...tags, album })}
          suggestions={albumSuggestions}
          placeholder={t.albumPlaceholder}
        />
      </Field>
    </div>
  )
}
