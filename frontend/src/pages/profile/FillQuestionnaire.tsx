import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import {useTranslation} from 'react-i18next'
import {md} from '@/theme'

/** Empty state for subpages that need a questionnaire first. */
export default function FillQuestionnaire() {
  const { t } = useTranslation()
  return (
    <Card component="section">
      <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center', px: 3, py: 5 }}>
        <AssignmentOutlinedIcon sx={{ fontSize: 48, color: md('primary') }} />
        <Typography variant="h5" component="h2">
          {t('profile.fillTitle')}
        </Typography>
        <Typography color="text.secondary">{t('profile.fillText')}</Typography>
        <Button href="/profile/data" variant="contained" sx={{ mt: 1 }}>
          {t('profile.fillButton')}
        </Button>
      </Stack>
    </Card>
  )
}
