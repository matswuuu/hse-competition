import {useTranslation} from 'react-i18next'
import {Link} from 'react-router'
import ShoppingList from '@/components/plan/ShoppingList'
import {useProfile} from '@hse/shared/profile/context'
import FillQuestionnaire from './FillQuestionnaire'

export default function ShoppingPage() {
  const { t } = useTranslation()
  const { questionnaire, week, weekVersion } = useProfile()

  if (!questionnaire) return <FillQuestionnaire />

  return (
    <section className="panel">
      <h2>{t('shopping.title')}</h2>
      {week ? (
        // Remount on plan changes so the list refetches.
        <ShoppingList key={weekVersion} planId={week.planId} />
      ) : (
        <p className="muted">
          {t('shopping.noPlan')} <Link to="/profile/plan">{t('profile.toPlan')}</Link>
        </p>
      )}
    </section>
  )
}
