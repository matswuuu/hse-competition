import { useState } from 'react'
import { ApiError } from '@/api/client'
import * as plansApi from '@/api/plans'
import type { DishCard, MealSummary } from '@/api/plans'
import { MEAL_TYPE_LABELS } from '@/labels'
import { grams, round } from './format'

interface Props {
  meal: MealSummary
  onEatenChange: (eaten: boolean) => void
  /** Called after the dish was swapped; day totals change, so the parent reloads. */
  onReplaced: () => void
}

export default function MealCard({ meal, onEatenChange, onReplaced }: Props) {
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
        setError('Не удалось загрузить рецепт')
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
      setError('Не удалось сохранить отметку')
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
      setError(
        err instanceof ApiError && err.status === 404
          ? 'Не нашлось подходящей замены'
          : 'Не удалось заменить блюдо',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className={`meal-card${meal.eaten ? ' eaten' : ''}`}>
      <div className="meal-main">
        <label className="meal-check" title={meal.eaten ? 'Отметить как не съеденное' : 'Отметить как съеденное'}>
          <input type="checkbox" checked={meal.eaten} onChange={toggleEaten} />
        </label>
        <button type="button" className="meal-summary" onClick={toggleOpen} aria-expanded={open}>
          <span className="meal-type">{MEAL_TYPE_LABELS[meal.mealType]}</span>
          <span className="meal-name">{meal.dishName}</span>
          <span className="meal-meta">
            {round(meal.facts.kcal)} ккал · Б {round(meal.facts.proteinG)} · Ж {round(meal.facts.fatG)} · У{' '}
            {round(meal.facts.carbsG)} · {meal.cookingTimeMin} мин
          </span>
        </button>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {open && (
        <div className="meal-details">
          {!card && !error && <p className="muted">Загрузка…</p>}
          {card && (
            <>
              <h4>Ингредиенты</h4>
              <ul className="ingredients">
                {card.ingredients.map((ing) => (
                  <li key={ing.productName}>
                    <span>{ing.productName}</span>
                    <span className="muted">{grams(ing.grams)}</span>
                  </li>
                ))}
              </ul>
              {card.steps.length > 0 && (
                <>
                  <h4>Приготовление</h4>
                  <ol className="recipe-steps">
                    {card.steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </>
              )}
            </>
          )}
          <button type="button" className="button button-secondary button-small" onClick={replace} disabled={busy}>
            {busy ? 'Подбираем…' : 'Заменить блюдо'}
          </button>
        </div>
      )}
    </article>
  )
}
