import {useTranslation} from 'react-i18next'
import {Link} from 'react-router'

/** Empty state for subpages that need a questionnaire first. */
export default function FillQuestionnaire() {
  const { t } = useTranslation()
  return (
    <section className="panel empty-state">
      <h2>{t('profile.fillTitle')}</h2>
      <p className="muted">{t('profile.fillText')}</p>
      <Link to="/profile/data" className="button">
        {t('profile.fillButton')}
      </Link>
    </section>
  )
}
