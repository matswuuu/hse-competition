import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import {useEffect, useRef, useState} from 'react'
import {useTranslation} from 'react-i18next'
import type {DayView} from '@hse/shared/api/plans'
import {longDate, shortDate, weekday} from '@hse/shared/format'
import {useProfile} from '@hse/shared/profile/context'
import {isDayDone, todayIndex} from '@hse/shared/profile/summary'
import MacroBars from '@/components/plan/MacroBars'
import MealCard from '@/components/plan/MealCard'
import {md} from '@/theme'
import FillQuestionnaire from './FillQuestionnaire'

const dotSx = { position: 'absolute', top: 6, width: 6, height: 6, borderRadius: '50%' } as const

function DayTab({ day, selected, onClick }: { day: DayView; selected: boolean; onClick: () => void }) {
  const { t } = useTranslation()
  const done = isDayDone(day)
  return (
    <ButtonBase
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      sx={{
        position: 'relative',
        flexDirection: 'column',
        gap: 0.25,
        py: 1.25,
        borderRadius: '16px',
        scrollSnapAlign: 'center',
        border: 1,
        borderColor: selected ? 'transparent' : done ? md('primary') : md('outlineVariant'),
        bgcolor: selected ? md('primary') : 'transparent',
        color: selected ? md('onPrimary') : md('onSurface'),
        transition: 'background-color 150ms',
        '&:hover': { bgcolor: selected ? md('primary') : md('surfaceContainerHigh') },
      }}
    >
      <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
        {weekday(day.date)}
      </Typography>
      <Typography variant="caption" sx={{ opacity: 0.8 }}>
        {shortDate(day.date)}
      </Typography>
      {done && !selected && <CheckCircleIcon sx={{ fontSize: 14, color: md('primary'), position: 'absolute', bottom: -7, bgcolor: md('surface'), borderRadius: '50%' }} />}
      {day.trainingDay && <Box component="span" title={t('common.training')} sx={{ ...dotSx, right: 6, bgcolor: md('tertiary') }} />}
      {!day.withinTolerance && (
        <Box component="span" title={t('plan.outOfTolerance')} sx={{ ...dotSx, left: 6, bgcolor: md('error') }} />
      )}
    </ButtonBase>
  )
}

export default function PlanPage() {
  const { t } = useTranslation()
  const { questionnaire, week, setMealEaten, reloadWeek, generating, generateError, generate } = useProfile()
  const [selectedDay, setSelectedDay] = useState(() => todayIndex(week))
  const dayTabsRef = useRef<HTMLDivElement>(null)

  // On narrow screens the day strip scrolls; keep the selected day visible.
  useEffect(() => {
    dayTabsRef.current
      ?.querySelector<HTMLElement>('[aria-selected="true"]')
      ?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [selectedDay])

  if (!questionnaire) return <FillQuestionnaire />

  async function regenerate() {
    if (await generate()) setSelectedDay(0)
  }

  const day = week?.days[selectedDay]

  return (
    <Stack component="section" spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
        <Typography variant="h5" component="h2">
          {t('plan.title')}
        </Typography>
        {week && (
          <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={regenerate} disabled={generating}>
            {generating ? t('plan.generatingShort') : t('plan.regenerate')}
          </Button>
        )}
      </Stack>

      {generating && (
        <Card role="status" sx={{ bgcolor: md('secondaryContainer'), color: md('onSecondaryContainer') }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', p: 2 }}>
            <CircularProgress size={24} color="inherit" />
            <Typography variant="body2">{t('plan.generating')}</Typography>
          </Stack>
        </Card>
      )}

      {generateError && (
        <Alert severity="error" role="alert">
          {generateError}
        </Alert>
      )}

      {!week && !generating && (
        <Card>
          <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center', px: 3, py: 5 }}>
            <AutoAwesomeIcon sx={{ fontSize: 48, color: md('primary') }} />
            <Typography color="text.secondary">{t('plan.empty')}</Typography>
            <Button variant="contained" size="large" startIcon={<AutoAwesomeIcon />} onClick={regenerate}>
              {t('plan.generate')}
            </Button>
          </Stack>
        </Card>
      )}

      {week && day && (
        <>
          <Box
            role="tablist"
            ref={dayTabsRef}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(7, 3.75rem)', sm: 'repeat(7, minmax(3.5rem, 1fr))' },
              gap: { xs: 0.75, sm: 1 },
              overflowX: 'auto',
              scrollSnapType: 'x proximity',
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
              // Bleed the strip to the screen edges on phones so it scrolls naturally.
              mx: { xs: -2, sm: 0 },
              px: { xs: 2, sm: 0 },
              pb: 1,
              scrollPaddingInline: 16,
            }}
          >
            {week.days.map((d, i) => (
              <DayTab key={d.dayId} day={d} selected={i === selectedDay} onClick={() => setSelectedDay(i)} />
            ))}
          </Box>

          <Card>
            <Stack spacing={2} sx={{ p: { xs: 2, sm: 3 } }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="h6" component="h3" sx={{ '&::first-letter': { textTransform: 'uppercase' } }}>
                  {longDate(day.date)}
                </Typography>
                {day.trainingDay ? (
                  <Chip
                    size="small"
                    icon={<FitnessCenterIcon />}
                    label={t('common.training')}
                    sx={{ bgcolor: md('tertiaryContainer'), color: md('onTertiaryContainer'), '& .MuiChip-icon': { color: 'inherit' } }}
                  />
                ) : (
                  <Chip size="small" variant="outlined" label={t('common.rest')} />
                )}
              </Stack>
              <MacroBars totals={day.totals} targets={day.targets} />
              {!day.withinTolerance && (
                <Alert severity="warning" role="status">
                  {t('plan.toleranceWarning', { pct: day.deviationPct })}
                </Alert>
              )}
              <Stack spacing={1}>
                {day.meals.map((meal) => (
                  <MealCard
                    key={meal.id}
                    meal={meal}
                    onEatenChange={(eaten) => setMealEaten(meal.id, eaten)}
                    onReplaced={reloadWeek}
                  />
                ))}
              </Stack>
            </Stack>
          </Card>
        </>
      )}

      {week && (
        <Card sx={{ bgcolor: md('tertiaryContainer'), color: md('onTertiaryContainer') }}>
          <CardActionArea href="/photo" sx={{ display: 'flex', gap: 2, p: 2, justifyContent: 'flex-start' }}>
            <PhotoCameraOutlinedIcon />
            <Typography variant="body2" sx={{ flex: 1 }}>
              {t('plan.photoTeaser')}
            </Typography>
            <ChevronRightIcon />
          </CardActionArea>
        </Card>
      )}
    </Stack>
  )
}
