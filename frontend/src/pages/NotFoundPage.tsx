import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

export default function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <section>
      <h1>404</h1>
      <p>{t('notFound.text')}</p>
      <Link to="/">{t('notFound.home')}</Link>
    </section>
  )
}
