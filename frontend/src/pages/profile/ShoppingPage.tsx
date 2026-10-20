import Card from '@mui/material/Card'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import {useTranslation} from 'react-i18next'
import {Link as RouterLink, Outlet, useLocation} from 'react-router'
import Fridge from '@/components/fridge/Fridge'
import ShoppingList from '@/components/plan/ShoppingList'
import Spending from '@/components/spending/Spending'
import {useProfile} from '@hse/shared/profile/context'
import FillQuestionnaire from './FillQuestionnaire'

const TABS = [
  { to: '/profile/shopping', label: 'shopping.tabs.list' },
  { to: '/profile/shopping/fridge', label: 'shopping.tabs.fridge' },
  { to: '/profile/shopping/spending', label: 'shopping.tabs.spending' },
] as const

/** Groceries: the shopping list, the fridge and spending, as tabs. */
export default function ShoppingPage() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const active = TABS.find((tab) => tab.to === pathname.replace(/\/$/, ''))?.to ?? TABS[0].to

  return (
    <Card component="section">
      <Tabs
        value={active}
        variant="scrollable"
        scrollButtons={false}
        aria-label={t('profile.nav.shopping')}
        sx={{ px: { xs: 1, sm: 2 }, borderBottom: 1, borderColor: 'divider' }}
      >
        {TABS.map((tab) => (
          <Tab key={tab.to} value={tab.to} label={t(tab.label)} component={RouterLink} to={tab.to} />
        ))}
      </Tabs>
      <Stack spacing={2} sx={{ p: { xs: 2, sm: 3 } }}>
        <Outlet />
      </Stack>
    </Card>
  )
}

export function ShoppingListTab() {
  const { t } = useTranslation()
  const { questionnaire, week, weekVersion } = useProfile()

  if (!questionnaire) return <FillQuestionnaire />
  return week ? (
    // Remount on plan changes so the list refetches.
    <ShoppingList key={weekVersion} />
  ) : (
    <Typography color="text.secondary">
      {t('shopping.noPlan')} <Link href="/profile/plan">{t('profile.toPlan')}</Link>
    </Typography>
  )
}

export const FridgeTab = Fridge
export const SpendingTab = Spending
