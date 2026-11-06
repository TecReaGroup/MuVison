import { join } from 'node:path'
import Fastify, { type FastifyError } from 'fastify'
import fastifyStatic from '@fastify/static'
import { CreatorPhotoStore } from './feature/catalog/creatorPhoto'
import { VideoLibrary } from './feature/catalog/library'
import { registerCatalogRoutes } from './feature/catalog/route'
import { MetubeClient } from './feature/submission/metubeClient'
import { registerSubmissionRoutes } from './feature/submission/route'
import { SubmissionQueue } from './feature/submission/submissionQueue'
import { LOG_DIR, TEMP_DIR, loadConfig } from './shared/config'
import { configureLog, createLogger } from './shared/log'

const config = await loadConfig()
configureLog(LOG_DIR, config.logLevel)
const log = createLogger('server')

const library = new VideoLibrary(config.videoDir)
await library.scan()
const creatorPhotos = new CreatorPhotoStore(config.creatorPhotoDir)

const metube = new MetubeClient(config.submission.metubeUrl, config.submission.quality)
const submissionQueue = new SubmissionQueue(
  metube,
  config.submission,
  config.videoDir,
  creatorPhotos,
  join(TEMP_DIR, 'submission'),
)

// Fastify's pino logger is off so every line follows the project log format
const app = Fastify({ logger: false })
await app.register(fastifyStatic, { root: config.videoDir, serve: false })
registerCatalogRoutes(app, library, creatorPhotos)
registerSubmissionRoutes(app, submissionQueue)

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
