import { useTranslation } from 'react-i18next'
import type { NutritionFacts } from '@/api/plans'
import { round } from './format'

const MACROS: { key: keyof NutritionFacts; unit: 'kcal' | 'g' }[] = [
  { key: 'kcal', unit: 'kcal' },
  { key: 'proteinG', unit: 'g' },
  { key: 'fatG', unit: 'g' },
  { key: 'carbsG', unit: 'g' },
]

export default function MacroBars({ totals, targets }: { totals: NutritionFacts; targets: NutritionFacts }) {
  const { t } = useTranslation()
  return (
    <div className="macro-bars">
      {MACROS.map(({ key, unit }) => {
        const pct = targets[key] > 0 ? (totals[key] / targets[key]) * 100 : 0
        return (
          <div key={key} className="macro">
            <div className="macro-head">
              <span>{t(`plan.macros.${key}`)}</span>
              <span className="macro-value">
                {round(totals[key])} / {round(targets[key])} {t(`common.${unit}`)}
              </span>
            </div>
            <div className="macro-track" role="presentation">
              <div className={`macro-fill${pct > 110 ? ' over' : ''}`} style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
