import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined'
import DocumentScannerOutlinedIcon from '@mui/icons-material/DocumentScannerOutlined'
import ReplayIcon from '@mui/icons-material/Replay'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import {type FormEvent, useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {isApiError} from '@hse/shared/api/client'
import {createFromLabel, type Product, type ProductScan, scan, scanStatus} from '@hse/shared/api/products'
import {macrosLine} from '@hse/shared/format'
import {md} from '@/theme'
import PhotoButton from './PhotoButton'

const MACROS = ['kcal', 'protein', 'fat', 'carbs'] as const
type Macro = (typeof MACROS)[number]

const parse = (value: string) => (value.trim() === '' ? null : Number(value.replace(',', '.')))

/**
 * Product from a photo of its package: barcode or recognition first; an unknown product is named
 * by the user from a photo of its label (or typed-in macros) and saved as their own.
 */
export default function ProductScanDialog({
  open,
  onClose,
  onFound,
}: {
  open: boolean
  onClose: () => void
  /** The product to add to the fridge. */
  onFound: (product: Product) => void
}) {
  // The dialog unmounts its content when closed, so every scan starts from scratch.
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <ScanContent onClose={onClose} onFound={onFound} />
    </Dialog>
  )
}

function ScanContent({ onClose, onFound }: { onClose: () => void; onFound: (product: Product) => void }) {
  const { t } = useTranslation()
  const [vision, setVision] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ProductScan | null>(null)
  const [name, setName] = useState('')
  const [label, setLabel] = useState<Blob | null>(null)
  const [macros, setMacros] = useState<Record<Macro, string>>({ kcal: '', protein: '', fat: '', carbs: '' })

  useEffect(() => {
    let active = true
    scanStatus()
      .then((s) => active && setVision(s.visionAvailable))
      .catch(() => active && setVision(false))
    return () => void (active = false)
  }, [])

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview])

  async function photographed(photo: Blob, file: File) {
    setPreview(URL.createObjectURL(file))
    setError(null)
    setResult(null)
    setBusy(true)
    try {
      const found = await scan(photo)
      setResult(found)
      setName(found.suggestedName ?? '')
    } catch (err) {
      setError(t(isApiError(err, 413) || isApiError(err, 415) ? 'photo.badFile' : 'scan.failed'))
    } finally {
      setBusy(false)
    }
  }

  const typed = Object.fromEntries(MACROS.map((m) => [m, parse(macros[m])])) as Record<Macro, number | null>
  const macrosComplete = MACROS.every((m) => typed[m] !== null && typed[m]! >= 0)
  const canCreate = name.trim().length > 0 && (macrosComplete || (vision && !!label))

  async function create(e: FormEvent) {
    e.preventDefault()
    if (!canCreate) return
    setBusy(true)
    setError(null)
    try {
      const product = await createFromLabel({ name: name.trim(), barcode: result?.barcode, ...typed }, label)
      onFound(product)
    } catch (err) {
      setError(t(isApiError(err, 422) ? 'scan.needMacros' : 'fridge.form.saveFailed'))
    } finally {
      setBusy(false)
    }
  }

  const found = result?.status === 'FOUND' ? result.product : null
  const needLabel = result?.status === 'NEED_LABEL'

  return (
    <>
      <DialogTitle>{t('scan.title')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {!result && (
            <Typography variant="body2" color="text.secondary">
              {t(vision ? 'scan.lead' : 'scan.leadBarcodeOnly')}
            </Typography>
          )}
          {preview && (
            <Box
              component="img"
              src={preview}
              alt=""
              sx={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: '16px' }}
            />
          )}
          {!result && !busy && (
            <PhotoButton onPhoto={photographed}>{t('scan.choose')}</PhotoButton>
          )}
          {busy && (
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">
                {t(needLabel ? 'scan.creating' : 'scan.analysing')}
              </Typography>
              <LinearProgress />
            </Stack>
          )}
          {error && <Alert severity="error">{error}</Alert>}

          {found && (
            <Card variant="outlined" sx={{ p: 2, bgcolor: md('surfaceContainerLowest') }}>
              <Stack spacing={0.5}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: md('primary') }}>
                  <CheckCircleOutlineIcon fontSize="small" />
                  <Typography variant="subtitle2">
                    {t('scan.found')} {t(`scan.via.${result!.via}`)}
                  </Typography>
                </Stack>
                <Typography variant="h6" component="p">
                  {found.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {Math.round(found.kcalPer100g)} {t('common.kcal')} ·{' '}
                  {macrosLine(found.proteinPer100g, found.fatPer100g, found.carbsPer100g)} · {t('scan.per100')}
                </Typography>
              </Stack>
            </Card>
          )}

          {needLabel && (
            <Stack component="form" id="label-form" spacing={2} onSubmit={create} noValidate>
              <div>
                <Typography variant="subtitle1">{t('scan.unknownTitle')}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {t(vision ? 'scan.unknownLead' : 'scan.unknownLeadManual')}
                </Typography>
                {result?.barcode && (
                  <Typography variant="caption" color="text.secondary">
                    {t('scan.barcode', { code: result.barcode })}
                  </Typography>
                )}
              </div>
              <TextField label={t('scan.name')} value={name} onChange={(e) => setName(e.target.value)} required />
              {vision && (
                <PhotoButton
                  variant={label ? 'text' : 'outlined'}
                  startIcon={label ? <CheckCircleOutlineIcon /> : <DocumentScannerOutlinedIcon />}
                  onPhoto={(photo) => setLabel(photo)}
                  disabled={busy}
                >
                  {t(label ? 'scan.labelChosen' : 'scan.labelPhoto')}
                </PhotoButton>
              )}
              <div>
                <Typography variant="subtitle2">{t('scan.macrosTitle')}</Typography>
                {vision && (
                  <Typography variant="caption" color="text.secondary">
                    {t('scan.macrosHint')}
                  </Typography>
                )}
              </div>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                {MACROS.map((m) => (
                  <TextField
                    key={m}
                    size="small"
                    label={t(`scan.${m}`)}
                    value={macros[m]}
                    onChange={(e) => setMacros((prev) => ({ ...prev, [m]: e.target.value }))}
                    slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                  />
                ))}
              </Box>
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        {result && !busy && (
          <Box sx={{ mr: 'auto' }}>
            <PhotoButton variant="text" startIcon={<ReplayIcon />} onPhoto={photographed}>
              {t('scan.retry')}
            </PhotoButton>
          </Box>
        )}
        <Button onClick={onClose} disabled={busy}>
          {t('fridge.form.cancel')}
        </Button>
        {found && (
          <Button variant="contained" onClick={() => onFound(found)}>
            {t('scan.useProduct')}
          </Button>
        )}
        {needLabel && (
          <Button type="submit" form="label-form" variant="contained" disabled={!canCreate || busy}>
            {t('scan.create')}
          </Button>
        )}
      </DialogActions>
    </>
  )
}
