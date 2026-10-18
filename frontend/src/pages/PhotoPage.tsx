import AddAPhotoOutlinedIcon from '@mui/icons-material/AddAPhotoOutlined'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import ReplayIcon from '@mui/icons-material/Replay'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import {type ChangeEvent, createElement, useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {macrosLine} from '@hse/shared/format'
import {downscalePhoto, SAMPLE_PLATE, sampleRecognition} from '@hse/shared/photo'
import {isApiError} from '@hse/shared/api/client'
import {type PhotoRecognition, recognize, status} from '@hse/shared/api/photo'
import AuthShell from '@/components/AuthShell'
import {md} from '@/theme'

const previewSx = { display: 'block', width: '100%', maxWidth: 320, aspectRatio: '1', mx: 'auto', borderRadius: '16px', objectFit: 'cover' } as const

function SamplePlate({ label }: { label: string }) {
  return (
    <Box component="svg" viewBox={SAMPLE_PLATE.viewBox} sx={previewSx} role="img" aria-label={label}>
      {SAMPLE_PLATE.shapes.map(({ type, ...attrs }, i) => createElement(type, { key: i, ...attrs }))}
    </Box>
  )
}

export default function PhotoPage() {
  const { t } = useTranslation()
  const names = t('photo.sample', { returnObjects: true })
  // null while the status request is in flight.
  const [available, setAvailable] = useState<boolean | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  const [result, setResult] = useState<PhotoRecognition | null>(null)
  const [isSample, setIsSample] = useState(false)
  const [analysing, setAnalysing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    status()
      .then((s) => active && setAvailable(s.available))
      .catch(() => active && setAvailable(false))
    return () => void (active = false)
  }, [])

  useEffect(() => () => void (photo && URL.revokeObjectURL(photo)), [photo])

  function showSample() {
    setResult(sampleRecognition(names))
    setIsSample(true)
  }

  async function choose(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPhoto(URL.createObjectURL(file))
    setError(null)
    if (!available) {
      showSample()
      return
    }
    setAnalysing(true)
    try {
      setResult(await recognize(await downscalePhoto(file)))
      setIsSample(false)
    } catch (err) {
      setError(
        t(
          isApiError(err, 413) || isApiError(err, 415)
            ? 'photo.badFile'
            : isApiError(err, 503)
              ? 'photo.unavailable'
              : 'photo.failed',
        ),
      )
    } finally {
      setAnalysing(false)
    }
  }

  function reset() {
    setPhoto(null)
    setResult(null)
    setError(null)
  }

  const demo = available === false
  const unmatched = result?.items.some((i) => !i.facts) ?? false

  return (
    <AuthShell
      wide
      title={t('photo.title')}
      lead={t(demo ? 'photo.leadDemo' : 'photo.lead')}
    >
      {demo && <Chip label={t('common.soon')} size="small" color="secondary" sx={{ mb: 2 }} />}

      <Card variant="outlined" sx={{ p: { xs: 2, sm: 3 }, bgcolor: md('surfaceContainerLowest') }}>
        <Stack spacing={2}>
          {photo || result ? (
            photo ? (
              <Box component="img" src={photo} alt={t('photo.chosenAlt')} sx={previewSx} />
            ) : (
              <SamplePlate label={t('photo.sampleAlt')} />
            )
          ) : (
            <Stack
              spacing={2}
              sx={{
                alignItems: 'center',
                textAlign: 'center',
                px: 2,
                py: 5,
                border: 2,
                borderStyle: 'dashed',
                borderColor: md('outlineVariant'),
                borderRadius: '16px',
              }}
            >
              <AddAPhotoOutlinedIcon sx={{ fontSize: 48, color: md('primary') }} />
              <Typography color="text.secondary">{t('photo.choosePrompt')}</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}>
                <Button
                  component="label"
                  variant="contained"
                  startIcon={<AddAPhotoOutlinedIcon />}
                  disabled={available === null}
                >
                  {t('photo.choose')}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    hidden
                    disabled={available === null}
                    onChange={choose}
                  />
                </Button>
                <Button variant="outlined" startIcon={<ImageOutlinedIcon />} onClick={showSample}>
                  {t('photo.showSample')}
                </Button>
              </Stack>
            </Stack>
          )}

          {analysing && (
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">
                {t('photo.analysing')}
              </Typography>
              <LinearProgress />
            </Stack>
          )}
          {error && <Alert severity="error">{error}</Alert>}

          {result && !analysing && (
            <>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 2 }}>
                <Typography variant="h6" component="h3">
                  {t(isSample ? 'photo.resultSample' : 'photo.result')}
                </Typography>
                <Typography variant="h5" color="primary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {Math.round(result.total.kcal)} {t('common.kcal')}
                </Typography>
              </Stack>
              {result.items.length === 0 ? (
                <Typography color="text.secondary">{t('photo.noFood')}</Typography>
              ) : (
                <List dense disablePadding>
                  {result.items.map((i, idx) => (
                    <ListItem
                      key={idx}
                      divider
                      disableGutters
                      secondaryAction={
                        <Typography variant="body2" color="text.secondary">
                          {i.facts ? `${Math.round(i.facts.kcal)} ${t('common.kcal')}` : t('photo.notCounted')}
                        </Typography>
                      }
                    >
                      <ListItemText primary={i.name} secondary={`${i.grams} ${t('common.g')}`} />
                    </ListItem>
                  ))}
                </List>
              )}
              <Typography variant="body2" color="text.secondary">
                {macrosLine(result.total.proteinG, result.total.fatG, result.total.carbsG)}
              </Typography>
              {unmatched && (
                <Typography variant="caption" color="text.secondary">
                  {t('photo.unmatchedNote')}
                </Typography>
              )}
              {!isSample && (
                <Typography variant="caption" color="text.secondary">
                  {t('photo.estimateNote')}
                </Typography>
              )}
            </>
          )}

          {(result || error) && !analysing && (
            <Button variant="outlined" size="small" startIcon={<ReplayIcon />} onClick={reset} sx={{ alignSelf: 'flex-start' }}>
              {t('photo.retry')}
            </Button>
          )}
        </Stack>
      </Card>

      <Button href="/profile/plan" startIcon={<ArrowBackIcon />} sx={{ mt: 2 }}>
        {t('photo.back')}
      </Button>
    </AuthShell>
  )
}
