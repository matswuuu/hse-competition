import i18n from 'i18next'
import {initReactI18next} from 'react-i18next'
import {storage} from '../platform'
import en from './en'
import ru from './ru'

export const resources = { ru: { translation: ru }, en: { translation: en } } as const

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: { translation: typeof ru }
  }
}

export const LANGUAGES = ['ru', 'en'] as const
export type Language = (typeof LANGUAGES)[number]

const STORAGE_KEY = 'lang'

const isLanguage = (lng: string | null | undefined): lng is Language => (LANGUAGES as readonly string[]).includes(lng ?? '')

/**
 * Starts i18next with the language picked earlier, else the first supported one of `preferred`
 * (BCP 47 tags from the browser or device, most preferred first). Render only after it resolves.
 */
export async function initI18n(preferred: readonly string[]) {
  const saved = await storage.get(STORAGE_KEY)
  const detected = preferred.map((tag) => tag.split('-')[0].toLowerCase()).find(isLanguage)
  await i18n.use(initReactI18next).init({
    resources,
    lng: isLanguage(saved) ? saved : (detected ?? 'ru'),
    fallbackLng: 'ru',
    supportedLngs: LANGUAGES,
    interpolation: { escapeValue: false }, // React already escapes
  })
}

export async function setLanguage(lng: Language) {
  await i18n.changeLanguage(lng)
  await storage.set(STORAGE_KEY, lng)
}

/** Current UI language, narrowed to the supported set. */
export const currentLanguage = (): Language => (i18n.resolvedLanguage === 'en' ? 'en' : 'ru')

/** BCP 47 locale for Intl formatters. */
export const currentLocale = () => (currentLanguage() === 'en' ? 'en-GB' : 'ru-RU')

export default i18n
