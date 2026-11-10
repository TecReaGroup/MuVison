import { createHash } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { IMMUTABLE_CACHE_CONTROL } from '../../shared/cacheControl'
import { HttpError } from '../../shared/httpError'
import { createLogger } from '../../shared/log'
import { NAME_FIELD_SCHEMA } from '../../shared/schema'
import { authorIdOf, buildCatalog, buildVideoFileList, type CatalogView, type VideoFileView } from './catalogView'
import type { CreatorPhotoStore } from './creatorPhoto'
import type { LibraryVideo, VideoLibrary } from './library'
import { readCover } from './metadata'
import type { VideoProber } from './videoProbe'
import type { VideoTagInput, VideoTagWriter } from './videoTagWriter'

// Neutral 16:9 frame for videos without an embedded cover, so clients can always render `cover`
const PLACEHOLDER_COVER =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9"><rect width="16" height="9" fill="#e7e5e4"/></svg>'

type VideoParams = { Params: { videoId: string } }
type VideoVersionParams = { Params: { videoId: string; version: string } }
type CreatorPhotoParams = { Params: { authorId: string; version: string } }
type EditVideoRoute = VideoParams & { Body: VideoTagInput }

const log = createLogger('catalog')

/** Requires @fastify/static registered with `root` set to the library's video directory. */
export function registerCatalogRoutes(
  app: FastifyInstance,
  library: VideoLibrary,
  photos: CreatorPhotoStore,
  tagWriter: VideoTagWriter,
  prober: VideoProber,
): void {
  const requireVideo = (videoId: string): LibraryVideo => {
    const video = library.find(videoId)
    if (!video) throw new HttpError(404, `Video not found: ${videoId}`)
    return video
  }

  // Rescan on every catalog load so files dropped into the folder show up without a restart.
  // The ETag lets an unchanged catalog, which grows with the library, come back as an empty 304
  app.get('/api/catalog', async (request, reply) => {
    const catalog: CatalogView = buildCatalog(await library.scan(), photos)
    const body = JSON.stringify(catalog)
    const etag = `"${createHash('sha1').update(body).digest('base64url')}"`
    reply.header('ETag', etag)
    if (request.headers['if-none-match'] === etag) return reply.status(304).send()
    return reply.type('application/json').send(body)
  })

  app.get('/api/library/video', async (): Promise<VideoFileView[]> => {
    const videos = await library.scan()
    return buildVideoFileList(videos, await prober.probeAll(videos))
  })

  // Media URLs embed the file version, so a given URL always serves the same bytes; they sit outside the /api
  // login lock so a CDN can cache them. A stale version is a 404, never the current file:
  // otherwise a CDN would cache new content under an old URL
  const requireVideoVersion = ({ videoId, version }: VideoVersionParams['Params']): LibraryVideo => {
    const video = requireVideo(videoId)
    if (video.version !== version) throw new HttpError(404, `Video version not found: ${videoId}/${version}`)
    return video
  }

  // sendFile answers HTTP Range requests, which <video> needs for seeking
  app.get<VideoVersionParams>('/media/video/:videoId/:version/stream', (request, reply) =>
    reply
      .header('Cache-Control', IMMUTABLE_CACHE_CONTROL)
      .sendFile(requireVideoVersion(request.params).relativePath, { cacheControl: false }),
  )

  app.get<VideoVersionParams>('/media/video/:videoId/:version/cover', async (request, reply) => {
    const cover = await readCover(requireVideoVersion(request.params).absolutePath)
    reply.header('Cache-Control', IMMUTABLE_CACHE_CONTROL)
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

  // Versioned like covers; a replaced photo gets a new URL and the old one turns 404
  app.get<CreatorPhotoParams>('/media/creator/:authorId/:version/photo', (request, reply) => {
    const { authorId, version } = request.params
    const creator = library
      .list()
      .map((video) => video.tag.creator)
      .find((name) => authorIdOf(name) === authorId)
    const photo = creator && photos.find(creator)
    if (!photo || photo.version !== version) throw new HttpError(404, `Creator photo not found: ${authorId}/${version}`)
    return reply
      .header('Cache-Control', IMMUTABLE_CACHE_CONTROL)
      .sendFile(photo.fileName, photos.photoDir, { cacheControl: false })
  })
}
