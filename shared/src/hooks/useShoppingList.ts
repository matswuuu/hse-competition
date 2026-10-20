import {useCallback, useEffect, useState} from 'react'
import type {ShoppingList} from '../api/plans'
import * as plansApi from '../api/plans'

/**
 * Shopping list netted against the fridge: an item is done once the fridge covers it, so
 * "bought" means adding it to the fridge. Remount (via key) when the plan changes.
 */
export function useShoppingList() {
  const [list, setList] = useState<ShoppingList | null>(null)
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    try {
      setList(await plansApi.shoppingList())
      setError(false)
    } catch {
      setError(true)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    plansApi
      .shoppingList()
      .then((data) => !cancelled && setList(data))
      .catch(() => !cancelled && setError(true))
    return () => {
      cancelled = true
    }
  }, [])

  async function mutate(call: () => Promise<ShoppingList>) {
    setBusy(true)
    try {
      setList(await call())
      return true
    } catch {
      return false
    } finally {
      setBusy(false)
    }
  }

  const dismiss = (productId: number) => mutate(() => plansApi.dismissShoppingItem(productId))
  const restore = (productId: number) => mutate(() => plansApi.restoreShoppingItem(productId))

  const items = list?.categories.flatMap((g) => g.items) ?? []
  const covered = items.filter((i) => i.toBuyGrams <= 0).length

  return { list, error, busy, reload, dismiss, restore, total: items.length, covered }
}
