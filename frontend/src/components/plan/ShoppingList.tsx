import { useEffect, useState } from 'react'
import * as plansApi from '@/api/plans'
import type { ShoppingList as ShoppingListData } from '@/api/plans'
import { grams } from './format'

/** Loads on mount; remount (via key) when the plan changes. */
export default function ShoppingList() {
  const [list, setList] = useState<ShoppingListData | null>(null)
  const [error, setError] = useState(false)

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

  if (error) return <p className="form-error">Не удалось загрузить список покупок</p>
  if (!list) return <p className="muted">Загрузка…</p>

  return (
    <div className="shopping-list">
      {list.categories.map((group) => (
        <section key={group.category}>
          <h4>{group.category}</h4>
          <ul className="ingredients">
            {group.items.map((item) => (
              <li key={item.productName}>
                <span>{item.productName}</span>
                <span className="muted">{grams(item.grams)}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
