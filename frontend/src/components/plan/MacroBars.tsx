import type { NutritionFacts } from '@/api/plans'
import { round } from './format'

const MACROS: { key: keyof NutritionFacts; label: string; unit: string }[] = [
  { key: 'kcal', label: 'Калории', unit: 'ккал' },
  { key: 'proteinG', label: 'Белки', unit: 'г' },
  { key: 'fatG', label: 'Жиры', unit: 'г' },
  { key: 'carbsG', label: 'Углеводы', unit: 'г' },
]

export default function MacroBars({ totals, targets }: { totals: NutritionFacts; targets: NutritionFacts }) {
  return (
    <div className="macro-bars">
      {MACROS.map(({ key, label, unit }) => {
        const pct = targets[key] > 0 ? (totals[key] / targets[key]) * 100 : 0
        return (
          <div key={key} className="macro">
            <div className="macro-head">
              <span>{label}</span>
              <span className="macro-value">
                {round(totals[key])} / {round(targets[key])} {unit}
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
