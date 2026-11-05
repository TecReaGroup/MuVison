export type SubmissionPreview = { id: string; title: string; author: string; duration: string; thumbnail: string }

// Mock metadata until a real backend resolves YouTube details
const MOCK_RESULTS = [
  { title: 'Iceland Ring Road: Ten Days in 4K', author: 'Nomad Lens', duration: '18:24' },
  { title: 'Kyoto in the Rain — A Quiet Walk', author: 'Slow Frames', duration: '12:07' },
  { title: 'Patagonia: The W Trek Complete Guide', author: 'Trail Notes', duration: '26:41' },
  { title: 'Morning Routine of a Ceramic Artist', author: 'Studio Hours', duration: '09:58' },
  { title: 'Tokyo After Midnight', author: 'Neon Atlas', duration: '14:33' },
]
const PARSE_DELAY_MS = 900

export function loadSubmissionPreview(id: string): Promise<SubmissionPreview> {
  const hash = [...id].reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const pick = MOCK_RESULTS[hash % MOCK_RESULTS.length]
  return new Promise((resolve) =>
    window.setTimeout(
      () => resolve({ id, ...pick, thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` }),
      PARSE_DELAY_MS,
    ),
  )
}
