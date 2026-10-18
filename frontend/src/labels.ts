import type { ActivityLevel, CookingTime, Goal, Sex } from '@/api/questionnaire'

// Display labels live in the i18n dictionaries under `options.*`, keyed by these values.

export const SEX_VALUES: Sex[] = ['MALE', 'FEMALE']

export const ACTIVITY_VALUES: ActivityLevel[] = ['SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE']

export const GOAL_VALUES: Goal[] = ['LOSE', 'MAINTAIN', 'GAIN']

export const COOKING_VALUES: CookingTime[] = ['UP_TO_20', 'UP_TO_40', 'ANY']

export const MEALS_PER_DAY_VALUES = [3, 4, 5]

// Lowercase Russian: the backend normalizes tags, so saved values come back this way.
export const EXCLUSION_TAGS = ['свинина', 'говядина', 'рыба', 'морепродукты', 'молоко', 'яйца', 'орехи', 'грибы'] as const
export type ExclusionTag = (typeof EXCLUSION_TAGS)[number]

export const isExclusionTag = (tag: string): tag is ExclusionTag => (EXCLUSION_TAGS as readonly string[]).includes(tag)
