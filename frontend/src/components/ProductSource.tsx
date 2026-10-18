import Link from '@mui/material/Link'
import {useTranslation} from 'react-i18next'
import {useProductSource} from '@hse/shared/hooks/useProductSource'

export default function ProductSource({ prefix }: { prefix?: string }) {
  const { t } = useTranslation()
  const source = useProductSource()

  if (!source) return null
  return (
    <span>
      {prefix ?? t('layout.productSource')}:{' '}
      <Link href={source.url} target="_blank" rel="noreferrer" color="inherit" underline="always">
        {source.name}
      </Link>
    </span>
  )
}
