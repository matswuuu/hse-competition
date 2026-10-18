import {useCallback, useEffect, useMemo, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {ApiError, isApiError} from '../api/client'
import type {DayTargets, Week} from '../api/plans'
import * as plansApi from '../api/plans'
import type {QuestionnaireResponse} from '../api/questionnaire'
import * as questionnaireApi from '../api/questionnaire'
import type {User} from '../api/users'
import type {ProfileContextValue} from './context'

type Data =
  | { status: 'loading' }
  | { status: 'error' }
  | {
      status: 'ready'
      questionnaire: QuestionnaireResponse | null
      targets: DayTargets | null
      week: Week | null
    }

/** Resolves to null on 404 (nothing created yet). */
async function orNull<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

/**
 * Loads the profile for `user` and keeps it in sync with plan changes. `value` is null while
 * loading or after an error; provide it through ProfileContext once ready.
 */
export function useProfileData(user: User | null) {
  const { t } = useTranslation()
  const [data, setData] = useState<Data>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [weekVersion, setWeekVersion] = useState(0)
  // Lives in the layout, not a subpage, so leaving the plan mid-generation doesn't drop the result.
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      try {
        const questionnaire = await orNull(questionnaireApi.latest())
        const [targets, week] = questionnaire
          ? await Promise.all([plansApi.targets(), orNull(plansApi.current())])
          : [null, null]
        if (!cancelled) setData({ status: 'ready', questionnaire, targets, week })
      } catch {
        if (!cancelled) setData({ status: 'error' })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, attempt])

  const retry = useCallback(() => {
    setData({ status: 'loading' })
    setAttempt((a) => a + 1)
  }, [])

  const setWeek = useCallback((week: Week) => {
    setData((d) => (d.status === 'ready' ? { ...d, week } : d))
    setWeekVersion((v) => v + 1)
  }, [])

  const setMealEaten = useCallback((mealId: number, eaten: boolean) => {
    setData((d) =>
      d.status === 'ready' && d.week
        ? {
            ...d,
            week: {
              ...d.week,
              days: d.week.days.map((day) => ({
                ...day,
                meals: day.meals.map((m) => (m.id === mealId ? { ...m, eaten } : m)),
              })),
            },
          }
        : d,
    )
  }, [])

  const reloadWeek = useCallback(async () => {
    try {
      setWeek(await plansApi.current())
    } catch {
      // Keep showing the stale week; the card already reported its own error.
    }
  }, [setWeek])

  const generate = useCallback(async () => {
    setGenerateError(null)
    setGenerating(true)
    try {
      setWeek(await plansApi.generate())
      return true
    } catch (err) {
      setGenerateError(isApiError(err, 422) ? t('plan.generateConstraint') : t('plan.generateFailed'))
      return false
    } finally {
      setGenerating(false)
    }
  }, [setWeek, t])

  const questionnaireSaved = useCallback(async (questionnaire: QuestionnaireResponse) => {
    setData((d) => (d.status === 'ready' ? { ...d, questionnaire } : d))
    // Targets are derived from the questionnaire; the existing plan stays until regenerated.
    try {
      const [targets, week] = await Promise.all([plansApi.targets(), orNull(plansApi.current())])
      setData((d) => (d.status === 'ready' ? { ...d, targets, week } : d))
    } catch {
      // Stale targets are shown until the next load.
    }
  }, [])

  const value = useMemo<ProfileContextValue | null>(
    () =>
      data.status === 'ready'
        ? {
            questionnaire: data.questionnaire,
            targets: data.targets,
            week: data.week,
            weekVersion,
            setMealEaten,
            reloadWeek,
            generating,
            generateError,
            generate,
            questionnaireSaved,
          }
        : null,
    [data, weekVersion, setMealEaten, reloadWeek, generating, generateError, generate, questionnaireSaved],
  )

  return { status: data.status, value, retry }
}
