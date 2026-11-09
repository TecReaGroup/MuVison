import { useEffect, useState, type ReactNode } from 'react'
import { checkSession, login } from './authApi'
import { LoginPage } from './LoginPage'

type SessionState = 'checking' | 'locked' | 'unlocked'

// Shareable link login: https://host/?access=<password>
const ACCESS_PARAM = 'access'

/** Reads and strips the password from the URL so it does not linger in the address bar or history. */
function takeAccessPassword(): string | null {
  const url = new URL(window.location.href)
  const password = url.searchParams.get(ACCESS_PARAM)
  if (password === null) return null
  url.searchParams.delete(ACCESS_PARAM)
  window.history.replaceState(window.history.state, '', url)
  return password
}

// Taken once at module load: StrictMode runs effects twice, and the second run would find the URL already stripped
const ACCESS_PASSWORD = takeAccessPassword()

async function resolveSession(accessPassword: string | null): Promise<SessionState> {
  try {
    await (accessPassword ? login(accessPassword) : checkSession())
    return 'unlocked'
  } catch {
    // A wrong link password may still sit beside a valid cookie
    if (!accessPassword) return 'locked'
    return checkSession().then(
      () => 'unlocked',
      () => 'locked',
    )
  }
}

/** Renders children only with a valid session, so nothing below needs to handle a 401. `fallback` shows while checking. */
export function AuthGate({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const [session, setSession] = useState<SessionState>('checking')

  useEffect(() => {
    void resolveSession(ACCESS_PASSWORD).then(setSession)
  }, [])

  if (session === 'unlocked') return children
  if (session === 'locked') return <LoginPage onLogin={() => setSession('unlocked')} />
  return fallback
}
