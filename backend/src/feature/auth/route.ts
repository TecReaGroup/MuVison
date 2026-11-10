import type { FastifyInstance, FastifyRequest } from 'fastify'
import { API_CACHE_CONTROL } from '../../shared/cacheControl'
import { HttpError } from '../../shared/httpError'
import { createLogger } from '../../shared/log'
import type { PasswordGate } from './passwordGate'

const SESSION_COOKIE = 'muvision_session'
const AUTH_ROUTE_PREFIX = '/api/auth/'
// Slows down password guessing without needing a rate-limit store
const LOGIN_FAILURE_DELAY_MS = 1000

type LoginRoute = { Body: { password: string } }

const log = createLogger('auth')

function readSessionCookie(request: FastifyRequest): string {
  const pair = request.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
  return pair ? decodeURIComponent(pair.slice(SESSION_COOKIE.length + 1)) : ''
}

/** Must be registered before other routes: its hook locks every /api route except the auth ones. */
export function registerAuthRoutes(app: FastifyInstance, gate: PasswordGate): void {
  app.addHook('onRequest', async (request) => {
    if (!request.url.startsWith('/api/') || request.url.startsWith(AUTH_ROUTE_PREFIX)) return
    if (!gate.acceptsSessionToken(readSessionCookie(request))) throw new HttpError(401, 'Login required')
  })

  // onSend runs after @fastify/static sets its own Cache-Control, so this overrides it for streams and covers too
  app.addHook('onSend', async (request, reply) => {
    if (request.url.startsWith('/api/')) reply.header('Cache-Control', API_CACHE_CONTROL)
  })

  app.get('/api/auth/session', async (request, reply) => {
    if (!gate.acceptsSessionToken(readSessionCookie(request))) throw new HttpError(401, 'Login required')
    return reply.status(204).send()
  })

  app.post<LoginRoute>(
    '/api/auth/login',
    {
      schema: {
        body: { type: 'object', required: ['password'], properties: { password: { type: 'string', maxLength: 256 } } },
      },
    },
    async (request, reply) => {
      if (!gate.matchesPassword(request.body.password)) {
        log.warn(`Rejected login from ${request.ip}`)
        await new Promise((resolve) => setTimeout(resolve, LOGIN_FAILURE_DELAY_MS))
        throw new HttpError(401, 'Wrong password')
      }
      log.info(`Login from ${request.ip}`)
      const cookie = `${SESSION_COOKIE}=${gate.issueSessionToken()}; Max-Age=${gate.sessionMaxAgeSeconds}; Path=/; HttpOnly; SameSite=Lax`
      return reply.header('Set-Cookie', cookie).status(204).send()
    },
  )
}
