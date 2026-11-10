import { useCallback, useId, useState, type ComponentType } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { LANGUAGES } from '@/shared/i18n/locale'
import { VideoFileTable } from '@/feature/catalog/VideoFileTable'
import {
  CheckIcon,
  CloseIcon,
  ExternalLinkIcon,
  GithubIcon,
  GlobeIcon,
  InfoIcon,
  LogoMark,
  SettingIcon,
  VideoIcon,
} from '@/shared/design/icon'
import { Modal } from '@/shared/design/Modal'
import { SPRING } from '@/shared/design/motion'

const GITHUB_URL = 'https://github.com/TecReaGroup/Muvison'

type SettingSection = {
  key: string
  label: 'language' | 'navVideos' | 'about'
  description?: 'languageDesc' | 'videoFilesDesc'
  Icon: typeof GlobeIcon
  Panel: ComponentType
}

// New settings join as entries here: a name on the left, its panel on the right
const SETTING_SECTIONS: SettingSection[] = [
  { key: 'language', label: 'language', description: 'languageDesc', Icon: GlobeIcon, Panel: LanguagePanel },
  { key: 'videos', label: 'navVideos', description: 'videoFilesDesc', Icon: VideoIcon, Panel: VideoFileTable },
  { key: 'about', label: 'about', Icon: InfoIcon, Panel: AboutPanel },
]

/** Header button that opens the settings window. */
export function SettingButton() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t.setting}
        title={t.setting}
        className="flex h-9 w-9 items-center justify-center rounded-xl text-secondary transition-colors duration-200 hover:bg-stone-200/60 hover:text-foreground"
      >
        <SettingIcon className="h-5 w-5" />
      </button>
      <AnimatePresence>{open && <SettingDialog onClose={close} />}</AnimatePresence>
    </>
  )
}

function SettingDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  const headingId = useId()
  const [activeKey, setActiveKey] = useState(SETTING_SECTIONS[0].key)
  const active = SETTING_SECTIONS.find((s) => s.key === activeKey)!

  return (
    <Modal
      labelledBy={headingId}
      onClose={onClose}
      className="flex h-[88dvh] flex-col sm:h-[min(820px,90dvh)] sm:max-w-[min(1360px,94vw)] sm:overflow-hidden"
    >
      <div className="relative flex min-h-0 flex-1 flex-col sm:flex-row">
        <aside className="shrink-0 border-b border-border/70 px-4 pb-3 pt-3 sm:w-60 sm:border-b-0 sm:border-r sm:bg-canvas sm:px-3 sm:py-5">
          <h2 id={headingId} className="px-1 text-lg font-semibold leading-8 tracking-tight sm:mb-4 sm:px-3">
            {t.setting}
          </h2>
          <nav className="mt-3 flex gap-1 rounded-xl bg-stone-100 p-1 sm:mt-0 sm:flex-col sm:bg-transparent sm:p-0">
            {SETTING_SECTIONS.map(({ key, label, Icon }) => {
              const selected = key === activeKey
              return (
                <button
                  key={key}
                  onClick={() => setActiveKey(key)}
                  aria-current={selected ? 'page' : undefined}
                  // Phones: equal-width segmented tabs; desktop: a vertical list
                  className={`relative flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors duration-300 sm:flex-none sm:justify-start sm:gap-3 sm:rounded-xl sm:px-3 ${
                    selected ? 'text-white' : 'text-secondary hover:bg-stone-200/60 hover:text-foreground'
                  }`}
                >
                  {selected && (
                    <motion.span
                      layoutId="setting-nav-pill"
                      transition={SPRING}
                      className="absolute inset-0 rounded-lg bg-foreground sm:rounded-xl"
                    />
                  )}
                  <Icon className="relative h-[18px] w-[18px]" />
                  <span className="relative truncate">{t[label]}</span>
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Sits beside the "Settings" title on phones and at the content's corner on desktop */}
        <button
          onClick={onClose}
          aria-label={t.close}
          className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-subtle transition-colors hover:bg-stone-100 hover:text-foreground sm:right-5 sm:top-5"
        >
          <CloseIcon className="h-5 w-5" />
        </button>

        <section className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-6 pt-4 sm:px-10 sm:pb-8 sm:pt-8">
          {/* Phones already name the section in the selected tab */}
          <h3 className="hidden pr-10 text-xl font-semibold tracking-tight sm:block">{t[active.label]}</h3>
          {active.description && <p className="text-sm text-muted sm:mt-1.5">{t[active.description]}</p>}
          {/* Grows to the remaining height so a panel can center itself in the window */}
          <div className="mt-4 flex flex-1 flex-col sm:mt-6">
            <active.Panel />
          </div>
        </section>
      </div>
    </Modal>
  )
}

function LanguagePanel() {
  const { lang, setLang, t } = useI18n()
  return (
    <div role="radiogroup" aria-label={t.language} className="max-w-md space-y-2">
      {LANGUAGES.map(({ key, label }) => {
        const selected = lang === key
        return (
          <button
            key={key}
            role="radio"
            aria-checked={selected}
            onClick={() => setLang(key)}
            className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm ring-1 transition-[box-shadow,background-color] duration-200 ${
              selected
                ? 'bg-surface font-medium text-foreground ring-stone-400 shadow-[0_4px_16px_rgba(0,0,0,0.06)]'
                : 'text-secondary ring-border hover:bg-surface-muted hover:text-foreground'
            }`}
          >
            <span>{label}</span>
            {selected && <CheckIcon className="h-4 w-4 text-foreground" />}
          </button>
        )
      })}
    </div>
  )
}

function AboutPanel() {
  const { t } = useI18n()
  return (
    <div className="flex flex-1 flex-col items-center justify-center pb-16 text-center">
      <LogoMark className="h-20 w-20" />
      <p className="mt-5 text-3xl font-semibold leading-none tracking-[-0.02em]">
        Mu<span className="text-subtle">Vision</span>
      </p>
      <p className="mt-2.5 text-sm text-muted">{t.appTagline}</p>
      <p className="mt-6 max-w-xl text-[15px] leading-7 text-secondary">{t.appIntro}</p>
      <a
        href={GITHUB_URL}
        target="_blank"
        rel="noreferrer"
        className="mt-8 inline-flex h-11 items-center gap-2.5 rounded-full bg-foreground pl-5 pr-4 text-sm font-medium text-white transition-[transform,box-shadow] duration-200 hover:-translate-y-px hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.45)]"
      >
        <GithubIcon className="h-[18px] w-[18px]" />
        {t.viewOnGithub}
        <ExternalLinkIcon className="h-3.5 w-3.5 text-white/60" />
      </a>
    </div>
  )
}
