/** A non-2xx response; `status` is 0 when the server could not be reached. */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new ApiError(response.status, body?.error ?? `${init?.method ?? 'GET'} ${url} failed: ${response.status}`)
  }
  return response.json()
}

export const postJson = <T>(url: string, body: unknown) =>
  requestJson<T>(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
