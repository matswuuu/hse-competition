import AddIcon from '@mui/icons-material/Add'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import {type FormEvent, useCallback, useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import type {Period, Purchase, Spending as SpendingData} from '@hse/shared/api/purchases'
import * as purchasesApi from '@hse/shared/api/purchases'
import {shortDate} from '@hse/shared/format'
import {rub} from '@hse/shared/fridge'
import {currentLocale} from '@hse/shared/i18n'
import {md} from '@/theme'

const PERIODS: Period[] = ['DAY', 'WEEK', 'MONTH']
const CHART_HEIGHT = 160

const visuallyHidden = {
  // Strings, since sx reads numbers <= 1 as percentages.
  position: 'absolute',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
  p: 0,
  m: '-1px',
} as const

function bucketLabel(period: Period, iso: string, locale: string) {
  const date = new Date(`${iso}T00:00:00`)
  if (period === 'MONTH') return date.toLocaleDateString(locale, { month: 'short' })
  if (period === 'DAY') return String(date.getDate())
  return shortDate(iso)
}

/** Spending over time: one bar per bucket, hover shows the exact amount. */
function SpendingChart({ data }: { data: SpendingData }) {
  const { t } = useTranslation()
  const locale = currentLocale()
  const max = Math.max(...data.buckets.map((b) => b.total), 1)
  // Label every other bucket when there are many, so labels never collide.
  const labelEvery = data.buckets.length > 12 ? 2 : 1

  return (
    <Box role="figure" aria-label={t('spending.chartLabel')}>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: CHART_HEIGHT, borderBottom: 1, borderColor: 'divider' }}>
        {data.buckets.map((b) => (
          <Tooltip key={b.start} title={`${shortDate(b.start)}: ${rub(b.total, locale)}`} placement="top" arrow>
            {/* Full-height hit target; the bar inside is the mark. */}
            <Box sx={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end', cursor: 'default', '&:hover > *': { filter: 'brightness(1.15)' } }}>
              <Box
                sx={{
                  width: '100%',
                  height: b.total > 0 ? `max(${(b.total / max) * 100}%, 2px)` : 0,
                  bgcolor: md('primary'),
                  borderRadius: '4px 4px 0 0',
                }}
              />
            </Box>
          </Tooltip>
        ))}
      </Box>
      <Box sx={{ display: 'flex', gap: '2px', mt: 0.5 }} aria-hidden>
        {data.buckets.map((b, i) => (
          <Typography
            key={b.start}
            variant="caption"
            color="text.secondary"
            sx={{ flex: 1, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'visible', fontSize: 11 }}
          >
            {i % labelEvery === labelEvery - 1 || labelEvery === 1 ? bucketLabel(data.period, b.start, locale) : ''}
          </Typography>
        ))}
      </Box>
      {/* Table view of the same numbers for screen readers. */}
      <Box component="table" sx={visuallyHidden}>
        <tbody>
          {data.buckets.map((b) => (
            <tr key={b.start}>
              <th scope="row">{shortDate(b.start)}</th>
              <td>{rub(b.total, locale)}</td>
            </tr>
          ))}
        </tbody>
      </Box>
    </Box>
  )
}

/** Where the money goes: categories ranked, bar length = share of the period total. */
function CategoryBreakdown({ data }: { data: SpendingData }) {
  const locale = currentLocale()
  const max = data.categories[0]?.total ?? 1
  return (
    <Stack spacing={1.25} component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
      {data.categories.map((c) => (
        <Box component="li" key={c.category}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2, mb: 0.5 }}>
            <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
              {c.category}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {rub(c.total, locale)} · {c.sharePct.toLocaleString(locale)}%
            </Typography>
          </Stack>
          <Box sx={{ height: 8, borderRadius: '4px', bgcolor: md('surfaceContainerHighest') }}>
            <Box sx={{ height: '100%', width: `${(c.total / max) * 100}%`, borderRadius: '4px', bgcolor: md('primary') }} />
          </Box>
        </Box>
      ))}
    </Stack>
  )
}

function ManualExpense({ onAdded }: { onAdded: () => void }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)
  const value = Number(price.replace(',', '.'))

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !(value > 0)) return
    setSaving(true)
    setError(false)
    try {
      await purchasesApi.addManual(name.trim(), value)
      setName('')
      setPrice('')
      setOpen(false)
      onAdded()
    } catch {
      setError(true)
    } finally {
      setSaving(false)
    }
  }

  if (!open)
    return (
      <Button startIcon={<AddIcon />} onClick={() => setOpen(true)} sx={{ alignSelf: 'flex-start' }}>
        {t('spending.manual')}
      </Button>
    )

  return (
    <Stack component="form" onSubmit={submit} spacing={1} noValidate>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <TextField size="small" label={t('spending.manualName')} value={name} onChange={(e) => setName(e.target.value)} fullWidth autoFocus />
        <TextField
          size="small"
          label={t('spending.manualPrice')}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          slotProps={{ htmlInput: { inputMode: 'decimal' } }}
          sx={{ minWidth: 140 }}
        />
        <Button type="submit" variant="contained" disabled={saving || !name.trim() || !(value > 0)}>
          {t('spending.manualAdd')}
        </Button>
      </Stack>
      {error && <Alert severity="error">{t('spending.manualFailed')}</Alert>}
    </Stack>
  )
}

/** Spending analytics per day/week/month and category, plus the latest purchases. */
export default function Spending() {
  const { t } = useTranslation()
  const locale = currentLocale()
  const [period, setPeriod] = useState<Period>('WEEK')
  const [data, setData] = useState<SpendingData | null>(null)
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (p: Period) => {
    try {
      const [spending, recent] = await Promise.all([purchasesApi.spending(p), purchasesApi.recent()])
      setData(spending)
      setPurchases(recent)
      setError(null)
    } catch {
      setError(t('spending.loadFailed'))
    }
  }, [t])

  useEffect(() => {
    let active = true
    Promise.all([purchasesApi.spending(period), purchasesApi.recent()])
      .then(([spending, recent]) => {
        if (!active) return
        setData(spending)
        setPurchases(recent)
        setError(null)
      })
      .catch(() => active && setError(t('spending.loadFailed')))
    return () => void (active = false)
  }, [period, t])

  async function remove(id: number) {
    try {
      await purchasesApi.remove(id)
      await load(period)
    } catch {
      setError(t('spending.deleteFailed'))
    }
  }

  return (
    <Stack spacing={3}>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={period}
        onChange={(_, next: Period | null) => next && setPeriod(next)}
        aria-label={t('spending.title')}
        sx={{ alignSelf: 'flex-start' }}
      >
        {PERIODS.map((p) => (
          <ToggleButton key={p} value={p}>
            {t(`spending.periods.${p}`)}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {error && <Alert severity="error">{error}</Alert>}
      {!data && !error && <LinearProgress />}

      {data && (
        <>
          <Stack direction="row" spacing={4}>
            <div>
              <Typography variant="body2" color="text.secondary">
                {t('spending.total')}
              </Typography>
              <Typography variant="h5" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {rub(data.total, locale)}
              </Typography>
            </div>
            <div>
              <Typography variant="body2" color="text.secondary">
                {t(`spending.average.${data.period}`)}
              </Typography>
              <Typography variant="h5" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {rub(data.averagePerBucket, locale)}
              </Typography>
            </div>
          </Stack>

          {data.total > 0 ? (
            <>
              <SpendingChart data={data} />
              <Stack spacing={1.5}>
                <Typography variant="subtitle1" component="h3">
                  {t('spending.byCategory')}
                </Typography>
                <CategoryBreakdown data={data} />
              </Stack>
            </>
          ) : (
            <Typography color="text.secondary">{t('spending.empty')}</Typography>
          )}
        </>
      )}

      <Stack spacing={1}>
        <Typography variant="subtitle1" component="h3">
          {t('spending.recent')}
        </Typography>
        <ManualExpense onAdded={() => void load(period)} />
        {purchases.length > 0 && (
          <Card variant="outlined">
            <List dense disablePadding>
              {purchases.map((p) => (
                <ListItem
                  key={p.id}
                  divider
                  secondaryAction={
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {rub(p.total, locale)}
                      </Typography>
                      <Tooltip title={t('spending.delete')}>
                        <IconButton edge="end" size="small" aria-label={t('spending.delete')} onClick={() => void remove(p.id)}>
                          <DeleteOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  }
                  sx={{ pr: 16 }}
                >
                  <ListItemText
                    primary={p.store ?? p.items[0]?.name ?? ''}
                    secondary={[
                      new Date(p.purchasedAt).toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
                      p.items.length > 1 ? t('spending.items', { count: p.items.length }) : p.items[0]?.category,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                    slotProps={{ primary: { noWrap: true } }}
                  />
                </ListItem>
              ))}
            </List>
          </Card>
        )}
      </Stack>
    </Stack>
  )
}
