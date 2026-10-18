import {useEffect, useState} from 'react'
import type {ProductSource} from '../api/products'
import * as productsApi from '../api/products'

// One request per app load; the source never changes at runtime.
let cached: Promise<ProductSource> | null = null
function loadSource() {
  cached ??= productsApi.source().catch((err: unknown) => {
    cached = null // allow a retry on the next mount
    throw err
  })
  return cached
}

/** Attribution for the product composition data (§4.4: source must be visible); null until loaded. */
export function useProductSource() {
  const [source, setSource] = useState<ProductSource | null>(null)

  useEffect(() => {
    let cancelled = false
    loadSource()
      .then((s) => !cancelled && setSource(s))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  return source
}
