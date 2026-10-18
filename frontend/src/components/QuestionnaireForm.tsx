import { useState, type FormEvent, type ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { ApiError } from '@/api/client'
import * as questionnaireApi from '@/api/questionnaire'
import type { ActivityLevel, CookingTime, Goal, QuestionnaireResponse, Sex } from '@/api/questionnaire'
import {
  ACTIVITY_VALUES,
  COOKING_VALUES,
  EXCLUSION_TAGS,
  GOAL_VALUES,
  MEALS_PER_DAY_VALUES,
  SEX_VALUES,
} from '@/labels'

function toggle<T>(set: T[], value: T) {
  return set.includes(value) ? set.filter((v) => v !== value) : [...set, value]
}

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
  const [sex, setSex] = useState<Sex | null>(initial?.sex ?? null)
  const [age, setAge] = useState(initial ? String(initial.age) : '')
  const [heightCm, setHeightCm] = useState(initial ? String(initial.heightCm) : '')
  const [weightKg, setWeightKg] = useState(initial ? String(initial.weightKg) : '')
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(initial?.activityLevel ?? 'MODERATE')
  const [trainingDays, setTrainingDays] = useState<number[]>(initial?.trainingDays ?? [])
  const [goal, setGoal] = useState<Goal | null>(initial?.goal ?? null)
  const [mealsPerDay, setMealsPerDay] = useState(initial?.mealsPerDay ?? 3)
  const [excludedTags, setExcludedTags] = useState<string[]>(initial?.excludedTags ?? [])
  const [excludedFreeText, setExcludedFreeText] = useState(initial?.excludedFreeText ?? '')
  const [cookingTime, setCookingTime] = useState<CookingTime>(initial?.cookingTime ?? 'ANY')
  const [budgetPerDay, setBudgetPerDay] = useState(initial?.budgetPerDay != null ? String(initial.budgetPerDay) : '')
  // Consent was already given when the saved questionnaire was submitted.
  const [consentAgreed, setConsentAgreed] = useState(Boolean(initial))
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!sex || !goal) {
      setError(t('questionnaire.sexAndGoalRequired'))
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const saved = await questionnaireApi.submit({
        sex,
        age: Number(age),
        heightCm: Number(heightCm),
        weightKg: Number(weightKg),
        activityLevel,
        trainingsPerWeek: trainingDays.length,
        trainingDays: [...trainingDays].sort((a, b) => a - b),
        goal,
        mealsPerDay,
        excludedTags,
        excludedFreeText: excludedFreeText.trim() || null,
        cookingTime,
        budgetPerDay: budgetPerDay ? Number(budgetPerDay) : null,
        consentAgreed,
      })
      setSubmitting(false)
      onSubmitted(saved)
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 400 ? t('auth.checkFields') : t('questionnaire.saveFailed'),
      )
      setSubmitting(false)
    }
  }

  return (
    <form className="auth-form questionnaire" onSubmit={handleSubmit}>
      <fieldset>
        <legend>{t('questionnaire.sex')}</legend>
        <div className="chips">
          {SEX_VALUES.map((v) => (
            <Chip key={v} type="radio" name="sex" checked={sex === v} onChange={() => setSex(v)}>
              {t(`options.sex.${v}`)}
            </Chip>
          ))}
        </div>
      </fieldset>

      <div className="field-row">
        <label>
          {t('questionnaire.age')}
          <input type="number" required min={14} max={100} value={age} onChange={(e) => setAge(e.target.value)} />
        </label>
        <label>
          {t('questionnaire.height')}
          <input
            type="number"
            required
            min={100}
            max={250}
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
          />
        </label>
        <label>
          {t('questionnaire.weight')}
          <input
            type="number"
            required
            min={30}
            max={300}
            step="0.1"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
          />
        </label>
      </div>

      <label>
        {t('questionnaire.activity')}
        <select value={activityLevel} onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}>
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
              checked={trainingDays.includes(i + 1)}
              onChange={() => setTrainingDays((days) => toggle(days, i + 1))}
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
            <Chip key={v} type="radio" name="goal" checked={goal === v} onChange={() => setGoal(v)}>
              {t(`options.goal.${v}`)}
            </Chip>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>{t('questionnaire.mealsPerDay')}</legend>
        <div className="chips">
          {MEALS_PER_DAY_VALUES.map((n) => (
            <Chip key={n} type="radio" name="mealsPerDay" checked={mealsPerDay === n} onChange={() => setMealsPerDay(n)}>
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
              checked={excludedTags.includes(tag)}
              onChange={() => setExcludedTags((tags) => toggle(tags, tag))}
            >
              {t(`options.exclusion.${tag}`)}
            </Chip>
          ))}
        </div>
        <input
          placeholder={t('questionnaire.excludedOther')}
          maxLength={500}
          value={excludedFreeText}
          onChange={(e) => setExcludedFreeText(e.target.value)}
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
              checked={cookingTime === v}
              onChange={() => setCookingTime(v)}
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
          min={0}
          step="10"
          placeholder={t('questionnaire.budgetPlaceholder')}
          value={budgetPerDay}
          onChange={(e) => setBudgetPerDay(e.target.value)}
        />
      </label>

      {!initial && (
        <label className="checkbox">
          <input type="checkbox" required checked={consentAgreed} onChange={(e) => setConsentAgreed(e.target.checked)} />
          <span>
            {/* New tab, so the half-filled form isn't lost. */}
            <Trans i18nKey="questionnaire.consent" components={{ link: <Link to="/privacy" target="_blank" /> }} />
          </span>
        </label>
      )}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" disabled={submitting}>
        {submitting ? t('questionnaire.saving') : (submitLabel ?? t('questionnaire.submit'))}
      </button>
    </form>
  )
}
