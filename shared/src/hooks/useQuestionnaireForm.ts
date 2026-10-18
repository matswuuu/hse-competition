import {useState} from 'react'
import {useTranslation} from 'react-i18next'
import {isApiError} from '../api/client'
import type {ActivityLevel, CookingTime, Goal, QuestionnaireResponse, Sex} from '../api/questionnaire'
import * as questionnaireApi from '../api/questionnaire'

/** Input limits; mirror the backend's QuestionnaireRequest validation. */
export const QUESTIONNAIRE_LIMITS = {
  age: { min: 14, max: 100 },
  heightCm: { min: 100, max: 250 },
  weightKg: { min: 30, max: 300, step: 0.1 },
  budgetPerDay: { min: 0, step: 10 },
  excludedFreeText: { maxLength: 500 },
} as const

export function toggle<T>(set: T[], value: T) {
  return set.includes(value) ? set.filter((v) => v !== value) : [...set, value]
}

// Accepts a decimal comma, as typed on Russian keyboards.
const parse = (value: string) => (value.trim() === '' ? NaN : Number(value.replace(',', '.')))

const inRange = (value: string, { min, max = Infinity }: { min: number; max?: number }) => {
  const n = parse(value)
  return Number.isFinite(n) && n >= min && n <= max
}

/** All state and the submit logic of the questionnaire form; the markup lives in the frontend. */
export function useQuestionnaireForm(
  initial: QuestionnaireResponse | null | undefined,
  onSubmitted: (saved: QuestionnaireResponse) => void,
) {
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

  async function submit() {
    if (!sex || !goal) {
      setError(t('questionnaire.sexAndGoalRequired'))
      return
    }
    const L = QUESTIONNAIRE_LIMITS
    if (
      !inRange(age, L.age) ||
      !inRange(heightCm, L.heightCm) ||
      !inRange(weightKg, L.weightKg) ||
      (budgetPerDay.trim() !== '' && !inRange(budgetPerDay, L.budgetPerDay)) ||
      !consentAgreed
    ) {
      setError(t('auth.checkFields'))
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const saved = await questionnaireApi.submit({
        sex,
        age: parse(age),
        heightCm: parse(heightCm),
        weightKg: parse(weightKg),
        activityLevel,
        trainingsPerWeek: trainingDays.length,
        trainingDays: [...trainingDays].sort((a, b) => a - b),
        goal,
        mealsPerDay,
        excludedTags,
        excludedFreeText: excludedFreeText.trim() || null,
        cookingTime,
        budgetPerDay: budgetPerDay.trim() ? parse(budgetPerDay) : null,
        consentAgreed,
      })
      setSubmitting(false)
      onSubmitted(saved)
    } catch (err) {
      setError(isApiError(err, 400) ? t('auth.checkFields') : t('questionnaire.saveFailed'))
      setSubmitting(false)
    }
  }

  return {
    sex,
    setSex,
    age,
    setAge,
    heightCm,
    setHeightCm,
    weightKg,
    setWeightKg,
    activityLevel,
    setActivityLevel,
    trainingDays,
    toggleTrainingDay: (day: number) => setTrainingDays((days) => toggle(days, day)),
    goal,
    setGoal,
    mealsPerDay,
    setMealsPerDay,
    excludedTags,
    toggleExcludedTag: (tag: string) => setExcludedTags((tags) => toggle(tags, tag)),
    excludedFreeText,
    setExcludedFreeText,
    cookingTime,
    setCookingTime,
    budgetPerDay,
    setBudgetPerDay,
    /** Asked only on the first submission. */
    askConsent: !initial,
    consentAgreed,
    setConsentAgreed,
    error,
    submitting,
    submit,
  }
}
