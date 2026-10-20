import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import {type FormEvent, useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import type {NewPantryItem, PantrySource} from '@hse/shared/api/pantry'
import {type Product, search} from '@hse/shared/api/products'
import {suggestExpiry} from '@hse/shared/fridge'

export type ProductRef = Pick<Product, 'id' | 'name' | 'category'>

/** What the dialog opens with; `itemId` switches it to editing an existing fridge item. */
export interface FridgeDraft {
  itemId?: number
  product?: ProductRef | null
  name?: string
  grams?: number
  expiresAt?: string | null
  source?: PantrySource
}

export interface FridgeDialogResult {
  item: NewPantryItem
  itemId?: number
}

/** Add-to-fridge form (product, amount, best-before date, optional price) and the edit form. */
export default function FridgeItemDialog({
  draft,
  onClose,
  onSubmit,
}: {
  /** Null keeps the dialog closed. */
  draft: FridgeDraft | null
  onClose: () => void
  onSubmit: (result: FridgeDialogResult) => Promise<void>
}) {
  // Keeps showing the last draft while the dialog fades out.
  const [shown, setShown] = useState(draft)
  const [version, setVersion] = useState(0)
  if (draft && draft !== shown) {
    setShown(draft)
    setVersion((v) => v + 1)
  }

  return (
    <Dialog open={!!draft} onClose={onClose} fullWidth maxWidth="xs">
      {/* Keyed per draft: each one starts with a fresh form. */}
      {shown && <FridgeItemForm key={version} draft={shown} onClose={onClose} onSubmit={onSubmit} />}
    </Dialog>
  )
}

function FridgeItemForm({
  draft,
  onClose,
  onSubmit,
}: {
  draft: FridgeDraft
  onClose: () => void
  onSubmit: (result: FridgeDialogResult) => Promise<void>
}) {
  const { t } = useTranslation()
  const editing = draft.itemId !== undefined
  const [product, setProduct] = useState<ProductRef | string | null>(draft.product ?? draft.name ?? null)
  const [query, setQuery] = useState(draft.product?.name ?? draft.name ?? '')
  const [options, setOptions] = useState<ProductRef[]>([])
  const [grams, setGrams] = useState(draft.grams ? String(Math.round(draft.grams)) : '')
  const [expiresAt, setExpiresAt] = useState(() =>
    draft.expiresAt !== undefined ? (draft.expiresAt ?? '') : suggestExpiry(draft.product?.category),
  )
  const [price, setPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  // Debounced catalog search while typing.
  useEffect(() => {
    if (editing || query.trim().length < 2) return
    let active = true
    const timer = setTimeout(() => {
      search(query.trim())
        .then((found) => active && setOptions(found))
        .catch(() => active && setOptions([]))
    }, 250)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [query, editing])

  function chooseProduct(value: ProductRef | string | null) {
    setProduct(value)
    // A newly chosen product brings its typical shelf life, unless the date was set by hand.
    if (value && typeof value !== 'string' && !draft.expiresAt) setExpiresAt(suggestExpiry(value.category))
  }

  const productName = typeof product === 'string' ? product.trim() : (product?.name ?? query.trim())
  const gramsValue = Number(grams.replace(',', '.'))
  const priceValue = price ? Number(price.replace(',', '.')) : null
  const valid = productName.length > 0 && gramsValue > 0 && (priceValue === null || priceValue >= 0)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!valid) return
    setSaving(true)
    setError(false)
    const chosen = product && typeof product !== 'string' ? product : null
    try {
      await onSubmit({
        itemId: draft.itemId,
        item: {
          productId: chosen?.id ?? null,
          name: chosen ? null : productName,
          grams: gramsValue,
          expiresAt: expiresAt || null,
          price: priceValue,
          source: draft.source,
        },
      })
      onClose()
    } catch {
      setError(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate>
        <DialogTitle>{t(editing ? 'fridge.form.editTitle' : 'fridge.form.title')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Autocomplete<ProductRef, false, false, true>
              freeSolo
              disabled={editing}
              options={options}
              filterOptions={(x) => x}
              value={product}
              inputValue={query}
              onInputChange={(_, value) => setQuery(value)}
              onChange={(_, value) => chooseProduct(value)}
              getOptionLabel={(o) => (typeof o === 'string' ? o : o.name)}
              isOptionEqualToValue={(a, b) => typeof b !== 'string' && a.id === b.id}
              noOptionsText={t('fridge.form.noOptions')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('fridge.form.product')}
                  helperText={editing ? undefined : t('fridge.form.productHint')}
                  required
                  autoFocus={!draft.product && !draft.name}
                />
              )}
            />
            <TextField
              label={t('fridge.form.grams')}
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
              required
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
              autoFocus={!!(draft.product || draft.name)}
            />
            <TextField
              label={t('fridge.form.expiresAt')}
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            {!editing && draft.source !== 'RECEIPT' && (
              <TextField
                label={t('fridge.form.price')}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                helperText={t('fridge.form.priceHint')}
                slotProps={{
                  htmlInput: { inputMode: 'decimal' },
                  input: { endAdornment: <InputAdornment position="end">₽</InputAdornment> },
                }}
              />
            )}
            {error && <Alert severity="error">{t('fridge.form.saveFailed')}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={saving}>
            {t('fridge.form.cancel')}
          </Button>
          <Button type="submit" variant="contained" disabled={!valid || saving}>
            {saving ? t('fridge.form.saving') : t('fridge.form.save')}
          </Button>
        </DialogActions>
    </form>
  )
}
