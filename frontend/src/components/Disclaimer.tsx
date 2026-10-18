import { useTranslation } from 'react-i18next'

/** Mandatory on-screen notice (§2, §5): informational only, no diagnoses or allergies in the MVP. */
export default function Disclaimer() {
  const { t } = useTranslation()
  return (
    <aside className="disclaimer" role="note">
      <strong>{t('disclaimer.strong')}</strong> {t('disclaimer.rest')}
    </aside>
  )
}
