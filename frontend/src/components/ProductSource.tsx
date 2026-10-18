import {useTranslation} from 'react-i18next'
import {useProductSource} from '@hse/shared/hooks/useProductSource'

export default function ProductSource({ prefix }: { prefix?: string }) {
  const { t } = useTranslation()
  const source = useProductSource()

  if (!source) return null
  return (
    <span className="product-source">
      {prefix ?? t('layout.productSource')}:{' '}
      <a href={source.url} target="_blank" rel="noreferrer">
        {source.name}
      </a>
    </span>
  )
}
