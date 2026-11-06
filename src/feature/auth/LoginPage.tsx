import { useId, useState, type FormEvent } from 'react'
import { motion, useAnimationControls } from 'motion/react'
import { ApiError } from '@/shared/http/requestJson'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { LanguageSwitch } from '@/shared/i18n/LanguageSwitch'
import { ArrowRightIcon, EyeIcon, EyeOffIcon, LockIcon, LogoMark, SpinnerIcon } from '@/shared/design/icon'
import { EASE } from '@/shared/design/motion'
import { login } from './authApi'

const SHAKE = { x: [0, -8, 7, -5, 3, 0], transition: { duration: 0.4, ease: EASE } }

export function LoginPage({ onLogin }: { onLogin: () => void }) {
  const { t } = useI18n()
  const inputId = useId()
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const card = useAnimationControls()

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(password)
      onLogin()
    } catch (loginError) {
      setError(loginError instanceof ApiError && loginError.status === 401 ? t.wrongPassword : t.loginFailed)
      setLoading(false)
      void card.start(SHAKE)
    }
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between px-4 md:h-16 md:px-6">
        <div className="flex items-center gap-2.5">
          <LogoMark className="h-8 w-8" />
          <span className="text-[18px] font-semibold leading-none tracking-[-0.02em]">
            Mu<span className="text-subtle">Vision</span>
          </span>
        </div>
        <LanguageSwitch />
      </header>

      {/* Bottom padding lifts the card slightly above center, where the eye rests first */}
      <main className="flex flex-1 items-center justify-center px-4 pb-[12vh]">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
          className="w-full max-w-[400px]"
        >
          <motion.form
            animate={card}
            onSubmit={submit}
            className="rounded-2xl bg-surface px-6 py-7 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_40px_rgba(0,0,0,0.06)] ring-1 ring-border/80 sm:px-8 sm:py-9"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
              <LockIcon className="h-5 w-5" />
            </span>
            <h1 className="mt-5 text-[22px] font-semibold leading-tight tracking-[-0.02em]">{t.loginTitle}</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">{t.loginDesc}</p>

            <label htmlFor={inputId} className="mb-2 mt-7 block text-[13px] font-medium text-stone-700">
              {t.passwordLabel}
            </label>
            <div
              className={`flex h-12 items-center rounded-xl bg-surface-muted pl-4 pr-1.5 ring-1 transition-[box-shadow,background-color] focus-within:bg-surface ${
                error ? 'ring-red-300' : 'ring-border focus-within:ring-stone-400'
              }`}
            >
              <input
                id={inputId}
                autoFocus
                type={visible ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (error) setError('')
                }}
                aria-invalid={!!error}
                aria-describedby={error ? `${inputId}-error` : undefined}
                className="h-full min-w-0 flex-1 bg-transparent text-base tracking-wide outline-none sm:text-[15px]"
              />
              <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                aria-label={visible ? t.hidePassword : t.showPassword}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-stone-100 hover:text-stone-700"
              >
                {visible ? <EyeOffIcon className="h-[18px] w-[18px]" /> : <EyeIcon className="h-[18px] w-[18px]" />}
              </button>
            </div>
            {/* Fixed-height slot so the error never shifts the button */}
            <p id={`${inputId}-error`} role="alert" className="mt-2 h-5 text-[13px] text-red-500">
              {error}
            </p>

            <button type="submit" disabled={!password || loading} className="button-primary mt-3 h-12 w-full gap-2">
              {loading ? (
                <SpinnerIcon className="h-4 w-4" />
              ) : (
                <>
                  {t.login}
                  <ArrowRightIcon className="h-4 w-4" />
                </>
              )}
            </button>
          </motion.form>
        </motion.div>
      </main>
    </div>
  )
}
