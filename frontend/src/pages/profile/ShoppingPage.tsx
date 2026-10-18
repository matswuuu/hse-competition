import Card from '@mui/material/Card'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import {useTranslation} from 'react-i18next'
import ShoppingList from '@/components/plan/ShoppingList'
import {useProfile} from '@hse/shared/profile/context'
import FillQuestionnaire from './FillQuestionnaire'

export default function ShoppingPage() {
  const { t } = useTranslation()
  const { questionnaire, week, weekVersion } = useProfile()

  if (!questionnaire) return <FillQuestionnaire />

  return (
    <Card component="section">
      <Stack spacing={2} sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h5" component="h2">
          {t('shopping.title')}
        </Typography>
        {week ? (
          // Remount on plan changes so the list refetches.
          <ShoppingList key={weekVersion} planId={week.planId} />
        ) : (
          <Typography color="text.secondary">
            {t('shopping.noPlan')} <Link href="/profile/plan">{t('profile.toPlan')}</Link>
          </Typography>
        )}
      </Stack>
    </Card>
  )
}
