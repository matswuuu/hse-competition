import {useTranslation} from 'react-i18next'
import {grams} from '@hse/shared/format'
import {useShoppingList} from '@hse/shared/hooks/useShoppingList'

/** Remount (via key) when the plan changes. */
export default function ShoppingList({ planId }: { planId: number }) {
  const { t } = useTranslation()
  const { list, error, bought, toggle, total, boughtCount } = useShoppingList(planId)

  if (error) return <p className="form-error">{t('shopping.loadFailed')}</p>
  if (!list) return <p className="muted">{t('common.loading')}</p>

  return (
    <>
      <p className="muted">{t('shopping.bought', { bought: boughtCount, total })}</p>
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
