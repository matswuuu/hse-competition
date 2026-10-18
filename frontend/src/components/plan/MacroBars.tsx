import {useTranslation} from 'react-i18next'
import type {NutritionFacts} from '@hse/shared/api/plans'
import {round} from '@hse/shared/format'
import {macroProgress, MACROS} from '@hse/shared/profile/summary'

export default function MacroBars({ totals, targets }: { totals: NutritionFacts; targets: NutritionFacts }) {
  const { t } = useTranslation()
  return (
    <div className="macro-bars">
      {MACROS.map(({ key, unit }) => {
        const { fill, over } = macroProgress(totals, targets, key)
        return (
          <div key={key} className="macro">
            <div className="macro-head">
              <span>{t(`plan.macros.${key}`)}</span>
              <span className="macro-value">
                {round(totals[key])} / {round(targets[key])} {t(`common.${unit}`)}
              </span>
            </div>
            <div className="macro-track" role="presentation">
              <div className={`macro-fill${over ? ' over' : ''}`} style={{ width: `${fill}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
