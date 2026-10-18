import type {TFunction} from 'i18next'
import type {DayView, NutritionFacts, Week} from '../api/plans'
import type {QuestionnaireResponse} from '../api/questionnaire'
import {isExclusionTag} from '../labels'

/** Excluded foods for display: known tags translated, free text as typed. */
export function excludedFoods(q: QuestionnaireResponse, t: TFunction) {
  return [
    ...q.excludedTags.map((tag) => (isExclusionTag(tag) ? t(`options.exclusion.${tag}`) : tag)),
    q.excludedFreeText,
  ].filter((v): v is string => Boolean(v))
}

export function eatenStats(week: Week) {
  const meals = week.days.flatMap((d) => d.meals)
  return { eaten: meals.filter((m) => m.eaten).length, total: meals.length }
}

/** Local date as the backend's LocalDate ("2026-10-18"). */
function isoToday() {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Today's position in the plan, or the first day if today isn't in it. */
export function todayIndex(week: Week | null) {
  const today = isoToday()
  return Math.max(week?.days.findIndex((d) => d.date === today) ?? 0, 0)
}

export const isDayDone = (day: DayView) => day.meals.length > 0 && day.meals.every((m) => m.eaten)

export const MACROS: { key: keyof NutritionFacts; unit: 'kcal' | 'g' }[] = [
  { key: 'kcal', unit: 'kcal' },
  { key: 'proteinG', unit: 'g' },
  { key: 'fatG', unit: 'g' },
  { key: 'carbsG', unit: 'g' },
]

/** Share of the target reached, in percent; bars cap at 100 and flag anything above 110. */
export function macroProgress(totals: NutritionFacts, targets: NutritionFacts, key: keyof NutritionFacts) {
  const pct = targets[key] > 0 ? (totals[key] / targets[key]) * 100 : 0
  return { pct, fill: Math.min(pct, 100), over: pct > 110 }
}

/** Rows of the daily targets table. */
export const targetRows = (targets: { trainingDay: NutritionFacts; restDay: NutritionFacts }, t: TFunction) => [
  { label: t('common.training'), facts: targets.trainingDay },
  { label: t('common.rest'), facts: targets.restDay },
]

/** Label/value pairs of the "Parameters" panel. */
export function profileFacts(q: QuestionnaireResponse, t: TFunction) {
  const facts: { label: string; value: string }[] = [
    { label: t('profile.facts.goal'), value: t(`options.goal.${q.goal}`) },
    { label: t('profile.facts.age'), value: String(q.age) },
    { label: t('profile.facts.height'), value: `${q.heightCm} ${t('common.cm')}` },
    { label: t('profile.facts.weight'), value: `${q.weightKg} ${t('common.kg')}` },
    { label: t('profile.facts.activity'), value: t(`options.activity.${q.activityLevel}`) },
    { label: t('profile.facts.trainings'), value: t('profile.facts.trainingsValue', { count: q.trainingsPerWeek }) },
    { label: t('profile.facts.meals'), value: t('profile.facts.mealsValue', { count: q.mealsPerDay }) },
    { label: t('profile.facts.cooking'), value: t(`options.cooking.${q.cookingTime}`) },
  ]
  if (q.budgetPerDay != null) {
    facts.push({ label: t('profile.facts.budget'), value: t('profile.facts.budgetValue', { value: q.budgetPerDay }) })
  }
  return facts
}
