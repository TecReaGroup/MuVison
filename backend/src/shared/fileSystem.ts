import { copyFile, rename, rm } from 'node:fs/promises'

/** Moves a file, replacing any existing destination; falls back to copy + delete across drives. */
export async function moveFile(source: string, destination: string): Promise<void> {
  try {
    await rename(source, destination)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EXDEV') throw error
    await copyFile(source, destination)
    await rm(source)
  }
}
