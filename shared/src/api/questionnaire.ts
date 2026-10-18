import {get, post} from './client'

export type Sex = 'MALE' | 'FEMALE'
export type ActivityLevel = 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'ACTIVE' | 'VERY_ACTIVE'
export type Goal = 'LOSE' | 'MAINTAIN' | 'GAIN'
export type CookingTime = 'UP_TO_20' | 'UP_TO_40' | 'ANY'

export interface QuestionnaireRequest {
  sex: Sex
  age: number
  heightCm: number
  weightKg: number
  activityLevel: ActivityLevel
  trainingsPerWeek: number
  /** 1 = Monday … 7 = Sunday. */
  trainingDays: number[]
  goal: Goal
  mealsPerDay: number
  excludedTags: string[]
  excludedFreeText: string | null
  cookingTime: CookingTime
  budgetPerDay: number | null
  consentAgreed: boolean
}

export interface QuestionnaireResponse extends QuestionnaireRequest {
  id: number
  createdAt: string
}

export const started = () => post<void>('/api/questionnaire/started')

export const submit = (data: QuestionnaireRequest) => post<QuestionnaireResponse>('/api/questionnaire', data)

export const latest = () => get<QuestionnaireResponse>('/api/questionnaire/latest')
