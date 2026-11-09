import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Language } from './locale'

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
    creatorPlaceholder: '输入或选择一位作者',
    expand: '展开',
    collapse: '收起',
    newBadge: '新建',
    cancel: '取消',
    submit: '提交',
    submitted: '提交成功',
    submittedDesc: '视频正在后台下载，完成后会自动加入视频库，可以关闭此窗口。',
    videoUnavailable: '视频不存在或不可访问',
    previewFailed: '解析失败，请稍后再试',
    submitFailed: '提交失败，请稍后再试',
    alreadySubmitted: '这个视频正在下载中',
    jobDownloading: (percent: number | null) => (percent === null ? '等待下载…' : `下载中 ${Math.floor(percent)}%`),
    jobSaving: '正在写入元数据…',
    jobSaved: '已保存到视频库',
    jobFailed: (reason: string) => `失败：${reason}`,
    submitAnother: '继续提交',
    done: '完成',
    editVideo: '编辑视频',
    editVideoDesc: '修改会直接写入视频文件的元数据。',
    save: '保存',
    saveFailed: '保存失败，请稍后再试',
    videoInUse: '视频正在播放，停止播放后再保存',
    deleteVideo: '删除视频',
    confirmDeleteVideo: '再次点击确认删除，文件将被永久移除',
    deleteFailed: '删除失败，请稍后再试',
    videoInUseDelete: '视频正在播放，停止播放后再删除',
    next: '下一个',
    replay: '重新播放',
    updateReady: '新版本已就绪',
    updateNow: '刷新',
    language: '语言',
    catalogLoadFailed: '视频库加载失败',
    retry: '重试',
    loginTitle: '欢迎回来',
    loginDesc: '这是一个私人视频库，请输入访问密码。',
    showPassword: '显示密码',
    hidePassword: '隐藏密码',
    passwordLabel: '密码',
    login: '登录',
    wrongPassword: '密码错误',
    loginFailed: '登录失败，请稍后再试',
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
    creatorPlaceholder: 'Type or pick a creator',
    expand: 'Show options',
    collapse: 'Hide options',
    newBadge: 'New',
    cancel: 'Cancel',
    submit: 'Submit',
    submitted: 'Submitted',
    submittedDesc: 'Downloading in the background. It joins the library when done — you can close this.',
    videoUnavailable: 'This video is unavailable',
    previewFailed: 'Couldn’t fetch details. Try again later',
    submitFailed: 'Submission failed. Try again later',
    alreadySubmitted: 'This video is already downloading',
    jobDownloading: (percent: number | null) =>
      percent === null ? 'Waiting to download…' : `Downloading ${Math.floor(percent)}%`,
    jobSaving: 'Writing metadata…',
    jobSaved: 'Saved to the library',
    jobFailed: (reason: string) => `Failed: ${reason}`,
    submitAnother: 'Another',
    done: 'Done',
    editVideo: 'Edit video',
    editVideoDesc: 'Changes are written into the video file’s metadata.',
    save: 'Save',
    saveFailed: 'Saving failed. Try again later',
    videoInUse: 'The video is playing. Stop it, then save again',
    deleteVideo: 'Delete video',
    confirmDeleteVideo: 'Click again to delete the file permanently',
    deleteFailed: 'Deleting failed. Try again later',
    videoInUseDelete: 'The video is playing. Stop it, then delete again',
    next: 'Up next',
    replay: 'Replay',
    updateReady: 'A new version is ready',
    updateNow: 'Reload',
    language: 'Language',
    catalogLoadFailed: 'Could not load the library',
    retry: 'Retry',
    loginTitle: 'Welcome back',
    loginDesc: 'This is a private library. Enter the password to continue.',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    passwordLabel: 'Password',
    login: 'Log in',
    wrongPassword: 'Wrong password',
    loginFailed: 'Login failed. Try again later',
  },
}

export type TranslationDictionary = (typeof TRANSLATIONS)['zh']

type I18nContextValue = {
  lang: Language
  setLang: (l: Language) => void
  t: TranslationDictionary
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
    }
  }, [lang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used within I18nProvider')
  return context
}
