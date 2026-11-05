import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Language, LocalizedText } from './locale'

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

const TRANSLATIONS = {
  zh: {
    navVideos: '视频',
    navAlbums: '合集',
    navAuthors: '作者',
    search: '搜索视频、合集或作者',
    clear: '清除',
    videoCount: (n: number) => `${n} 个视频`,
    albumCount: (n: number) => `${n} 个合集`,
    authorCount: (n: number) => `${n} 位创作者`,
    videosUnit: '个视频',
    notFound: (q: string) => `没有找到${q ? `与「${q}」` : ''}相关的内容`,
    tryAnother: '换个关键词试试',
    back: '返回',
    backTo: (s: string) => `返回${s}`,
    album: '合集',
    author: '作者',
    viewProfile: '查看主页',
    submitVideo: '提交视频',
    submitDesc: '粘贴 YouTube 链接，自动解析视频信息。',
    urlLabel: 'YouTube 链接',
    parse: '解析',
    invalidUrl: '请输入有效的 YouTube 链接',
    changeLink: '更换链接',
    fieldTitle: '视频名称',
    fieldAuthor: '作者',
    fieldAlbum: '合集',
    albumPlaceholder: '输入或选择一个合集',
    newBadge: '新建',
    cancel: '取消',
    submit: '提交',
    submitted: '提交成功',
    submittedDesc: '感谢分享，视频审核通过后会出现在站点中。',
    submitAnother: '继续提交',
    done: '完成',
    next: '下一个',
    replay: '重新播放',
    play: '播放',
    pause: '暂停',
    mute: '静音',
    unmute: '取消静音',
    fullscreen: '全屏',
    exitFullscreen: '退出全屏',
    speed: '播放速度',
    language: '语言',
  },
  en: {
    navVideos: 'Videos',
    navAlbums: 'Albums',
    navAuthors: 'Creators',
    search: 'Search videos, albums or creators',
    clear: 'Clear',
    videoCount: (n: number) => plural(n, 'video', 'videos'),
    albumCount: (n: number) => plural(n, 'album', 'albums'),
    authorCount: (n: number) => plural(n, 'creator', 'creators'),
    videosUnit: 'videos',
    notFound: (q: string) => (q ? `No results for “${q}”` : 'Nothing found'),
    tryAnother: 'Try a different keyword',
    back: 'Back',
    backTo: (s: string) => `Back to ${s}`,
    album: 'Album',
    author: 'Creator',
    viewProfile: 'View profile',
    submitVideo: 'Submit a video',
    submitDesc: 'Paste a YouTube link and we’ll fetch the details.',
    urlLabel: 'YouTube link',
    parse: 'Fetch',
    invalidUrl: 'Please enter a valid YouTube link',
    changeLink: 'Change link',
    fieldTitle: 'Title',
    fieldAuthor: 'Creator',
    fieldAlbum: 'Album',
    albumPlaceholder: 'Type or pick an album',
    newBadge: 'New',
    cancel: 'Cancel',
    submit: 'Submit',
    submitted: 'Submitted',
    submittedDesc: 'Thanks for sharing. The video will appear once it’s reviewed.',
    submitAnother: 'Another',
    done: 'Done',
    next: 'Up next',
    replay: 'Replay',
    play: 'Play',
    pause: 'Pause',
    mute: 'Mute',
    unmute: 'Unmute',
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit fullscreen',
    speed: 'Playback speed',
    language: 'Language',
  },
}

export type TranslationDictionary = (typeof TRANSLATIONS)['zh']

type I18nContextValue = {
  lang: Language
  setLang: (l: Language) => void
  t: TranslationDictionary
  tr: (l: LocalizedText) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)
const STORAGE_KEY = 'muvision-lang'

const initialLang = (): Language => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'zh' || saved === 'en') return saved
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(initialLang)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang)
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
  }, [lang])

  const value = useMemo<I18nContextValue>(() => {
    return {
      lang,
      setLang,
      t: TRANSLATIONS[lang],
      tr: (l) => l[lang],
    }
  }, [lang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used within I18nProvider')
  return context
}
