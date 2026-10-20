import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RemoveShoppingCartOutlinedIcon from '@mui/icons-material/RemoveShoppingCartOutlined'
import UndoIcon from '@mui/icons-material/Undo'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import ListSubheader from '@mui/material/ListSubheader'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import {useState} from 'react'
import {useTranslation} from 'react-i18next'
import * as pantryApi from '@hse/shared/api/pantry'
import type {ShoppingItem} from '@hse/shared/api/plans'
import {grams} from '@hse/shared/format'
import {roundUpGrams} from '@hse/shared/fridge'
import {useShoppingList} from '@hse/shared/hooks/useShoppingList'
import FridgeItemDialog, {type FridgeDraft} from '@/components/fridge/FridgeItemDialog'

function amountLine(item: ShoppingItem, t: ReturnType<typeof useTranslation>['t']) {
  if (item.toBuyGrams <= 0) return `${t('shopping.covered')} · ${grams(item.neededGrams)}`
  const toBuy = t('shopping.toBuy', { amount: grams(item.toBuyGrams) })
  return item.inFridgeGrams > 0 ? `${toBuy} · ${t('shopping.inFridge', { amount: grams(item.inFridgeGrams) })}` : toBuy
}

/**
 * What to buy for the rest of the plan, minus what is already in the fridge. Ticking an item puts
 * it into the fridge (with a date and price), which is what makes it "covered". Remount (via key)
 * when the plan changes.
 */
export default function ShoppingList() {
  const { t } = useTranslation()
  const { list, error, busy, reload, dismiss, restore, total, covered } = useShoppingList()
  const [draft, setDraft] = useState<FridgeDraft | null>(null)
  const [actionError, setActionError] = useState(false)

  if (error) return <Alert severity="error">{t('shopping.loadFailed')}</Alert>
  if (!list) return <LinearProgress />

  async function act(action: Promise<boolean>) {
    setActionError(!(await action))
  }

  return (
    <>
      <div>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {t('shopping.progress', { covered, total })}
        </Typography>
        <LinearProgress variant="determinate" value={total ? (covered / total) * 100 : 0} />
      </div>
      <Typography variant="body2" color="text.secondary">
        {total > 0 && covered === total ? t('shopping.allCovered') : t('shopping.hint')}
      </Typography>
      {actionError && <Alert severity="error">{t('shopping.actionFailed')}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: { xs: 1, sm: 3 } }}>
        {list.categories.map((group) => (
          <List
            key={group.category}
            dense
            disablePadding
            subheader={
              <ListSubheader
                disableSticky
                sx={{ px: 0, bgcolor: 'transparent', color: 'primary.main', typography: 'subtitle2', lineHeight: '40px', textTransform: 'capitalize' }}
              >
                {group.category}
              </ListSubheader>
            }
          >
            {group.items.map((item) => {
              const isCovered = item.toBuyGrams <= 0
              return (
                <ListItem
                  key={item.productId}
                  disablePadding
                  secondaryAction={
                    <Tooltip title={t('shopping.remove')}>
                      <IconButton
                        edge="end"
                        size="small"
                        aria-label={`${t('shopping.remove')}: ${item.productName}`}
                        disabled={busy}
                        onClick={() => void act(dismiss(item.productId))}
                      >
                        <RemoveShoppingCartOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  }
                >
                  <ListItemButton
                    disabled={isCovered}
                    onClick={() =>
                      setDraft({
                        product: { id: item.productId, name: item.productName, category: group.category },
                        grams: roundUpGrams(item.toBuyGrams),
                        source: 'SHOPPING_LIST',
                      })
                    }
                    sx={{ borderRadius: '8px', pl: 0, '&.Mui-disabled': { opacity: 1 } }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      {isCovered ? (
                        <CheckCircleIcon color="primary" sx={{ m: '9px' }} />
                      ) : (
                        <Checkbox
                          edge="start"
                          checked={false}
                          tabIndex={-1}
                          disableRipple
                          slotProps={{ input: { 'aria-label': `${t('shopping.markBought')}: ${item.productName}` } }}
                        />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.productName}
                      secondary={amountLine(item, t)}
                      sx={isCovered ? { color: 'text.secondary', '& .MuiListItemText-primary': { textDecoration: 'line-through' } } : undefined}
                    />
                  </ListItemButton>
                </ListItem>
              )
            })}
          </List>
        ))}
      </Box>

      {list.dismissed.length > 0 && (
        <Stack spacing={1}>
          <Typography variant="subtitle2" color="text.secondary">
            {t('shopping.removed')}
          </Typography>
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
            {list.dismissed.map((d) => (
              <Chip
                key={d.productId}
                label={d.productName}
                variant="outlined"
                deleteIcon={<UndoIcon />}
                onDelete={() => void act(restore(d.productId))}
                onClick={() => void act(restore(d.productId))}
                disabled={busy}
                aria-label={t('shopping.restore', { name: d.productName })}
              />
            ))}
          </Stack>
        </Stack>
      )}

      <FridgeItemDialog
        draft={draft}
        onClose={() => setDraft(null)}
        onSubmit={async ({ item }) => {
          await pantryApi.add(item)
          await reload()
        }}
      />
    </>
  )
}
