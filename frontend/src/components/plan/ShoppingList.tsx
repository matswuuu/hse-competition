import Box from '@mui/material/Box'
import Checkbox from '@mui/material/Checkbox'
import LinearProgress from '@mui/material/LinearProgress'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import ListSubheader from '@mui/material/ListSubheader'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import {useTranslation} from 'react-i18next'
import {grams} from '@hse/shared/format'
import {useShoppingList} from '@hse/shared/hooks/useShoppingList'

/** Remount (via key) when the plan changes. */
export default function ShoppingList({ planId }: { planId: number }) {
  const { t } = useTranslation()
  const { list, error, bought, toggle, total, boughtCount } = useShoppingList(planId)

  if (error) return <Alert severity="error">{t('shopping.loadFailed')}</Alert>
  if (!list) return <LinearProgress />

  return (
    <>
      <div>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {t('shopping.bought', { bought: boughtCount, total })}
        </Typography>
        <LinearProgress variant="determinate" value={total ? (boughtCount / total) * 100 : 0} />
      </div>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: { xs: 1, sm: 3 } }}>
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
              const isBought = bought.has(item.productName)
              return (
                <ListItem
                  key={item.productName}
                  disablePadding
                  secondaryAction={
                    <Typography variant="body2" color="text.secondary">
                      {grams(item.grams)}
                    </Typography>
                  }
                >
                  <ListItemButton onClick={() => toggle(item.productName)} sx={{ borderRadius: '8px', pl: 0 }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Checkbox
                        edge="start"
                        checked={isBought}
                        tabIndex={-1}
                        disableRipple
                        slotProps={{ input: { 'aria-label': item.productName } }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.productName}
                      sx={isBought ? { color: 'text.secondary', textDecoration: 'line-through' } : undefined}
                    />
                  </ListItemButton>
                </ListItem>
              )
            })}
          </List>
        ))}
      </Box>
    </>
  )
}
