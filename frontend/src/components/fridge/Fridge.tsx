import AddIcon from '@mui/icons-material/Add'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import KitchenOutlinedIcon from '@mui/icons-material/KitchenOutlined'
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Link from '@mui/material/Link'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import {useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import type {PantryItem} from '@hse/shared/api/pantry'
import * as settingsApi from '@hse/shared/api/settings'
import {grams, shortDate} from '@hse/shared/format'
import {expiryState} from '@hse/shared/fridge'
import {usePantry} from '@hse/shared/hooks/usePantry'
import {md} from '@/theme'
import FridgeItemDialog, {type FridgeDraft} from './FridgeItemDialog'
import ProductScanDialog from './ProductScanDialog'
import ReceiptDialog from './ReceiptDialog'

function ExpiryChip({ item }: { item: PantryItem }) {
  const { t } = useTranslation()
  const state = expiryState(item.daysLeft)
  if (state === 'ok' || state === 'unknown') return null
  const label = t(state === 'expired' ? 'fridge.expired' : state === 'today' ? 'fridge.today' : 'fridge.soon')
  return <Chip size="small" label={label} color={state === 'expired' ? 'error' : 'warning'} variant={state === 'soon' ? 'outlined' : 'filled'} />
}

/** What is at home, soonest to expire first; added by hand, from a package photo or a receipt. */
export default function Fridge() {
  const { t } = useTranslation()
  const { items, error, reload, add, update, remove } = usePantry()
  const [draft, setDraft] = useState<FridgeDraft | null>(null)
  const [scanOpen, setScanOpen] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [planning, setPlanning] = useState<boolean | null>(null)
  const [deleteError, setDeleteError] = useState(false)

  useEffect(() => {
    let active = true
    settingsApi
      .load()
      .then((s) => active && setPlanning(s.useFridgeInPlanning))
      .catch(() => active && setPlanning(null))
    return () => void (active = false)
  }, [])

  async function removeItem(id: number) {
    setDeleteError(false)
    try {
      await remove(id)
    } catch {
      setDeleteError(true)
    }
  }

  return (
    <>
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDraft({ source: 'MANUAL' })}>
          {t('fridge.add')}
        </Button>
        <Button variant="outlined" startIcon={<PhotoCameraOutlinedIcon />} onClick={() => setScanOpen(true)}>
          {t('fridge.scan')}
        </Button>
        <Button variant="outlined" startIcon={<ReceiptLongOutlinedIcon />} onClick={() => setReceiptOpen(true)}>
          {t('fridge.receipt')}
        </Button>
      </Stack>

      {planning !== null && (
        <Typography variant="body2" color="text.secondary">
          {t(planning ? 'fridge.planningOn' : 'fridge.planningOff')}{' '}
          {!planning && <Link href="/profile/settings">{t('fridge.toSettings')}</Link>}
        </Typography>
      )}

      {error && <Alert severity="error">{t('fridge.loadFailed')}</Alert>}
      {deleteError && <Alert severity="error">{t('fridge.deleteFailed')}</Alert>}
      {!items && !error && <LinearProgress />}

      {items?.length === 0 && (
        <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center', py: 4 }}>
          <KitchenOutlinedIcon sx={{ fontSize: 48, color: md('primary') }} />
          <Typography color="text.secondary">{t('fridge.empty')}</Typography>
        </Stack>
      )}

      {!!items?.length && (
        <Card variant="outlined">
          <List dense disablePadding>
            {items.map((item) => (
              <ListItem
                key={item.id}
                divider
                sx={{ pr: 12 }}
                secondaryAction={
                  <>
                    <Tooltip title={t('fridge.edit')}>
                      <IconButton
                        size="small"
                        aria-label={`${t('fridge.edit')}: ${item.name}`}
                        onClick={() =>
                          setDraft({
                            itemId: item.id,
                            product: item.productId ? { id: item.productId, name: item.name, category: item.category } : null,
                            name: item.name,
                            grams: item.grams,
                            expiresAt: item.expiresAt,
                          })
                        }
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('fridge.delete')}>
                      <IconButton
                        edge="end"
                        size="small"
                        aria-label={`${t('fridge.delete')}: ${item.name}`}
                        onClick={() => void removeItem(item.id)}
                      >
                        <DeleteOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </>
                }
              >
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                      <Typography variant="body1" noWrap>
                        {item.name}
                      </Typography>
                      <ExpiryChip item={item} />
                    </Stack>
                  }
                  secondary={[
                    grams(item.grams),
                    item.expiresAt ? t('fridge.until', { date: shortDate(item.expiresAt) }) : t('fridge.noDate'),
                    item.catalogProductName && item.catalogProductName !== item.name
                      ? t('fridge.countsAs', { name: item.catalogProductName })
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  slotProps={{ primary: { component: 'div' } }}
                />
              </ListItem>
            ))}
          </List>
        </Card>
      )}

      <FridgeItemDialog
        draft={draft}
        onClose={() => setDraft(null)}
        onSubmit={({ item, itemId }) =>
          itemId === undefined ? add(item) : update(itemId, item.grams, item.expiresAt ?? null)
        }
      />
      <ProductScanDialog
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onFound={(product) => {
          setScanOpen(false)
          setDraft({ product, source: 'SCAN' })
        }}
      />
      <ReceiptDialog open={receiptOpen} onClose={() => setReceiptOpen(false)} onAdded={() => void reload()} />
    </>
  )
}
