import type { ActivityLevel, CookingTime, Goal, Sex } from '@/api/questionnaire'
import type { MealType } from '@/api/plans'

export const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'MALE', label: 'Мужской' },
  { value: 'FEMALE', label: 'Женский' },
]

export const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string }[] = [
  { value: 'SEDENTARY', label: 'Сидячий образ жизни' },
  { value: 'LIGHT', label: 'Лёгкая активность' },
  { value: 'MODERATE', label: 'Умеренная активность' },
  { value: 'ACTIVE', label: 'Высокая активность' },
  { value: 'VERY_ACTIVE', label: 'Очень высокая активность' },
]

export const GOAL_OPTIONS: { value: Goal; label: string }[] = [
  { value: 'LOSE', label: 'Похудеть' },
  { value: 'MAINTAIN', label: 'Поддерживать вес' },
  { value: 'GAIN', label: 'Набрать массу' },
]

export const COOKING_OPTIONS: { value: CookingTime; label: string }[] = [
  { value: 'UP_TO_20', label: 'До 20 минут' },
  { value: 'UP_TO_40', label: 'До 40 минут' },
  { value: 'ANY', label: 'Не важно' },
]

export const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  BREAKFAST: 'Завтрак',
  SNACK: 'Перекус',
  LUNCH: 'Обед',
  SNACK_2: 'Второй перекус',
  DINNER: 'Ужин',
}

export const labelOf = <T>(options: { value: T; label: string }[], value: T) =>
  options.find((o) => o.value === value)?.label ?? String(value)
