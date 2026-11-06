const MAX_FILE_STEM_LENGTH = 120
// Characters Windows forbids in file names, plus control characters
const UNSAFE_FILE_NAME_CHARS = /[<>:"/\\|?*\x00-\x1f]/g

/** Turns free text into a file name stem that is valid on Windows and POSIX; empty when nothing usable remains. */
export function toFileStem(text: string): string {
  const collapsed = text.replace(UNSAFE_FILE_NAME_CHARS, ' ').replace(/\s+/g, ' ').trim()
  // Windows drops trailing dots and spaces, which would make two names collide
  return collapsed.slice(0, MAX_FILE_STEM_LENGTH).replace(/[. ]+$/, '')
}
