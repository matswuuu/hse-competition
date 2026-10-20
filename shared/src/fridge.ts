// Fridge helpers shared by the shopping list, the fridge and receipt import.

/** Typical shelf life after purchase, days, per catalog category; prefills the expiry date. */
const SHELF_LIFE_DAYS: Record<string, number> = {
  мясо: 3,
  птица: 2,
  рыба: 2,
  молочные: 7,
  яйца: 25,
  овощи: 7,
  фрукты: 7,
  хлеб: 4,
  крупы: 180,
  бобовые: 180,
  орехи: 90,
  масла: 180,
  прочее: 14,
}

const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const today = () => isoDate(new Date())

/** Suggested best-before date (ISO) for a product bought today. */
export function suggestExpiry(category: string | null | undefined, from = new Date()) {
  const days = SHELF_LIFE_DAYS[category ?? ''] ?? SHELF_LIFE_DAYS['прочее']
  const date = new Date(from)
  date.setDate(date.getDate() + days)
  return isoDate(date)
}

export type ExpiryState = 'expired' | 'today' | 'soon' | 'ok' | 'unknown'

/** "soon" = within 2 days: these are what the menu uses first. */
export function expiryState(daysLeft: number | null): ExpiryState {
  if (daysLeft === null) return 'unknown'
  if (daysLeft < 0) return 'expired'
  if (daysLeft === 0) return 'today'
  if (daysLeft <= 2) return 'soon'
  return 'ok'
}

/** Rounds grams up to a sensible amount to buy: 10 g steps, 50 g above half a kilo. */
export function roundUpGrams(g: number) {
  const step = g > 500 ? 50 : 10
  return Math.max(step, Math.ceil(g / step) * step)
}

/** Money with the ruble sign: "1 234,50 ₽". */
export function rub(value: number, locale: string) {
  return `${value.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₽`
}
