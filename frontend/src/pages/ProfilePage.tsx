import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router'
import { ApiError } from '@/api/client'
import * as plansApi from '@/api/plans'
import type { DayTargets, Week } from '@/api/plans'
import * as questionnaireApi from '@/api/questionnaire'
import type { QuestionnaireResponse } from '@/api/questionnaire'
import { useAuth } from '@/auth/context'
import MacroBars from '@/components/plan/MacroBars'
import MealCard from '@/components/plan/MealCard'
import ShoppingList from '@/components/plan/ShoppingList'
import WeekOverview from '@/components/plan/WeekOverview'
import Disclaimer from '@/components/Disclaimer'
import { longDate, round, shortDate, weekday } from '@/components/plan/format'
import { ACTIVITY_OPTIONS, COOKING_OPTIONS, GOAL_OPTIONS, labelOf } from '@/labels'

type Profile =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'no-questionnaire' }
  | { status: 'ready'; questionnaire: QuestionnaireResponse; targets: DayTargets; week: Week | null }

/** Resolves to null on 404 (nothing created yet). */
async function orNull<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

// Day + month gives the genitive form ("17 октября"), which reads right after "с".
const memberSince = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })

export default function ProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile>({ status: 'loading' })
  const [selectedDay, setSelectedDay] = useState(0)
  const [view, setView] = useState<'week' | 'day'>('week')
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [showShopping, setShowShopping] = useState(false)
  // Bumped on every plan change so the shopping list refetches.
  const [weekVersion, setWeekVersion] = useState(0)
  const dayTabsRef = useRef<HTMLDivElement>(null)

  // On narrow screens the day strip scrolls; keep the selected day visible.
  useEffect(() => {
    dayTabsRef.current
      ?.querySelector<HTMLElement>('.day-tab.active')
      ?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [selectedDay, profile.status, view])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      try {
        const questionnaire = await orNull(questionnaireApi.latest())
        if (!questionnaire) {
          if (!cancelled) setProfile({ status: 'no-questionnaire' })
          return
        }
        const [targets, week] = await Promise.all([plansApi.targets(), orNull(plansApi.current())])
        if (cancelled) return
        setProfile({ status: 'ready', questionnaire, targets, week })
        if (week) {
          // Open today's day if it is in the plan.
          const today = new Date().toLocaleDateString('sv-SE')
          const idx = week.days.findIndex((d) => d.date === today)
          setSelectedDay(idx >= 0 ? idx : 0)
        }
      } catch {
        if (!cancelled) setProfile({ status: 'error' })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  const setWeek = useCallback((week: Week) => {
    setProfile((p) => (p.status === 'ready' ? { ...p, week } : p))
    setWeekVersion((v) => v + 1)
  }, [])

  const setMealEaten = useCallback((mealId: number, eaten: boolean) => {
    setProfile((p) =>
      p.status === 'ready' && p.week
        ? {
            ...p,
            week: {
              ...p.week,
              days: p.week.days.map((d) => ({
                ...d,
                meals: d.meals.map((m) => (m.id === mealId ? { ...m, eaten } : m)),
              })),
            },
          }
        : p,
    )
  }, [])

  const reloadWeek = useCallback(async () => {
    try {
      setWeek(await plansApi.current())
    } catch {
      // Keep showing the stale week; the card already reported its own error.
    }
  }, [setWeek])

  async function generate() {
    setGenerateError(null)
    setGenerating(true)
    try {
      setWeek(await plansApi.generate())
      setSelectedDay(0)
      setView('week')
      setShowShopping(false)
    } catch (err) {
      setGenerateError(
        err instanceof ApiError && err.status === 422
          ? 'Не удалось составить план с такими ограничениями. Попробуйте убрать часть исключений в настройках'
          : 'Не удалось составить план. Попробуйте позже',
      )
    } finally {
      setGenerating(false)
    }
  }

  if (!user) return <Navigate to="/login" replace state={{ from: '/profile' }} />

  const header = (
    <header className="profile-header">
      <div className="avatar" aria-hidden>
        {user.username.charAt(0).toUpperCase()}
      </div>
      <div>
        <h1>{user.username}</h1>
        <p className="muted">С нами с {memberSince.format(new Date(user.createdAt))}</p>
      </div>
    </header>
  )

  if (profile.status === 'loading') {
    return (
      <div className="profile">
        {header}
        <p className="muted">Загрузка…</p>
      </div>
    )
  }

  if (profile.status === 'error') {
    return (
      <div className="profile">
        {header}
        <p className="form-error" role="alert">
          Не удалось загрузить профиль. Попробуйте позже
        </p>
      </div>
    )
  }

  if (profile.status === 'no-questionnaire') {
    return (
      <div className="profile">
        {header}
        <section className="panel empty-state">
          <h2>Заполните анкету</h2>
          <p className="muted">Без неё мы не сможем рассчитать нормы и составить план питания.</p>
          <Link to="/settings" className="button">
            Заполнить анкету
          </Link>
        </section>
      </div>
    )
  }

  const { questionnaire: q, targets, week } = profile
  const day = week?.days[selectedDay]
  const allMeals = week?.days.flatMap((d) => d.meals) ?? []
  const eatenCount = allMeals.filter((m) => m.eaten).length

  return (
    <div className="profile">
      {header}

      <div className="profile-grid">
        <section className="panel">
          <div className="panel-head">
            <h2>Мои данные</h2>
            <Link to="/settings">Изменить</Link>
          </div>
          <dl className="facts">
            <div>
              <dt>Цель</dt>
              <dd>{labelOf(GOAL_OPTIONS, q.goal)}</dd>
            </div>
            <div>
              <dt>Возраст</dt>
              <dd>{q.age}</dd>
            </div>
            <div>
              <dt>Рост</dt>
              <dd>{q.heightCm} см</dd>
            </div>
            <div>
              <dt>Вес</dt>
              <dd>{q.weightKg} кг</dd>
            </div>
            <div>
              <dt>Активность</dt>
              <dd>{labelOf(ACTIVITY_OPTIONS, q.activityLevel)}</dd>
            </div>
            <div>
              <dt>Тренировки</dt>
              <dd>{q.trainingsPerWeek} в неделю</dd>
            </div>
            <div>
              <dt>Приёмов пищи</dt>
              <dd>{q.mealsPerDay} в день</dd>
            </div>
            <div>
              <dt>Готовка</dt>
              <dd>{labelOf(COOKING_OPTIONS, q.cookingTime)}</dd>
            </div>
            {q.budgetPerDay != null && (
              <div>
                <dt>Бюджет</dt>
                <dd>{q.budgetPerDay} ₽ в день</dd>
              </div>
            )}
            {(q.excludedTags.length > 0 || q.excludedFreeText) && (
              <div className="facts-wide">
                <dt>Не ем</dt>
                <dd>{[...q.excludedTags, q.excludedFreeText].filter(Boolean).join(', ')}</dd>
              </div>
            )}
          </dl>
        </section>

        <section className="panel">
          <h2>Дневные нормы</h2>
          <table className="targets-table">
            <thead>
              <tr>
                <th />
                <th>Ккал</th>
                <th>Б</th>
                <th>Ж</th>
                <th>У</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Тренировка', t: targets.trainingDay },
                { label: 'Отдых', t: targets.restDay },
              ].map(({ label, t }) => (
                <tr key={label}>
                  <th>{label}</th>
                  <td>{round(t.kcal)}</td>
                  <td>{round(t.proteinG)}</td>
                  <td>{round(t.fatG)}</td>
                  <td>{round(t.carbsG)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {week && (
            <div className="progress-summary">
              <span className="progress-number">
                {eatenCount}
                <span className="muted"> / {allMeals.length}</span>
              </span>
              <span className="muted">приёмов пищи отмечено на этой неделе</span>
            </div>
          )}
        </section>
      </div>

      <Disclaimer />

      <section className="plan">
        <div className="panel-head">
          <h2>План на неделю</h2>
          {week && (
            <div className="plan-actions">
              <div className="segmented" role="tablist" aria-label="Вид плана">
                <button type="button" role="tab" aria-selected={view === 'week'} onClick={() => setView('week')}>
                  Неделя
                </button>
                <button type="button" role="tab" aria-selected={view === 'day'} onClick={() => setView('day')}>
                  День
                </button>
              </div>
              <button
                type="button"
                className="button button-secondary button-small"
                onClick={generate}
                disabled={generating}
              >
                {generating ? 'Составляем…' : 'Составить заново'}
              </button>
            </div>
          )}
        </div>

        {generating && (
          <div className="generating" role="status">
            <span className="spinner" aria-hidden />
            <span>Составляем план и пересчитываем КБЖУ по базе продуктов — это может занять до минуты</span>
          </div>
        )}

        {generateError && (
          <p className="form-error" role="alert">
            {generateError}
          </p>
        )}

        {!week && !generating && (
          <div className="panel empty-state">
            <p className="muted">Плана пока нет. Мы составим меню на 7 дней по вашей анкете.</p>
            <button type="button" className="button" onClick={generate}>
              Составить план
            </button>
          </div>
        )}

        {week && view === 'week' && (
          <WeekOverview
            week={week}
            onOpenDay={(i) => {
              setSelectedDay(i)
              setView('day')
            }}
          />
        )}

        {week && day && view === 'day' && (
          <>
            <div className="day-tabs" role="tablist" ref={dayTabsRef}>
              {week.days.map((d, i) => {
                const done = d.meals.length > 0 && d.meals.every((m) => m.eaten)
                return (
                  <button
                    key={d.dayId}
                    type="button"
                    role="tab"
                    aria-selected={i === selectedDay}
                    className={`day-tab${i === selectedDay ? ' active' : ''}${done ? ' done' : ''}`}
                    onClick={() => setSelectedDay(i)}
                  >
                    <span className="day-tab-weekday">{weekday(d.date)}</span>
                    <span className="day-tab-date">{shortDate(d.date)}</span>
                    {d.trainingDay && <span className="day-tab-dot" title="Тренировка" />}
                    {!d.withinTolerance && <span className="day-tab-warn" title="Вне допуска по КБЖУ" />}
                  </button>
                )
              })}
            </div>

            <div className="panel day-panel">
              <div className="panel-head">
                <h3 className="day-title">{longDate(day.date)}</h3>
                <span className={`badge${day.trainingDay ? ' badge-accent' : ''}`}>
                  {day.trainingDay ? 'Тренировка' : 'Отдых'}
                </span>
              </div>
              <MacroBars totals={day.totals} targets={day.targets} />
              {!day.withinTolerance && (
                <p className="tolerance-warning" role="status">
                  КБЖУ дня отличается от цели на {day.deviationPct}% — больше допустимого. Попробуйте заменить блюдо
                  или составить план заново.
                </p>
              )}
              <div className="meals">
                {day.meals.map((meal) => (
                  <MealCard
                    key={meal.id}
                    meal={meal}
                    onEatenChange={(eaten) => setMealEaten(meal.id, eaten)}
                    onReplaced={reloadWeek}
                  />
                ))}
              </div>
            </div>

          </>
        )}

        {week && (
          <>
            <div className="panel">
              <div className="panel-head">
                <h3>Список покупок на неделю</h3>
                <button type="button" className="link-button" onClick={() => setShowShopping((s) => !s)}>
                  {showShopping ? 'Скрыть' : 'Показать'}
                </button>
              </div>
              {/* Remount on plan changes so the list refetches. */}
              {showShopping && <ShoppingList key={weekVersion} planId={week.planId} />}
            </div>
            <Link to="/photo" className="photo-teaser">
              <span className="badge">Скоро</span>
              <span>Расчёт калорий по фото — посмотреть, как это будет работать</span>
              <span aria-hidden>→</span>
            </Link>
          </>
        )}
      </section>
    </div>
  )
}
