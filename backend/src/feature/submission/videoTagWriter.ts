import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export type VideoTagInput = { title: string; creator: string; album: string }

/**
 * Remuxes `source` into an MP4 at `destination` with title/creator/album tags and an optional embedded cover.
 *
 * Streams are copied, not re-encoded. `0:V` (capital) skips any cover the source already embeds,
 * so the result never carries two attached pictures.
 */
export async function writeTaggedVideo(
  ffmpegPath: string,
  { source, cover, destination, tag }: { source: string; cover?: string; destination: string; tag: VideoTagInput },
): Promise<void> {
  const coverArgs = cover ? ['-i', cover] : []
  const coverMapArgs = cover ? ['-map', '1:0', '-disposition:v:1', 'attached_pic'] : []
  const args = [
    ...['-y', '-v', 'error', '-i', source, ...coverArgs],
    ...['-map', '0:V:0', '-map', '0:a?', ...coverMapArgs],
    ...['-c', 'copy'],
    // mp4 muxer maps these keys to the ©nam / ©ART / ©alb atoms the catalog reads
    ...['-metadata', `title=${tag.title}`, '-metadata', `artist=${tag.creator}`, '-metadata', `album=${tag.album}`],
    // Moov atom up front so browsers can start playback before the whole file arrives
    ...['-movflags', '+faststart', '-f', 'mp4', destination],
  ]
  await execFileAsync(ffmpegPath, args, { windowsHide: true })
}
