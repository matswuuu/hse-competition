import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '@/api/client'
import * as plansApi from '@/api/plans'
import type { DishCard, MealSummary } from '@/api/plans'
import { grams, round } from './format'

interface Props {
  meal: MealSummary
  onEatenChange: (eaten: boolean) => void
  /** Called after the dish was swapped; day totals change, so the parent reloads. */
  onReplaced: () => void
}

export default function MealCard({ meal, onEatenChange, onReplaced }: Props) {
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
      setError(err instanceof ApiError && err.status === 404 ? t('meal.noReplacement') : t('meal.replaceFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className={`meal-card${meal.eaten ? ' eaten' : ''}`}>
      <div className="meal-main">
        <label className="meal-check" title={meal.eaten ? t('meal.markNotEaten') : t('meal.markEaten')}>
          <input type="checkbox" checked={meal.eaten} onChange={toggleEaten} />
        </label>
        <button type="button" className="meal-summary" onClick={toggleOpen} aria-expanded={open}>
          <span className="meal-type">{t(`options.mealType.${meal.mealType}`)}</span>
          <span className="meal-name">{meal.dishName}</span>
          <span className="meal-meta">
            {round(meal.facts.kcal)} {t('common.kcal')} · {t('common.p')} {round(meal.facts.proteinG)} · {t('common.f')}{' '}
            {round(meal.facts.fatG)} · {t('common.c')} {round(meal.facts.carbsG)} · {meal.cookingTimeMin} {t('common.min')}
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
          {!card && !error && <p className="muted">{t('common.loading')}</p>}
          {card && (
            <>
              <h4>{t('meal.ingredients')}</h4>
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
                  <h4>{t('meal.steps')}</h4>
                  <ol className="recipe-steps">
                    {card.steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </>
              )}
              {card.recipeUrls.length > 0 && (
                <>
                  <h4>{t('meal.recipeLinks')}</h4>
                  <ul className="recipe-links">
                    {card.recipeUrls.map((url) => (
                      <li key={url}>
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          {new URL(url).hostname.replace(/^www\./, '')}
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
          <button type="button" className="button button-secondary button-small" onClick={replace} disabled={busy}>
            {busy ? t('meal.replacing') : t('meal.replace')}
          </button>
        </div>
      )}
    </article>
  )
}
