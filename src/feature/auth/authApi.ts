import { postJson, requestJson } from '@/shared/http/requestJson'

export const checkSession = () => requestJson<void>('/api/auth/session')

export const login = (password: string) => postJson<void>('/api/auth/login', { password })
