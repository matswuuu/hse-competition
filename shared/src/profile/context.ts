import {createContext, useContext} from 'react'
import type {DayTargets, Week} from '../api/plans'
import type {QuestionnaireResponse} from '../api/questionnaire'

/** Profile data shared by all profile subpages; loaded once by the profile layout via useProfileData. */
export interface ProfileContextValue {
  /** Null until the user fills in the questionnaire. */
  questionnaire: QuestionnaireResponse | null
  targets: DayTargets | null
  week: Week | null
  /** Bumped on every plan change so dependents (e.g. the shopping list) refetch. */
  weekVersion: number
  setMealEaten: (mealId: number, eaten: boolean) => void
  reloadWeek: () => Promise<void>
  generating: boolean
  generateError: string | null
  /** Resolves to true when a new plan was generated. */
  generate: () => Promise<boolean>
  questionnaireSaved: (questionnaire: QuestionnaireResponse) => Promise<void>
}

export const ProfileContext = createContext<ProfileContextValue | null>(null)

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used within ProfileContext')
  return ctx
}
