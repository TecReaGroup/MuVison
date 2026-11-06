import { useEffect, useState, type ReactNode } from 'react'
import { SpinnerIcon } from '@/shared/design/icon'
import { checkSession } from './authApi'
import { LoginPage } from './LoginPage'

type SessionState = 'checking' | 'locked' | 'unlocked'

/** Renders children only with a valid session, so nothing below needs to handle a 401. */
export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>('checking')

  useEffect(() => {
    checkSession()
      .then(() => setSession('unlocked'))
      .catch(() => setSession('locked'))
  }, [])

  if (session === 'unlocked') return children
  if (session === 'locked') return <LoginPage onLogin={() => setSession('unlocked')} />
  return (
    <div className="flex h-dvh items-center justify-center">
      <SpinnerIcon className="h-6 w-6 text-subtle" />
    </div>
  )
}
