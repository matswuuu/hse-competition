import {useTranslation} from 'react-i18next'
import {Link} from 'react-router'
import {round} from '@hse/shared/format'
import {useProfile} from '@hse/shared/profile/context'
import {eatenStats, excludedFoods, profileFacts, targetRows} from '@hse/shared/profile/summary'
import Disclaimer from '@/components/Disclaimer'
import FillQuestionnaire from './FillQuestionnaire'

export default function OverviewPage() {
  const { t } = useTranslation()
  const { questionnaire: q, targets, week } = useProfile()

  if (!q || !targets) return <FillQuestionnaire />

  const excluded = excludedFoods(q, t)
  const facts = profileFacts(q, t)

  return (
    <>
      <div className="profile-grid">
        <section className="panel">
          <div className="panel-head">
            <h2>{t('profile.params')}</h2>
            <Link to="/profile/data">{t('profile.edit')}</Link>
          </div>
          <dl className="facts">
            {facts.map(({ label, value }) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
            {excluded.length > 0 && (
              <div className="facts-wide">
                <dt>{t('profile.facts.excluded')}</dt>
                <dd>{excluded.join(', ')}</dd>
              </div>
            )}
          </dl>
        </section>

        <section className="panel">
          <h2>{t('profile.targets')}</h2>
          <table className="targets-table">
            <thead>
              <tr>
                <th />
                <th>{t('common.kcal')}</th>
                <th>{t('common.p')}</th>
                <th>{t('common.f')}</th>
                <th>{t('common.c')}</th>
              </tr>
            </thead>
            <tbody>
              {targetRows(targets, t).map(({ label, facts: row }) => (
                <tr key={label}>
                  <th>{label}</th>
                  <td>{round(row.kcal)}</td>
                  <td>{round(row.proteinG)}</td>
                  <td>{round(row.fatG)}</td>
                  <td>{round(row.carbsG)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {week ? (
            <div className="progress-summary">
              <span className="progress-number">
                {eatenStats(week).eaten}
                <span className="muted"> / {eatenStats(week).total}</span>
              </span>
              <span className="muted">{t('profile.eatenSummary')}</span>
            </div>
          ) : (
            <p className="muted">
              {t('profile.noPlanYet')} <Link to="/profile/plan">{t('profile.toPlan')}</Link>
            </p>
          )}
        </section>
      </div>

      <Disclaimer />
    </>
  )
}
