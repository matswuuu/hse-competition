import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as productsApi from '@/api/products'
import type { ProductSource as Source } from '@/api/products'

// One request per page load; the source never changes at runtime.
let cached: Promise<Source> | null = null
function loadSource() {
  cached ??= productsApi.source().catch((err) => {
    cached = null // allow a retry on the next mount
    throw err
  })
  return cached
}

/** Attribution for the product composition data (§4.4: source must be visible). */
export default function ProductSource({ prefix }: { prefix?: string }) {
  const { t } = useTranslation()
  const [source, setSource] = useState<Source | null>(null)

  useEffect(() => {
    let cancelled = false
    loadSource()
      .then((s) => !cancelled && setSource(s))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

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
