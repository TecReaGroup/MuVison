import { HttpError } from '../../shared/httpError'

const OEMBED_URL = 'https://www.youtube.com/oembed'
const REQUEST_TIMEOUT_MS = 15_000
// Best first; maxresdefault is missing on older or low-resolution uploads
const THUMBNAIL_NAMES = ['maxresdefault', 'sddefault', 'hqdefault']

// og:image on a channel page is the channel avatar; attribute order is stable in YouTube's markup
const OG_IMAGE_PATTERN = /<meta\s+property="og:image"\s+content="([^"]+)"/

export type YouTubePreview = { videoId: string; title: string; creator: string; thumbnail: string }
type OEmbed = { title: string; author_name: string; author_url: string }

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
      else id = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/)?.[1] ?? null
    }
    return id && /^[\w-]{11}$/.test(id) ? id : null
  } catch {
    return null
  }
}

/** Strips playlist and tracking params so MeTube downloads exactly one video. */
export const canonicalWatchUrl = (videoId: string) => `https://www.youtube.com/watch?v=${videoId}`

export const thumbnailUrls = (videoId: string) =>
  THUMBNAIL_NAMES.map((name) => `https://i.ytimg.com/vi/${videoId}/${name}.jpg`)

export function requireYouTubeId(url: string): string {
  const videoId = parseYouTubeId(url)
  if (!videoId) throw new HttpError(400, 'Not a YouTube video link')
  return videoId
}

async function fetchOEmbed(videoId: string): Promise<OEmbed> {
  const query = new URLSearchParams({ url: canonicalWatchUrl(videoId), format: 'json' })
  const response = await fetch(`${OEMBED_URL}?${query}`, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
  // oEmbed answers 401 for private videos and 404 for removed ones
  if (response.status === 401 || response.status === 404) throw new HttpError(404, 'Video is unavailable')
  if (!response.ok) throw new HttpError(502, `YouTube oEmbed failed: ${response.status}`)
  return (await response.json()) as OEmbed
}

export async function fetchYouTubePreview(videoId: string): Promise<YouTubePreview> {
  const embed = await fetchOEmbed(videoId)
  return { videoId, title: embed.title, creator: embed.author_name, thumbnail: thumbnailUrls(videoId).at(-1)! }
}

/** Finds the avatar of the channel that uploaded the video, without needing a YouTube API key. */
export async function fetchChannelAvatarUrl(videoId: string): Promise<string> {
  const { author_url: channelUrl } = await fetchOEmbed(videoId)
  const response = await fetch(channelUrl, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
  if (!response.ok) throw new Error(`Channel page ${channelUrl} failed: ${response.status}`)
  const avatarUrl = (await response.text()).match(OG_IMAGE_PATTERN)?.[1]
  if (!avatarUrl) throw new Error(`No avatar found on ${channelUrl}`)
  return avatarUrl.replaceAll('&amp;', '&')
}
