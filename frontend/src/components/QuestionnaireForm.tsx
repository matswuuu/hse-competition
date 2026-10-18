import type {FormEvent, ReactNode} from 'react'
import {Trans, useTranslation} from 'react-i18next'
import {Link} from 'react-router'
import type {ActivityLevel, QuestionnaireResponse} from '@hse/shared/api/questionnaire'
import {QUESTIONNAIRE_LIMITS as L, useQuestionnaireForm} from '@hse/shared/hooks/useQuestionnaireForm'
import {
    ACTIVITY_VALUES,
    COOKING_VALUES,
    EXCLUSION_TAGS,
    GOAL_VALUES,
    MEALS_PER_DAY_VALUES,
    SEX_VALUES,
} from '@hse/shared/labels'

function Chip({
  type,
  name,
  checked,
  onChange,
  children,
}: {
  type: 'radio' | 'checkbox'
  name: string
  checked: boolean
  onChange: () => void
  children: ReactNode
}) {
  return (
    <label className="chip">
      <input type={type} name={name} checked={checked} onChange={onChange} />
      <span>{children}</span>
    </label>
  )
}

interface Props {
  /** Prefills the form, e.g. with the latest saved questionnaire. */
  initial?: QuestionnaireResponse | null
  submitLabel?: string
  onSubmitted: (saved: QuestionnaireResponse) => void
}

export default function QuestionnaireForm({ initial, submitLabel, onSubmitted }: Props) {
  const { t } = useTranslation()
  const f = useQuestionnaireForm(initial, onSubmitted)

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    void f.submit()
  }

  return (
    <form className="auth-form questionnaire" onSubmit={handleSubmit}>
      <fieldset>
        <legend>{t('questionnaire.sex')}</legend>
        <div className="chips">
          {SEX_VALUES.map((v) => (
            <Chip key={v} type="radio" name="sex" checked={f.sex === v} onChange={() => f.setSex(v)}>
              {t(`options.sex.${v}`)}
            </Chip>
          ))}
        </div>
      </fieldset>

      <div className="field-row">
        <label>
          {t('questionnaire.age')}
          <input type="number" required {...L.age} value={f.age} onChange={(e) => f.setAge(e.target.value)} />
        </label>
        <label>
          {t('questionnaire.height')}
          <input
            type="number"
            required
            {...L.heightCm}
            value={f.heightCm}
            onChange={(e) => f.setHeightCm(e.target.value)}
          />
        </label>
        <label>
          {t('questionnaire.weight')}
          <input
            type="number"
            required
            {...L.weightKg}
            value={f.weightKg}
            onChange={(e) => f.setWeightKg(e.target.value)}
          />
        </label>
      </div>

      <label>
        {t('questionnaire.activity')}
        <select value={f.activityLevel} onChange={(e) => f.setActivityLevel(e.target.value as ActivityLevel)}>
          {ACTIVITY_VALUES.map((v) => (
            <option key={v} value={v}>
              {t(`options.activity.${v}`)}
            </option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend>{t('questionnaire.trainingDays')}</legend>
        <div className="chips chips-week">
          {t('options.weekdays', { returnObjects: true }).map((label, i) => (
            <Chip
              key={i}
              type="checkbox"
              name="trainingDays"
              checked={f.trainingDays.includes(i + 1)}
              onChange={() => f.toggleTrainingDay(i + 1)}
            >
              {label}
            </Chip>
          ))}
        </div>
        <span className="hint">{t('questionnaire.trainingDaysHint')}</span>
      </fieldset>

      <fieldset>
        <legend>{t('questionnaire.goal')}</legend>
        <div className="chips">
          {GOAL_VALUES.map((v) => (
            <Chip key={v} type="radio" name="goal" checked={f.goal === v} onChange={() => f.setGoal(v)}>
              {t(`options.goal.${v}`)}
            </Chip>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>{t('questionnaire.mealsPerDay')}</legend>
        <div className="chips">
          {MEALS_PER_DAY_VALUES.map((n) => (
            <Chip
              key={n}
              type="radio"
              name="mealsPerDay"
              checked={f.mealsPerDay === n}
              onChange={() => f.setMealsPerDay(n)}
            >
              {n}
            </Chip>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>{t('questionnaire.excluded')}</legend>
        <span className="hint notice">{t('questionnaire.excludedNotice')}</span>
        <div className="chips">
          {EXCLUSION_TAGS.map((tag) => (
            <Chip
              key={tag}
              type="checkbox"
              name="excludedTags"
              checked={f.excludedTags.includes(tag)}
              onChange={() => f.toggleExcludedTag(tag)}
            >
              {t(`options.exclusion.${tag}`)}
            </Chip>
          ))}
        </div>
        <input
          placeholder={t('questionnaire.excludedOther')}
          {...L.excludedFreeText}
          value={f.excludedFreeText}
          onChange={(e) => f.setExcludedFreeText(e.target.value)}
        />
      </fieldset>

      <fieldset>
        <legend>{t('questionnaire.cookingTime')}</legend>
        <div className="chips">
          {COOKING_VALUES.map((v) => (
            <Chip
              key={v}
              type="radio"
              name="cookingTime"
              checked={f.cookingTime === v}
              onChange={() => f.setCookingTime(v)}
            >
              {t(`options.cooking.${v}`)}
            </Chip>
          ))}
        </div>
      </fieldset>

      <label>
        {t('questionnaire.budget')}
        <input
          type="number"
          {...L.budgetPerDay}
          placeholder={t('questionnaire.budgetPlaceholder')}
          value={f.budgetPerDay}
          onChange={(e) => f.setBudgetPerDay(e.target.value)}
        />
      </label>

      {f.askConsent && (
        <label className="checkbox">
          <input
            type="checkbox"
            required
            checked={f.consentAgreed}
            onChange={(e) => f.setConsentAgreed(e.target.checked)}
          />
          <span>
            {/* New tab, so the half-filled form isn't lost. */}
            <Trans i18nKey="questionnaire.consent" components={{ link: <Link to="/privacy" target="_blank" /> }} />
          </span>
        </label>
      )}

      {f.error && (
        <p className="form-error" role="alert">
          {f.error}
        </p>
      )}
      <button type="submit" disabled={f.submitting}>
        {f.submitting ? t('questionnaire.saving') : (submitLabel ?? t('questionnaire.submit'))}
      </button>
    </form>
  )
}
