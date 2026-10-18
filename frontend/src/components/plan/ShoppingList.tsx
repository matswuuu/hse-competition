import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as plansApi from '@/api/plans'
import type { ShoppingList as ShoppingListData } from '@/api/plans'
import { grams } from './format'

// "Bought" marks live in the browser only (§4.8); keyed by plan so a new plan starts clean.
const storageKey = (planId: number) => `shopping-bought:${planId}`

function loadBought(planId: number): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(storageKey(planId)) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

function saveBought(planId: number, bought: Set<string>) {
  try {
    localStorage.setItem(storageKey(planId), JSON.stringify([...bought]))
  } catch {
    // Storage full or blocked: marks just won't survive a reload.
  }
}

/** Loads on mount; remount (via key) when the plan changes. */
export default function ShoppingList({ planId }: { planId: number }) {
  const { t } = useTranslation()
  const [list, setList] = useState<ShoppingListData | null>(null)
  const [error, setError] = useState(false)
  const [bought, setBought] = useState(() => loadBought(planId))

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

  function toggle(productName: string) {
    setBought((prev) => {
      const next = new Set(prev)
      if (!next.delete(productName)) next.add(productName)
      saveBought(planId, next)
      return next
    })
  }

  if (error) return <p className="form-error">{t('shopping.loadFailed')}</p>
  if (!list) return <p className="muted">{t('common.loading')}</p>

  const items = list.categories.flatMap((g) => g.items)
  const boughtCount = items.filter((i) => bought.has(i.productName)).length

  return (
    <>
      <p className="muted">{t('shopping.bought', { bought: boughtCount, total: items.length })}</p>
      <div className="shopping-list">
        {list.categories.map((group) => (
          <section key={group.category}>
            <h4>{group.category}</h4>
            <ul className="ingredients">
              {group.items.map((item) => (
                <li key={item.productName} className={bought.has(item.productName) ? 'bought' : undefined}>
                  <label className="shopping-item">
                    <input
                      type="checkbox"
                      checked={bought.has(item.productName)}
                      onChange={() => toggle(item.productName)}
                    />
                    <span>{item.productName}</span>
                  </label>
                  <span className="muted">{grams(item.grams)}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  )
}
