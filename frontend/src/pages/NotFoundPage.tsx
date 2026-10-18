import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import {useTranslation} from 'react-i18next'

export default function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <Stack component="section" spacing={2} sx={{ alignItems: 'center', textAlign: 'center', py: 8 }}>
      <Typography variant="h1" component="h1" color="primary" sx={{ fontSize: '5.5rem', lineHeight: 1 }}>
        404
      </Typography>
      <Typography color="text.secondary">{t('notFound.text')}</Typography>
      <Button href="/" variant="contained">
        {t('notFound.home')}
      </Button>
    </Stack>
  )
}
