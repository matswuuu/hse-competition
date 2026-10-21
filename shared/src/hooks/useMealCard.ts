import {useState} from 'react'
import {useTranslation} from 'react-i18next'
import {isApiError} from '../api/client'
import type {DishCard, MealSummary} from '../api/plans'
import * as plansApi from '../api/plans'

/** "www.example.com/a?b" → "example.com", for recipe link labels. */
export const hostname = (url: string) =>
  url
    .replace(/^\w+:\/\//, '')
    .replace(/^www\./, '')
    .split(/[/?#:]/)[0]

/**
 * Expand/collapse with lazy recipe loading, the optimistic "eaten" toggle and dish replacement.
 * `onReplaced` fires after a swap; day totals change, so the parent reloads the week.
 */
export function useMealCard(meal: MealSummary, onEatenChange: (eaten: boolean) => void, onReplaced: () => void) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [card, setCard] = useState<DishCard | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function toggleOpen() {
    const next = !open
    setOpen(next)
    if (next && !card) {
      try {
        setCard(await plansApi.dish(meal.id))
      } catch {
        setError(t('meal.recipeFailed'))
      }
    }
  }

  async function toggleEaten() {
    setError(null)
    onEatenChange(!meal.eaten)
    try {
      await plansApi.setEaten(meal.id, !meal.eaten)
    } catch {
      onEatenChange(meal.eaten)
      setError(t('meal.eatenFailed'))
    }
  }

  async function replace() {
    setError(null)
    setBusy(true)
    try {
      await plansApi.replace(meal.id)
      setCard(null)
      setOpen(false)
      onReplaced()
    } catch (err) {
      setError(isApiError(err, 404) ? t('meal.noReplacement') : t('meal.replaceFailed'))
    } finally {
      setBusy(false)
    }
  }

  /** After the meal was swapped for the user's own one. */
  function replacedWithOwn() {
    setError(null)
    setCard(null)
    setOpen(false)
    onReplaced()
  }

  return { open, card, busy, error, toggleOpen, toggleEaten, replace, replacedWithOwn }
}
