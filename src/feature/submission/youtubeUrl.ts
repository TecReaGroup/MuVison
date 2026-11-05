/** Extracts the 11-char video id from common YouTube URL shapes. */
export function parseYouTubeId(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null
  try {
    const url = new URL(value.startsWith('http') ? value : `https://${value}`)
    const host = url.hostname.replace(/^(www\.|m\.|music\.)/, '')
    let id: string | null = null
    if (host === 'youtu.be') id = url.pathname.slice(1).split('/')[0]
    else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      if (url.pathname === '/watch') id = url.searchParams.get('v')
      else {
        const m = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/)
        id = m?.[1] ?? null
      }
    }
    return id && /^[\w-]{11}$/.test(id) ? id : null
  } catch {
    return null
  }
}
