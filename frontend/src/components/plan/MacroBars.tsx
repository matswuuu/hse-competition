import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'
import {useTranslation} from 'react-i18next'
import type {NutritionFacts} from '@hse/shared/api/plans'
import {round} from '@hse/shared/format'
import {macroProgress, MACROS} from '@hse/shared/profile/summary'

export default function MacroBars({ totals, targets }: { totals: NutritionFacts; targets: NutritionFacts }) {
  const { t } = useTranslation()
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))' },
        gap: 2,
      }}
    >
      {MACROS.map(({ key, unit }) => {
        const { fill, over } = macroProgress(totals, targets, key)
        return (
          <div key={key}>
            <Typography variant="subtitle2">{t(`plan.macros.${key}`)}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
              {round(totals[key])} / {round(targets[key])} {t(`common.${unit}`)}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={fill}
              color={over ? 'warning' : 'primary'}
              aria-label={t(`plan.macros.${key}`)}
              sx={{ mt: 0.75 }}
            />
          </div>
        )
      })}
    </Box>
  )
}
