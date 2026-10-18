import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ApiError } from '@/api/client'
import * as questionnaireApi from '@/api/questionnaire'
import type { ActivityLevel, CookingTime, Goal, QuestionnaireResponse, Sex } from '@/api/questionnaire'
import { ACTIVITY_OPTIONS, COOKING_OPTIONS, GOAL_OPTIONS, SEX_OPTIONS, WEEKDAYS } from '@/labels'

const MEALS_OPTIONS = [3, 4, 5]

// Lowercase: the backend normalizes tags, so saved values come back this way.
const EXCLUSION_TAGS = ['свинина', 'говядина', 'рыба', 'морепродукты', 'молоко', 'яйца', 'орехи', 'грибы']

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

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

export default function QuestionnaireForm({ initial, submitLabel = 'Готово', onSubmitted }: Props) {
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
      setError('Укажите пол и цель')
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
        err instanceof ApiError && err.status === 400
          ? 'Проверьте правильность заполнения полей'
          : 'Не удалось сохранить анкету. Попробуйте позже',
      )
      setSubmitting(false)
    }
  }

  return (
    <form className="auth-form questionnaire" onSubmit={handleSubmit}>
      <fieldset>
        <legend>Пол</legend>
        <div className="chips">
          {SEX_OPTIONS.map((o) => (
            <Chip key={o.value} type="radio" name="sex" checked={sex === o.value} onChange={() => setSex(o.value)}>
              {o.label}
            </Chip>
          ))}
        </div>
      </fieldset>

      <div className="field-row">
        <label>
          Возраст
          <input type="number" required min={14} max={100} value={age} onChange={(e) => setAge(e.target.value)} />
        </label>
        <label>
          Рост, см
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
          Вес, кг
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
        Уровень активности
        <select value={activityLevel} onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}>
          {ACTIVITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend>Дни тренировок</legend>
        <div className="chips chips-week">
          {WEEKDAYS.map((label, i) => (
            <Chip
              key={label}
              type="checkbox"
              name="trainingDays"
              checked={trainingDays.includes(i + 1)}
              onChange={() => setTrainingDays((days) => toggle(days, i + 1))}
            >
              {label}
            </Chip>
          ))}
        </div>
        <span className="hint">Оставьте пустым, если не тренируетесь</span>
      </fieldset>

      <fieldset>
        <legend>Цель</legend>
        <div className="chips">
          {GOAL_OPTIONS.map((o) => (
            <Chip key={o.value} type="radio" name="goal" checked={goal === o.value} onChange={() => setGoal(o.value)}>
              {o.label}
            </Chip>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Приёмов пищи в день</legend>
        <div className="chips">
          {MEALS_OPTIONS.map((n) => (
            <Chip key={n} type="radio" name="mealsPerDay" checked={mealsPerDay === n} onChange={() => setMealsPerDay(n)}>
              {n}
            </Chip>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Не ем</legend>
        <span className="hint notice">
          Мы не учитываем диагнозы и пищевую аллергию. Если они у вас есть, обсудите рацион с врачом перед
          использованием плана.
        </span>
        <div className="chips">
          {EXCLUSION_TAGS.map((tag) => (
            <Chip
              key={tag}
              type="checkbox"
              name="excludedTags"
              checked={excludedTags.includes(tag)}
              onChange={() => setExcludedTags((tags) => toggle(tags, tag))}
            >
              {capitalize(tag)}
            </Chip>
          ))}
        </div>
        <input
          placeholder="Другое, через запятую"
          maxLength={500}
          value={excludedFreeText}
          onChange={(e) => setExcludedFreeText(e.target.value)}
        />
      </fieldset>

      <fieldset>
        <legend>Время на готовку</legend>
        <div className="chips">
          {COOKING_OPTIONS.map((o) => (
            <Chip
              key={o.value}
              type="radio"
              name="cookingTime"
              checked={cookingTime === o.value}
              onChange={() => setCookingTime(o.value)}
            >
              {o.label}
            </Chip>
          ))}
        </div>
      </fieldset>

      <label>
        Бюджет в день, ₽
        <input
          type="number"
          min={0}
          step="10"
          placeholder="Не ограничен"
          value={budgetPerDay}
          onChange={(e) => setBudgetPerDay(e.target.value)}
        />
      </label>

      {!initial && (
        <label className="checkbox">
          <input type="checkbox" required checked={consentAgreed} onChange={(e) => setConsentAgreed(e.target.checked)} />
          <span>
            Я согласен на обработку персональных данных в соответствии с{' '}
            {/* New tab, so the half-filled form isn't lost. */}
            <Link to="/privacy" target="_blank">
              политикой конфиденциальности
            </Link>
          </span>
        </label>
      )}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Сохранение…' : submitLabel}
      </button>
    </form>
  )
}
