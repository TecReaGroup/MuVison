import { existsSync } from 'node:fs'
import { join } from 'node:path'
import Fastify, { type FastifyError } from 'fastify'
import fastifyStatic from '@fastify/static'
import { PasswordGate } from './feature/auth/passwordGate'
import { registerAuthRoutes } from './feature/auth/route'
import { CreatorPhotoStore } from './feature/catalog/creatorPhoto'
import { H264Transcoder } from './feature/catalog/h264Transcoder'
import { VideoLibrary } from './feature/catalog/library'
import { VideoTagWriter } from './feature/catalog/videoTagWriter'
import { registerCatalogRoutes } from './feature/catalog/route'
import { MetubeClient } from './feature/submission/metubeClient'
import { registerSubmissionRoutes } from './feature/submission/route'
import { SubmissionQueue } from './feature/submission/submissionQueue'
import { registerWebRoutes } from './feature/web/route'
import { LOG_DIR, TEMP_DIR, loadConfig } from './shared/config'
import { configureLog, createLogger } from './shared/log'

const config = await loadConfig()
configureLog(LOG_DIR, config.logLevel)
const log = createLogger('server')

const transcoder = new H264Transcoder(config.ffmpegPath, config.ffprobePath, join(TEMP_DIR, 'transcode'))
const library = new VideoLibrary(config.videoDir)
await library.scan()
const creatorPhotos = new CreatorPhotoStore(config.creatorPhotoDir)
const tagWriter = new VideoTagWriter(config.ffmpegPath, join(TEMP_DIR, 'retag'))

const metube = new MetubeClient(config.submission.metubeUrl, config.submission.quality)
const submissionQueue = new SubmissionQueue(
  metube,
  config.submission,
  config.videoDir,
  creatorPhotos,
  tagWriter,
  transcoder,
  join(TEMP_DIR, 'submission'),
)

// Fastify's pino logger is off so every line follows the project log format
const app = Fastify({ logger: false })
await app.register(fastifyStatic, { root: config.videoDir, serve: false })
registerAuthRoutes(app, new PasswordGate(config.password, config.sessionMaxAgeMs))
registerCatalogRoutes(app, library, creatorPhotos, tagWriter)
registerSubmissionRoutes(app, submissionQueue)
// In development Vite serves the frontend, so dist/ only exists after `pnpm build`
if (existsSync(config.webDistDir)) {
  registerWebRoutes(app, config.webDistDir)
  log.info(`Serving frontend from ${config.webDistDir}`)
}

app.addHook('onResponse', async (request, reply) => {
  log.debug(`${request.method} ${request.url} ${reply.statusCode} ${reply.elapsedTime.toFixed(0)}ms`)
})

app.setErrorHandler((error: FastifyError, request, reply) => {
  const statusCode = error.statusCode ?? 500
  if (statusCode >= 500) log.error(`${request.method} ${request.url} failed: ${error.stack ?? error.message}`)
  else log.warn(`${request.method} ${request.url} ${statusCode}: ${error.message}`)
  return reply.status(statusCode).send({ error: error.message })
})

await app.listen({ host: config.host, port: config.port })
log.info(`Serving on http://${config.host}:${config.port}`)

// Also resumes compactions a restart interrupted; scan() repeats per catalog request and picks up results
transcoder
  .scheduleLibraryCompaction(config.videoDir)
  .catch((error: unknown) => log.error(`Library compaction not scheduled: ${error instanceof Error ? error.message : error}`))
