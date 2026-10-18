import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import Alert from '@mui/material/Alert'
import {useTranslation} from 'react-i18next'

/** Mandatory on-screen notice (§2, §5): informational only, no diagnoses or allergies in the MVP. */
export default function Disclaimer() {
  const { t } = useTranslation()
  return (
    <Alert severity="warning" icon={<InfoOutlinedIcon />} role="note">
      <strong>{t('disclaimer.strong')}</strong> {t('disclaimer.rest')}
    </Alert>
  )
}
