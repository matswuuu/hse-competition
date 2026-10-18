import i18n, {currentLocale} from './i18n'

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

/** "Б 12 г · Ж 5 г · У 30 г"; units are omitted when `withUnits` is false. */
export function macrosLine(p: number, f: number, c: number, withUnits = true) {
  const g = withUnits ? ` ${i18n.t('common.g')}` : ''
  return [
    `${i18n.t('common.p')} ${round(p)}${g}`,
    `${i18n.t('common.f')} ${round(f)}${g}`,
    `${i18n.t('common.c')} ${round(c)}${g}`,
  ].join(' · ')
}

/** One-line meal summary: "520 ккал · Б 30 · Ж 12 · У 60 · 20 мин". */
export const mealMeta = (facts: { kcal: number; proteinG: number; fatG: number; carbsG: number }, minutes: number) =>
  [
    `${round(facts.kcal)} ${i18n.t('common.kcal')}`,
    macrosLine(facts.proteinG, facts.fatG, facts.carbsG, false),
    `${minutes} ${i18n.t('common.min')}`,
  ].join(' · ')
