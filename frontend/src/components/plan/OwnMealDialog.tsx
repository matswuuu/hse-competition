import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import ReplayIcon from '@mui/icons-material/Replay'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import {type FormEvent, useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {isApiError} from '@hse/shared/api/client'
import {describe, type PhotoRecognition, recognize, status} from '@hse/shared/api/photo'
import {type NutritionFacts, replaceWithCustom} from '@hse/shared/api/plans'
import {macrosLine} from '@hse/shared/format'
import {PLATE_MAX_SIDE} from '@hse/shared/photo'
import PhotoButton from '@/components/fridge/PhotoButton'

/** A recognized food with the portion the user may correct; КБЖУ scales with it. */
interface DraftItem {
  name: string
  productName: string | null
  /** Recognized portion as eaten; `grams` is the user's (possibly edited) value. */
  recognizedGrams: number
  grams: string
  productGrams: number | null
  facts: NutritionFacts | null
}

const parseGrams = (value: string) => {
  const n = Number(value.replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

const ratio = (item: DraftItem) => (parseGrams(item.grams) ?? 0) / item.recognizedGrams

/**
 * Replaces a planned meal with what the user actually ate: described in words or photographed,
 * recognized by the model, reviewed here, then saved. The server recomputes КБЖУ from the product DB.
 */
export default function OwnMealDialog({
  open,
  mealId,
  plannedDish,
  onClose,
  onSaved,
}: {
  open: boolean
  mealId: number
  plannedDish: string
  onClose: () => void
  onSaved: () => void
}) {
  // Content unmounts on close, so each opening starts from scratch.
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <OwnMealContent mealId={mealId} plannedDish={plannedDish} onClose={onClose} onSaved={onSaved} />
    </Dialog>
  )
}

function OwnMealContent({
  mealId,
  plannedDish,
  onClose,
  onSaved,
}: {
  mealId: number
  plannedDish: string
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const [available, setAvailable] = useState<boolean | null>(null)
  const [text, setText] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dishName, setDishName] = useState('')
  const [items, setItems] = useState<DraftItem[] | null>(null)
  const [eaten, setEaten] = useState(true)

  useEffect(() => {
    let active = true
    status()
      .then((s) => active && setAvailable(s.available))
      .catch(() => active && setAvailable(false))
    return () => void (active = false)
  }, [])

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview])

  async function run(request: () => Promise<PhotoRecognition>, fallbackName: string) {
    setError(null)
    setBusy(true)
    try {
      const result = await request()
      if (result.items.length === 0) {
        setError(t('ownMeal.noFood'))
        return
      }
      setDishName(result.dishName ?? fallbackName)
      setItems(
        result.items.map((i) => ({
          name: i.name,
          productName: i.productName,
          recognizedGrams: i.grams,
          grams: String(Math.round(i.grams)),
          productGrams: i.productGrams,
          facts: i.facts,
        })),
      )
    } catch (err) {
      setError(
        t(
          isApiError(err, 413) || isApiError(err, 415)
            ? 'photo.badFile'
            : isApiError(err, 503)
              ? 'ownMeal.unavailable'
              : 'ownMeal.failed',
        ),
      )
    } finally {
      setBusy(false)
    }
  }

  function submitText(e: FormEvent) {
    e.preventDefault()
    const description = text.trim()
    if (description) void run(() => describe(description), description.slice(0, 60))
  }

  function photographed(photo: Blob, file: File) {
    setPreview(URL.createObjectURL(file))
    void run(() => recognize(photo), '')
  }

  function startOver() {
    setItems(null)
    setError(null)
    setPreview(null)
  }

  const updateGrams = (idx: number, grams: string) =>
    setItems((prev) => prev && prev.map((item, i) => (i === idx ? { ...item, grams } : item)))
  const removeItem = (idx: number) => setItems((prev) => prev && prev.filter((_, i) => i !== idx))

  const total = (items ?? []).reduce(
    (acc, item) => {
      if (!item.facts) return acc
      const r = ratio(item)
      return {
        kcal: acc.kcal + item.facts.kcal * r,
        proteinG: acc.proteinG + item.facts.proteinG * r,
        fatG: acc.fatG + item.facts.fatG * r,
        carbsG: acc.carbsG + item.facts.carbsG * r,
      }
    },
    { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0 },
  )
  const valid =
    !!items && items.length > 0 && dishName.trim().length > 0 && items.every((i) => parseGrams(i.grams) !== null)

  async function save() {
    if (!items || !valid) return
    setSaving(true)
    setError(null)
    try {
      await replaceWithCustom(mealId, {
        dishName: dishName.trim(),
        // The server counts КБЖУ from dry/raw grams, so the edited portion is scaled onto them.
        items: items.map((i) => ({
          name: i.name,
          productName: i.productName,
          grams: Math.max(1, Math.min(2000, Math.round((i.productGrams ?? i.recognizedGrams) * ratio(i)))),
        })),
        eaten,
      })
      onSaved()
    } catch {
      setError(t('ownMeal.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <DialogTitle>{t('ownMeal.title', { dish: plannedDish })}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {available === false && <Alert severity="info">{t('ownMeal.unavailable')}</Alert>}

          {!items && (
            <>
              <Typography variant="body2" color="text.secondary">
                {t('ownMeal.lead')}
              </Typography>
              <Stack component="form" spacing={1.5} onSubmit={submitText} noValidate>
                <TextField
                  label={t('ownMeal.describeLabel')}
                  placeholder={t('ownMeal.describePlaceholder')}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  multiline
                  minRows={2}
                  disabled={busy || !available}
                  slotProps={{ htmlInput: { maxLength: 1000 } }}
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<AutoAwesomeOutlinedIcon />}
                    disabled={busy || !available || text.trim().length === 0}
                  >
                    {t('ownMeal.recognize')}
                  </Button>
                  <PhotoButton
                    variant="outlined"
                    onPhoto={photographed}
                    disabled={busy || !available}
                    maxSide={PLATE_MAX_SIDE}
                  >
                    {t('ownMeal.photo')}
                  </PhotoButton>
                </Stack>
              </Stack>
            </>
          )}

          {preview && (
            <Box
              component="img"
              src={preview}
              alt=""
              sx={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: '16px' }}
            />
          )}

          {busy && (
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">
                {t('ownMeal.analysing')}
              </Typography>
              <LinearProgress />
            </Stack>
          )}

          {items && (
            <>
              <TextField
                label={t('ownMeal.name')}
                value={dishName}
                onChange={(e) => setDishName(e.target.value)}
                required
                slotProps={{ htmlInput: { maxLength: 200 } }}
              />
              <Stack divider={<Divider flexItem />} spacing={1}>
                {items.map((item, idx) => (
                  <Stack key={idx} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2">{item.name}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {item.facts
                          ? `${Math.round(item.facts.kcal * ratio(item))} ${t('common.kcal')}`
                          : t('meal.notCounted')}
                      </Typography>
                    </Box>
                    <TextField
                      size="small"
                      label={t('ownMeal.portion')}
                      value={item.grams}
                      onChange={(e) => updateGrams(idx, e.target.value)}
                      error={parseGrams(item.grams) === null}
                      sx={{ width: 104 }}
                      slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                    />
                    <IconButton
                      aria-label={t('ownMeal.remove', { name: item.name })}
                      onClick={() => removeItem(idx)}
                      disabled={items.length === 1}
                    >
                      <DeleteOutlinedIcon />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 2 }}>
                <Typography variant="subtitle1">{t('ownMeal.total')}</Typography>
                <Typography variant="h6" component="p" color="primary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {Math.round(total.kcal)} {t('common.kcal')}
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {macrosLine(total.proteinG, total.fatG, total.carbsG)}
              </Typography>
              {items.some((i) => !i.facts) && (
                <Typography variant="caption" color="text.secondary">
                  {t('ownMeal.unmatchedNote')}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                {t('ownMeal.estimateNote')}
              </Typography>
              <FormControlLabel
                control={<Checkbox checked={eaten} onChange={(e) => setEaten(e.target.checked)} />}
                label={t('ownMeal.eaten')}
              />
            </>
          )}

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        {(items || preview) && !busy && (
          <Button startIcon={<ReplayIcon />} onClick={startOver} disabled={saving} sx={{ mr: 'auto' }}>
            {t('ownMeal.again')}
          </Button>
        )}
        <Button onClick={onClose} disabled={saving}>
          {t('ownMeal.cancel')}
        </Button>
        {items && (
          <Button variant="contained" onClick={save} disabled={!valid || saving}>
            {saving ? t('ownMeal.saving') : t('ownMeal.save')}
          </Button>
        )}
      </DialogActions>
    </>
  )
}
