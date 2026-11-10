export type Language = 'zh' | 'en'

/** Each language labeled in itself, so it stays recognizable whatever the UI language is. */
export const LANGUAGES: { key: Language; label: string }[] = [
  { key: 'zh', label: '简体中文' },
  { key: 'en', label: 'English' },
]
