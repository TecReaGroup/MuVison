import { HttpError } from '../../shared/httpError'

// Innertube "next" (the watch page's own data call) instead of oEmbed: oEmbed answers 401 for public
// videos whose owner disabled embedding, and the watch page HTML hits a bot check from server IPs.
const WATCH_DATA_URL = 'https://www.youtube.com/youtubei/v1/next?prettyPrint=false'
const WATCH_DATA_CLIENT = { clientName: 'WEB', clientVersion: '2.20241101.00.00', hl: 'en' }
const REQUEST_TIMEOUT_MS = 15_000
// Best first; maxresdefault is missing on older or low-resolution uploads
const THUMBNAIL_NAMES = ['maxresdefault', 'sddefault', 'hqdefault']
const AVATAR_SIZE_PX = 900

// Size segment of a googleusercontent/ggpht image URL, e.g. "=s176-c-k-..."
const AVATAR_SIZE_PATTERN = /=s\d+-/

export type YouTubePreview = { videoId: string; title: string; creator: string; thumbnail: string }
type WatchDetails = { title: string; creator: string; avatarUrl: string | undefined }

type TextRuns = { runs?: { text: string }[] }
type WatchNextResponse = {
  contents?: {
    twoColumnWatchNextResults?: {
      results?: {
        results?: {
          contents?: {
            videoPrimaryInfoRenderer?: { title?: TextRuns }
            videoSecondaryInfoRenderer?: {
              owner?: { videoOwnerRenderer?: { title?: TextRuns; thumbnail?: { thumbnails?: { url: string }[] } } }
            }
          }[]
        }
      }
    }
  }
}

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

const joinRuns = (text: TextRuns | undefined) => text?.runs?.map((run) => run.text).join('') ?? ''

/** Throws 404 when YouTube renders no video info, which is how removed and private videos come back. */
async function fetchWatchDetails(videoId: string): Promise<WatchDetails> {
  const response = await fetch(WATCH_DATA_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ context: { client: WATCH_DATA_CLIENT }, videoId }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!response.ok) throw new HttpError(502, `YouTube watch data failed: ${response.status}`)
  const sections = ((await response.json()) as WatchNextResponse).contents?.twoColumnWatchNextResults?.results?.results
    ?.contents ?? []
  const title = joinRuns(sections.find((section) => section.videoPrimaryInfoRenderer)?.videoPrimaryInfoRenderer?.title)
  const owner = sections.find((section) => section.videoSecondaryInfoRenderer)?.videoSecondaryInfoRenderer?.owner
    ?.videoOwnerRenderer
  if (!title || !owner) throw new HttpError(404, 'Video is unavailable')
  const avatarUrl = owner.thumbnail?.thumbnails?.at(-1)?.url.replace(AVATAR_SIZE_PATTERN, `=s${AVATAR_SIZE_PX}-`)
  return { title, creator: joinRuns(owner.title), avatarUrl }
}

export async function fetchYouTubePreview(videoId: string): Promise<YouTubePreview> {
  const { title, creator } = await fetchWatchDetails(videoId)
  return { videoId, title, creator, thumbnail: thumbnailUrls(videoId).at(-1)! }
}

/** Finds the avatar of the channel that uploaded the video, without needing a YouTube API key. */
export async function fetchChannelAvatarUrl(videoId: string): Promise<string> {
  const { avatarUrl } = await fetchWatchDetails(videoId)
  if (!avatarUrl) throw new Error(`No channel avatar for video ${videoId}`)
  return avatarUrl
}
