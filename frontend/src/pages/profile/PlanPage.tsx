import {useEffect, useRef, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Link} from 'react-router'
import {longDate, shortDate, weekday} from '@hse/shared/format'
import {useProfile} from '@hse/shared/profile/context'
import {isDayDone, todayIndex} from '@hse/shared/profile/summary'
import MacroBars from '@/components/plan/MacroBars'
import MealCard from '@/components/plan/MealCard'
import FillQuestionnaire from './FillQuestionnaire'

export default function PlanPage() {
  const { t } = useTranslation()
  const { questionnaire, week, setMealEaten, reloadWeek, generating, generateError, generate } = useProfile()
  const [selectedDay, setSelectedDay] = useState(() => todayIndex(week))
  const dayTabsRef = useRef<HTMLDivElement>(null)

  // On narrow screens the day strip scrolls; keep the selected day visible.
  useEffect(() => {
    dayTabsRef.current
      ?.querySelector<HTMLElement>('.day-tab.active')
      ?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [selectedDay])

  if (!questionnaire) return <FillQuestionnaire />

  async function regenerate() {
    if (await generate()) setSelectedDay(0)
  }

  const day = week?.days[selectedDay]

  return (
    <section className="plan">
      <div className="panel-head">
        <h2>{t('plan.title')}</h2>
        {week && (
          <div className="plan-actions">
            <button
              type="button"
              className="button button-secondary button-small"
              onClick={regenerate}
              disabled={generating}
            >
              {generating ? t('plan.generatingShort') : t('plan.regenerate')}
            </button>
          </div>
        )}
      </div>

      {generating && (
        <div className="generating" role="status">
          <span className="spinner" aria-hidden />
          <span>{t('plan.generating')}</span>
        </div>
      )}

      {generateError && (
        <p className="form-error" role="alert">
          {generateError}
        </p>
      )}

      {!week && !generating && (
        <div className="panel empty-state">
          <p className="muted">{t('plan.empty')}</p>
          <button type="button" className="button" onClick={regenerate}>
            {t('plan.generate')}
          </button>
        </div>
      )}

      {week && day && (
        <>
          <div className="day-tabs" role="tablist" ref={dayTabsRef}>
            {week.days.map((d, i) => {
              const done = isDayDone(d)
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
                  {d.trainingDay && <span className="day-tab-dot" title={t('common.training')} />}
                  {!d.withinTolerance && <span className="day-tab-warn" title={t('plan.outOfTolerance')} />}
                </button>
              )
            })}
          </div>

          <div className="panel day-panel">
            <div className="panel-head">
              <h3 className="day-title">{longDate(day.date)}</h3>
              <span className={`badge${day.trainingDay ? ' badge-accent' : ''}`}>
                {day.trainingDay ? t('common.training') : t('common.rest')}
              </span>
            </div>
            <MacroBars totals={day.totals} targets={day.targets} />
            {!day.withinTolerance && (
              <p className="tolerance-warning" role="status">
                {t('plan.toleranceWarning', { pct: day.deviationPct })}
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
        <Link to="/photo" className="photo-teaser">
          <span className="badge">{t('common.soon')}</span>
          <span>{t('plan.photoTeaser')}</span>
          <span aria-hidden>→</span>
        </Link>
      )}
    </section>
  )
}
