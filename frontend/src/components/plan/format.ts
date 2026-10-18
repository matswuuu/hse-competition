import i18n, { currentLocale } from '@/i18n'

// Formatters are cached per locale and rebuilt when the language changes.
const cache = new Map<string, Intl.DateTimeFormat>()
function dateFormat(key: string, options: Intl.DateTimeFormatOptions) {
  const id = `${currentLocale()}:${key}`
  let f = cache.get(id)
  if (!f) {
    f = new Intl.DateTimeFormat(currentLocale(), options)
    cache.set(id, f)
  }
  return f
}

// Backend sends LocalDate ("2026-10-18"); parse as local midnight, not UTC.
const parseDate = (iso: string) => new Date(`${iso}T00:00:00`)

export const weekday = (iso: string) => dateFormat('weekday', { weekday: 'short' }).format(parseDate(iso))
export const shortDate = (iso: string) =>
  dateFormat('short', { day: 'numeric', month: 'short' }).format(parseDate(iso))
export const longDate = (iso: string) =>
  dateFormat('long', { weekday: 'long', day: 'numeric', month: 'long' }).format(parseDate(iso))

export const round = (n: number) => Math.round(n)

export function grams(g: number) {
  return g >= 1000
    ? `${(g / 1000).toLocaleString(currentLocale(), { maximumFractionDigits: 1 })} ${i18n.t('common.kg')}`
    : `${round(g)} ${i18n.t('common.g')}`
}
