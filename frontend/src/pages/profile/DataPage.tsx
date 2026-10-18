import {useState} from 'react'
import {useTranslation} from 'react-i18next'
import QuestionnaireForm from '@/components/QuestionnaireForm'
import {useProfile} from '@hse/shared/profile/context'

export default function DataPage() {
  const { t } = useTranslation()
  const { questionnaire, questionnaireSaved } = useProfile()
  const [saved, setSaved] = useState(false)

  return (
    <section className="profile-settings">
      <h2>{t('data.title')}</h2>
      <p className="muted">{t('data.lead')}</p>
      {saved && (
        <p className="form-success" role="status">
          {t('data.saved')}
        </p>
      )}
      <QuestionnaireForm
        // Remount after save so the form reflects what the server stored.
        key={questionnaire?.id ?? 'new'}
        initial={questionnaire}
        submitLabel={t('data.save')}
        onSubmitted={(q) => {
          setSaved(true)
          void questionnaireSaved(q)
        }}
      />
    </section>
  )
}
