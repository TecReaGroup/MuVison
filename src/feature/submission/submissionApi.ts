import { postJson, requestJson } from '@/shared/http/requestJson'

export type SubmissionPreview = { videoId: string; title: string; creator: string; thumbnail: string }
export type SubmissionInput = { url: string; title: string; creator: string; album: string }
export type SubmissionStatus = 'downloading' | 'saving' | 'saved' | 'failed'
export type SubmissionJob = {
  id: string
  videoId: string
  title: string
  status: SubmissionStatus
  percent: number | null
  error: string | null
}

export const isSubmissionSettled = (job: SubmissionJob) => job.status === 'saved' || job.status === 'failed'

export const fetchSubmissionPreview = (url: string) =>
  requestJson<SubmissionPreview>(`/api/submission/preview?${new URLSearchParams({ url })}`)

export const createSubmission = (input: SubmissionInput) => postJson<SubmissionJob>('/api/submission', input)

export const fetchSubmissionJob = (jobId: string) => requestJson<SubmissionJob>(`/api/submission/${jobId}`)
