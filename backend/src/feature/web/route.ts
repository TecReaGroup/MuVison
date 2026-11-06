import { statSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import type { FastifyInstance } from 'fastify'
import { HttpError } from '../../shared/httpError'

type AssetRoute = { Params: { '*': string } }

const isFileInside = (root: string, relativePath: string): boolean => {
  const path = resolve(root, relativePath)
  return path.startsWith(root + sep) && (statSync(path, { throwIfNoEntry: false })?.isFile() ?? false)
}

/**
 * Serves the built frontend so one process hosts the whole app.
 * Unknown non-API paths fall back to index.html, the single-page app's entry.
 * Requires @fastify/static registered (it provides reply.sendFile).
 */
export function registerWebRoutes(app: FastifyInstance, distDir: string): void {
  app.get<AssetRoute>('/*', (request, reply) => {
    if (request.url.startsWith('/api/')) throw new HttpError(404, `Route not found: ${request.url}`)
    const assetPath = request.params['*']
    if (assetPath.startsWith('assets/') && isFileInside(distDir, assetPath)) {
      // Vite fingerprints everything under assets/, so it can be cached forever
      return reply.sendFile(assetPath, distDir, { maxAge: '365d', immutable: true })
    }
    if (isFileInside(distDir, assetPath)) return reply.sendFile(assetPath, distDir)
    return reply.header('Cache-Control', 'no-cache').sendFile('index.html', distDir)
  })
}
