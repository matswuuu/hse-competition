import EditNoteIcon from '@mui/icons-material/EditNote'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import Card from '@mui/material/Card'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import Collapse from '@mui/material/Collapse'
import Divider from '@mui/material/Divider'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import {useState} from 'react'
import {useTranslation} from 'react-i18next'
import type {MealSummary} from '@hse/shared/api/plans'
import {grams, mealMeta} from '@hse/shared/format'
import {hostname, useMealCard} from '@hse/shared/hooks/useMealCard'
import {md} from '@/theme'
import OwnMealDialog from './OwnMealDialog'

interface Props {
  meal: MealSummary
  onEatenChange: (eaten: boolean) => void
  onReplaced: () => void
}

export default function MealCard({ meal, onEatenChange, onReplaced }: Props) {
  const { t } = useTranslation()
  const { open, card, busy, error, toggleOpen, toggleEaten, replace, replacedWithOwn } =
    useMealCard(meal, onEatenChange, onReplaced)
  const [ownOpen, setOwnOpen] = useState(false)
  const markLabel = meal.eaten ? t('meal.markNotEaten') : t('meal.markEaten')

  return (
    <Card
      component="article"
      sx={{ bgcolor: meal.eaten ? md('surfaceContainer') : md('surfaceContainerLowest'), transition: 'background-color 200ms' }}
      variant="outlined"
    >
      <Stack direction="row" sx={{ alignItems: 'center' }}>
        <Tooltip title={markLabel}>
          <Checkbox
            checked={meal.eaten}
            onChange={toggleEaten}
            slotProps={{ input: { 'aria-label': markLabel } }}
            sx={{ ml: 1 }}
          />
        </Tooltip>
        <ButtonBase
          onClick={toggleOpen}
          aria-expanded={open}
          sx={{ flex: 1, minWidth: 0, justifyContent: 'flex-start', textAlign: 'left', py: 1.5, pl: 0.5, pr: 2, gap: 1 }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="overline" color="text.secondary" sx={{ display: 'block' }}>
              {t(`options.mealType.${meal.mealType}`)}
              {meal.custom && ` · ${t('meal.own')}`}
            </Typography>
            <Typography
              variant="subtitle1"
              sx={meal.eaten ? { color: 'text.secondary', textDecoration: 'line-through' } : undefined}
            >
              {meal.dishName}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
              {mealMeta(meal.facts, meal.cookingTimeMin)}
            </Typography>
          </Box>
          <ExpandMoreIcon
            sx={{ color: 'text.secondary', transition: 'transform 200ms', transform: open ? 'rotate(180deg)' : 'none' }}
          />
        </ButtonBase>
      </Stack>

      {error && (
        <Alert severity="error" role="alert" sx={{ mx: 2, mb: 1.5 }}>
          {error}
        </Alert>
      )}

      <Collapse in={open} unmountOnExit>
        <Divider />
        <Stack spacing={1.5} sx={{ p: 2, alignItems: 'flex-start' }}>
          {!card && !error && (
            <Typography variant="body2" color="text.secondary">
              {t('common.loading')}
            </Typography>
          )}
          {card && (
            <>
              <Typography variant="subtitle2">{t('meal.ingredients')}</Typography>
              <List dense disablePadding sx={{ alignSelf: 'stretch' }}>
                {card.ingredients.map((ing, idx) => (
                  <ListItem key={idx} disableGutters divider secondaryAction={
                    <Typography variant="body2" color="text.secondary">
                      {grams(ing.grams)}
                    </Typography>
                  }>
                    <ListItemText primary={ing.productName} secondary={ing.facts ? undefined : t('meal.notCounted')} />
                  </ListItem>
                ))}
              </List>
              {card.steps.length > 0 && (
                <>
                  <Typography variant="subtitle2">{t('meal.steps')}</Typography>
                  <Box component="ol" sx={{ m: 0, pl: 2.5, typography: 'body2', '& li + li': { mt: 0.5 } }}>
                    {card.steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </Box>
                </>
              )}
              {card.recipeUrls.length > 0 && (
                <>
                  <Typography variant="subtitle2">{t('meal.recipeLinks')}</Typography>
                  <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                    {card.recipeUrls.map((url) => (
                      <Chip
                        key={url}
                        variant="outlined"
                        clickable
                        component="a"
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        label={hostname(url)}
                        icon={<OpenInNewIcon />}
                      />
                    ))}
                  </Stack>
                </>
              )}
            </>
          )}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}>
            <Button variant="outlined" size="small" startIcon={<SwapHorizIcon />} onClick={replace} disabled={busy}>
              {busy ? t('meal.replacing') : t('meal.replace')}
            </Button>
            <Button variant="outlined" size="small" startIcon={<EditNoteIcon />} onClick={() => setOwnOpen(true)} disabled={busy}>
              {t('meal.replaceOwn')}
            </Button>
          </Stack>
        </Stack>
      </Collapse>

      <OwnMealDialog
        open={ownOpen}
        mealId={meal.id}
        plannedDish={meal.dishName}
        onClose={() => setOwnOpen(false)}
        onSaved={() => {
          setOwnOpen(false)
          replacedWithOwn()
        }}
      />
    </Card>
  )
}
