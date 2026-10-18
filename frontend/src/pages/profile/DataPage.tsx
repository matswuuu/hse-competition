import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import {useState} from 'react'
import {useTranslation} from 'react-i18next'
import QuestionnaireForm from '@/components/QuestionnaireForm'
import {useProfile} from '@hse/shared/profile/context'

export default function DataPage() {
  const { t } = useTranslation()
  const { questionnaire, questionnaireSaved } = useProfile()
  const [saved, setSaved] = useState(false)

  return (
    <Stack component="section" spacing={2} sx={{ maxWidth: 600 }}>
      <Typography variant="h5" component="h2">
        {t('data.title')}
      </Typography>
      <Typography color="text.secondary">{t('data.lead')}</Typography>
      {saved && (
        <Alert severity="success" role="status" onClose={() => setSaved(false)}>
          {t('data.saved')}
        </Alert>
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
    </Stack>
  )
}
