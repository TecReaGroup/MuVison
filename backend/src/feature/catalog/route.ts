import type { FastifyInstance } from 'fastify'
import { HttpError } from '../../shared/httpError'
import { createLogger } from '../../shared/log'
import { NAME_FIELD_SCHEMA } from '../../shared/schema'
import { authorIdOf, buildCatalog, type CatalogView } from './catalogView'
import type { CreatorPhotoStore } from './creatorPhoto'
import type { LibraryVideo, VideoLibrary } from './library'
import { readCover } from './metadata'
import type { VideoTagInput, VideoTagWriter } from './videoTagWriter'

// Neutral 16:9 frame for videos without an embedded cover, so clients can always render `cover`
const PLACEHOLDER_COVER =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9"><rect width="16" height="9" fill="#e7e5e4"/></svg>'

type VideoParams = { Params: { videoId: string } }
type CreatorParams = { Params: { authorId: string } }
type EditVideoRoute = VideoParams & { Body: VideoTagInput }

const log = createLogger('catalog')

/** Requires @fastify/static registered with `root` set to the library's video directory. */
export function registerCatalogRoutes(
  app: FastifyInstance,
  library: VideoLibrary,
  photos: CreatorPhotoStore,
  tagWriter: VideoTagWriter,
): void {
  const requireVideo = (videoId: string): LibraryVideo => {
    const video = library.find(videoId)
    if (!video) throw new HttpError(404, `Video not found: ${videoId}`)
    return video
  }

  // Rescan on every catalog load so files dropped into the folder show up without a restart
  app.get('/api/catalog', async (): Promise<CatalogView> => buildCatalog(await library.scan(), photos))

  // sendFile answers HTTP Range requests, which <video> needs for seeking
  app.get<VideoParams>('/api/video/:videoId/stream', (request, reply) =>
    reply.sendFile(requireVideo(request.params.videoId).relativePath),
  )

  app.get<VideoParams>('/api/video/:videoId/cover', async (request, reply) => {
    const cover = await readCover(requireVideo(request.params.videoId).absolutePath)
    if (!cover) return reply.type('image/svg+xml').send(PLACEHOLDER_COVER)
    return reply.type(cover.mediaType).send(Buffer.from(cover.content))
  })

  app.patch<EditVideoRoute>(
    '/api/video/:videoId',
    {
      schema: {
        body: {
          type: 'object',
          required: ['title', 'creator', 'album'],
          properties: { title: NAME_FIELD_SCHEMA, creator: NAME_FIELD_SCHEMA, album: NAME_FIELD_SCHEMA },
        },
      },
    },
    async (request, reply) => {
      const video = requireVideo(request.params.videoId)
      const tag = {
        title: request.body.title.trim(),
        creator: request.body.creator.trim(),
        album: request.body.album.trim(),
      }
      await tagWriter.retag(video, tag)
      log.info(`Retagged ${video.relativePath}: "${tag.title}" / ${tag.creator} / ${tag.album}`)
      return reply.status(204).send()
    },
  )

  app.delete<VideoParams>('/api/video/:videoId', async (request, reply) => {
    await library.remove(requireVideo(request.params.videoId))
    return reply.status(204).send()
  })

  app.get<CreatorParams>('/api/creator/:authorId/photo', (request, reply) => {
    const { authorId } = request.params
    const creator = library
      .list()
      .map((video) => video.tag.creator)
      .find((name) => authorIdOf(name) === authorId)
    const fileName = creator && photos.findFileName(creator)
    if (!fileName) throw new HttpError(404, `Creator photo not found: ${authorId}`)
    return reply.sendFile(fileName, photos.photoDir)
  })
}
