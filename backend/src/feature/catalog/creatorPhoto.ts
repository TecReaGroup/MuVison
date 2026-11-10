import { statSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { toFileStem } from '../../shared/fileName'

const PHOTO_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']
const EXTENSION_BY_MEDIA_TYPE: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}

/** `version` changes whenever the file is replaced, so URLs keyed by it can be cached forever. */
export type CreatorPhoto = { fileName: string; version: string }

/**
 * Creator photos stored as `<creator name>.<jpg|jpeg|png|webp>` in one folder.
 *
 * Name-based so photos can also be dropped in by hand; the name must match the Creator tag
 * after file-name sanitizing.
 */
export class CreatorPhotoStore {
  readonly photoDir: string

  constructor(photoDir: string) {
    this.photoDir = photoDir
  }

  /** The creator's photo inside photoDir, if they have one. */
  find(creator: string): CreatorPhoto | undefined {
    const stem = toFileStem(creator)
    if (!stem) return undefined
    for (const extension of PHOTO_EXTENSIONS) {
      const fileName = `${stem}${extension}`
      const stats = statSync(join(this.photoDir, fileName), { throwIfNoEntry: false })
      // ctime, not mtime: a photo copied in by hand may keep an old mtime from its source
      if (stats?.isFile()) return { fileName, version: `${Math.floor(stats.ctimeMs).toString(36)}${stats.size.toString(36)}` }
    }
    return undefined
  }

  /** Throws for media types other than JPEG, PNG and WebP. */
  async save(creator: string, content: Uint8Array, mediaType: string): Promise<string> {
    const extension = EXTENSION_BY_MEDIA_TYPE[mediaType.split(';')[0].trim().toLowerCase()]
    if (!extension) throw new Error(`Unsupported creator photo type: ${mediaType}`)
    const stem = toFileStem(creator)
    if (!stem) throw new Error(`Creator name "${creator}" cannot be used as a file name`)
    await mkdir(this.photoDir, { recursive: true })
    const path = join(this.photoDir, `${stem}${extension}`)
    await writeFile(path, content)
    return path
  }
}
