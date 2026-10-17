const dayFormat = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' })
const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })
const longDateFormat = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })

// Backend sends LocalDate ("2026-10-18"); parse as local midnight, not UTC.
const parseDate = (iso: string) => new Date(`${iso}T00:00:00`)

export const weekday = (iso: string) => dayFormat.format(parseDate(iso))
export const shortDate = (iso: string) => dateFormat.format(parseDate(iso))
export const longDate = (iso: string) => longDateFormat.format(parseDate(iso))

export const round = (n: number) => Math.round(n)

export function grams(g: number) {
  return g >= 1000 ? `${(g / 1000).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} кг` : `${round(g)} г`
}
