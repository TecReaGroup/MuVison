// Every Cache-Control the server sends lives here, so the whole caching policy reads in one place.
// The service worker's runtime caching in vite.config.ts builds on these same rules.
// NOTE: @fastify/static writes its own header unless sendFile gets `{ cacheControl: false }`

/** The URL embeds a content version (versioned media, fingerprinted build assets), so its bytes never change. */
export const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable'

/** Session-bound API answers: a CDN or proxy must never replay them, and the browser revalidates so edits show at once. */
export const API_CACHE_CONTROL = 'private, no-cache'

/** The app entry page: kept, but revalidated on every launch so a new build is picked up. */
export const ENTRY_CACHE_CONTROL = 'no-cache'
