import QrCodeScannerOutlinedIcon from '@mui/icons-material/QrCodeScannerOutlined'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import {useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {isApiError} from '@hse/shared/api/client'
import * as pantryApi from '@hse/shared/api/pantry'
import {type PurchaseItem, type ReceiptImport, receiptPhoto, receiptQr, status} from '@hse/shared/api/purchases'
import {rub, suggestExpiry} from '@hse/shared/fridge'
import {currentLocale} from '@hse/shared/i18n'
import PhotoButton from './PhotoButton'

interface Row {
  selected: boolean
  grams: string
  expiresAt: string
}

function errorKey(err: unknown) {
  if (isApiError(err, 400)) return 'receipt.errors.notQr'
  if (isApiError(err, 422)) return 'receipt.errors.invalid'
  if (isApiError(err, 409)) return 'receipt.errors.notYet'
  if (isApiError(err, 429)) return 'receipt.errors.limit'
  if (isApiError(err, 503)) return 'receipt.unavailable'
  return 'receipt.errors.failed'
}

/**
 * Receipt by its QR code: the purchase lands in spending, and the food lines the user picks go
 * to the fridge with amounts and best-before dates.
 */
export default function ReceiptDialog({
  open,
  onClose,
  onAdded,
}: {
  open: boolean
  onClose: () => void
  /** Products were added to the fridge (and/or spending changed). */
  onAdded: () => void
}) {
  // The dialog unmounts its content when closed, so every import starts from scratch.
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <ReceiptContent onClose={onClose} onAdded={onAdded} />
    </Dialog>
  )
}

function ReceiptContent({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const { t } = useTranslation()
  const [available, setAvailable] = useState<boolean | null>(null)
  const [qr, setQr] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imported, setImported] = useState<ReceiptImport | null>(null)
  const [rows, setRows] = useState<Record<number, Row>>({})

  useEffect(() => {
    let active = true
    status()
      .then((s) => active && setAvailable(s.receiptsAvailable))
      .catch(() => active && setAvailable(false))
    return () => void (active = false)
  }, [])

  async function load(call: () => Promise<ReceiptImport>) {
    setBusy(true)
    setError(null)
    try {
      const result = await call()
      setImported(result)
      setRows(
        Object.fromEntries(
          result.purchase.items.map((i) => [
            i.id,
            {
              selected: i.food && !result.duplicate,
              grams: i.grams ? String(Math.round(i.grams)) : '',
              expiresAt: suggestExpiry(i.category, new Date(result.purchase.purchasedAt)),
            },
          ]),
        ),
      )
      onAdded()
    } catch (err) {
      setError(t(errorKey(err)))
    } finally {
      setBusy(false)
    }
  }

  const setRow = (id: number, patch: Partial<Row>) => setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))

  const items = imported?.purchase.items ?? []
  const chosen = items.filter((i) => rows[i.id]?.selected)
  const valid = chosen.every((i) => Number(rows[i.id].grams.replace(',', '.')) > 0)

  async function addToFridge() {
    setBusy(true)
    setError(null)
    try {
      await pantryApi.addAll(
        chosen.map((i: PurchaseItem) => ({
          productId: i.productId,
          name: i.productId ? null : i.name,
          grams: Number(rows[i.id].grams.replace(',', '.')),
          expiresAt: rows[i.id].expiresAt || null,
          source: 'RECEIPT' as const,
        })),
      )
      onAdded()
      onClose()
    } catch {
      setError(t('fridge.form.saveFailed'))
    } finally {
      setBusy(false)
    }
  }

  const locale = currentLocale()

  return (
    <>
      <DialogTitle>{t('receipt.title')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {available === false && <Alert severity="info">{t('receipt.unavailable')}</Alert>}

          {!imported && available && (
            <>
              <Typography variant="body2" color="text.secondary">
                {t('receipt.lead')}
              </Typography>
              <PhotoButton
                startIcon={<QrCodeScannerOutlinedIcon />}
                disabled={busy}
                onPhoto={(photo) => void load(() => receiptPhoto(photo))}
              >
                {t('receipt.choose')}
              </PhotoButton>
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                {t('receipt.orManual')}
              </Typography>
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  fullWidth
                  label={t('receipt.qrLabel')}
                  placeholder="t=20261018T1942&s=349.93&fn=…&i=…&fp=…&n=1"
                  value={qr}
                  onChange={(e) => setQr(e.target.value)}
                />
                <Button variant="outlined" disabled={busy || !qr.trim()} onClick={() => void load(() => receiptQr(qr.trim()))}>
                  {t('receipt.load')}
                </Button>
              </Stack>
            </>
          )}

          {busy && !imported && (
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">
                {t('receipt.loading')}
              </Typography>
              <LinearProgress />
            </Stack>
          )}
          {error && <Alert severity="error">{error}</Alert>}

          {imported && (
            <>
              {imported.duplicate && <Alert severity="info">{t('receipt.duplicate')}</Alert>}
              <div>
                <Typography variant="subtitle1">{imported.purchase.store ?? t('receipt.title')}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {new Date(imported.purchase.purchasedAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })}
                  {' · '}
                  {t('receipt.total', { total: rub(imported.purchase.total, locale) })}
                </Typography>
              </div>
              <Typography variant="subtitle2">{t('receipt.pickTitle')}</Typography>
              <Stack spacing={1.5}>
                {items.map((i) => {
                  const row = rows[i.id]
                  return (
                    <Stack key={i.id} spacing={1} sx={{ opacity: i.food ? 1 : 0.6 }}>
                      <Stack direction="row" sx={{ alignItems: 'flex-start', gap: 1 }}>
                        <Checkbox
                          checked={!!row?.selected}
                          disabled={!i.food}
                          onChange={(e) => setRow(i.id, { selected: e.target.checked })}
                          slotProps={{ input: { 'aria-label': i.name } }}
                          sx={{ mt: -1, ml: -1 }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                            {i.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {[i.productName, i.food ? i.category : t('receipt.nonFood')].filter(Boolean).join(' · ')}
                          </Typography>
                        </div>
                        <Typography variant="body2" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                          {rub(i.sum, locale)}
                        </Typography>
                      </Stack>
                      {row?.selected && (
                        <Stack direction="row" spacing={1} sx={{ pl: 4 }}>
                          <TextField
                            size="small"
                            label={t('fridge.form.grams')}
                            value={row.grams}
                            onChange={(e) => setRow(i.id, { grams: e.target.value })}
                            error={!(Number(row.grams.replace(',', '.')) > 0)}
                            slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                          />
                          <TextField
                            size="small"
                            type="date"
                            label={t('fridge.form.expiresAt')}
                            value={row.expiresAt}
                            onChange={(e) => setRow(i.id, { expiresAt: e.target.value })}
                            slotProps={{ inputLabel: { shrink: true } }}
                          />
                        </Stack>
                      )}
                    </Stack>
                  )
                })}
              </Stack>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          {imported ? t('receipt.skip') : t('fridge.form.cancel')}
        </Button>
        {imported && (
          <Button variant="contained" disabled={busy || chosen.length === 0 || !valid} onClick={() => void addToFridge()}>
            {t('receipt.addSelected', { count: chosen.length })}
          </Button>
        )}
      </DialogActions>
    </>
  )
}
