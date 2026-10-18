import {useTranslation} from 'react-i18next'
import type {MealSummary} from '@hse/shared/api/plans'
import {grams, mealMeta} from '@hse/shared/format'
import {hostname, useMealCard} from '@hse/shared/hooks/useMealCard'

interface Props {
  meal: MealSummary
  onEatenChange: (eaten: boolean) => void
  onReplaced: () => void
}

export default function MealCard({ meal, onEatenChange, onReplaced }: Props) {
  const { t } = useTranslation()
  const { open, card, busy, error, toggleOpen, toggleEaten, replace } = useMealCard(meal, onEatenChange, onReplaced)

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
            {mealMeta(meal.facts, meal.cookingTimeMin)}
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
                          {hostname(url)}
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
