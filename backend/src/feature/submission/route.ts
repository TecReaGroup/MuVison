import type { FastifyInstance } from 'fastify'
import { HttpError } from '../../shared/httpError'
import type { SubmissionJob, SubmissionQueue } from './submissionQueue'
import { fetchYouTubePreview, requireYouTubeId, type YouTubePreview } from './youtube'

const TEXT_FIELD = { type: 'string', minLength: 1, maxLength: 200, pattern: '\\S' } as const

type PreviewRoute = { Querystring: { url: string } }
type SubmitRoute = { Body: { url: string; title: string; creator: string; album: string } }
type JobRoute = { Params: { jobId: string } }

export function registerSubmissionRoutes(app: FastifyInstance, queue: SubmissionQueue): void {
  app.get<PreviewRoute>(
    '/api/submission/preview',
    { schema: { querystring: { type: 'object', required: ['url'], properties: { url: { type: 'string' } } } } },
    async (request): Promise<YouTubePreview> => fetchYouTubePreview(requireYouTubeId(request.query.url)),
  )

  app.post<SubmitRoute>(
    '/api/submission',
    {
      schema: {
        body: {
          type: 'object',
          required: ['url', 'title', 'creator', 'album'],
          properties: { url: { type: 'string' }, title: TEXT_FIELD, creator: TEXT_FIELD, album: TEXT_FIELD },
        },
      },
    },
    async (request, reply): Promise<SubmissionJob> => {
      const { url, title, creator, album } = request.body
      const job = queue.submit({
        videoId: requireYouTubeId(url),
        title: title.trim(),
        creator: creator.trim(),
        album: album.trim(),
      })
      return reply.status(202).send(job)
    },
  )

  app.get<JobRoute>('/api/submission/:jobId', async (request): Promise<SubmissionJob> => {
    const job = queue.find(request.params.jobId)
    if (!job) throw new HttpError(404, `Submission not found: ${request.params.jobId}`)
    return job
  })
}
