import {useEffect, useState} from 'react'
import type {ShoppingList} from '../api/plans'
import * as plansApi from '../api/plans'
import {storage} from '../platform'

// "Bought" marks live on the device only (§4.8); keyed by plan so a new plan starts clean.
const storageKey = (planId: number) => `shopping-bought:${planId}`

async function loadBought(planId: number): Promise<Set<string>> {
  try {
    return new Set(JSON.parse((await storage.get(storageKey(planId))) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

/** Loads on mount; remount (via key) when the plan changes so the list refetches. */
export function useShoppingList(planId: number) {
  const [list, setList] = useState<ShoppingList | null>(null)
  const [error, setError] = useState(false)
  const [bought, setBought] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    Promise.all([plansApi.shoppingList(), loadBought(planId)])
      .then(([data, marks]) => {
        if (cancelled) return
        setList(data)
        setBought(marks)
      })
      .catch(() => !cancelled && setError(true))
    return () => {
      cancelled = true
    }
  }, [planId])

  function toggle(productName: string) {
    setBought((prev) => {
      const next = new Set(prev)
      if (!next.delete(productName)) next.add(productName)
      void storage.set(storageKey(planId), JSON.stringify([...next]))
      return next
    })
  }

  const items = list?.categories.flatMap((g) => g.items) ?? []
  const boughtCount = items.filter((i) => bought.has(i.productName)).length

  return { list, error, bought, toggle, total: items.length, boughtCount }
}
