import EcoIcon from '@mui/icons-material/EnergySavingsLeaf'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import LogoutIcon from '@mui/icons-material/Logout'
import AppBar from '@mui/material/AppBar'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Divider from '@mui/material/Divider'
import Link from '@mui/material/Link'
import ListItemIcon from '@mui/material/ListItemIcon'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import useScrollTrigger from '@mui/material/useScrollTrigger'
import {useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Link as RouterLink, Outlet, useLocation, useNavigate} from 'react-router'
import {useAuth} from '@hse/shared/auth/context'
import {activeSection, PROFILE_NAV, useCompact} from '@/components/profileNav'
import ProductSource from '@/components/ProductSource'
import {md} from '@/theme'

const YEAR = new Date().getFullYear()
const NAV_BAR_HEIGHT = 80

function AccountMenu({ username }: { username: string }) {
  const { t } = useTranslation()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const close = () => setAnchor(null)

  return (
    <>
      <Button
        color="inherit"
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-haspopup="menu"
        endIcon={<ExpandMoreIcon />}
        sx={{ minWidth: 0, maxWidth: { xs: '10rem', sm: '16rem' } }}
      >
        <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {username}
        </Box>
      </Button>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Typography variant="subtitle2" sx={{ px: 2, py: 1, overflowWrap: 'anywhere' }}>
          {username}
        </Typography>
        <Divider />
        {PROFILE_NAV.map(({ to, label, icon: Icon }) => (
          <MenuItem key={to} component={RouterLink} to={to} onClick={close}>
            <ListItemIcon>
              <Icon fontSize="small" />
            </ListItemIcon>
            {t(label)}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem
          onClick={() => {
            close()
            logout()
            navigate('/', { replace: true })
          }}
        >
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          {t('profile.nav.logout')}
        </MenuItem>
      </Menu>
    </>
  )
}

/** M3 navigation bar for signed-in users on phones. */
function NavigationBar() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const active = activeSection(pathname)

  return (
    <Paper
      component="nav"
      aria-label={t('profile.nav.label')}
      square
      sx={{
        position: 'fixed',
        insetInline: 0,
        bottom: 0,
        zIndex: 'appBar',
        pb: 'var(--inset-bottom)',
        bgcolor: md('surfaceContainer'),
      }}
    >
      <BottomNavigation value={active} showLabels>
        {PROFILE_NAV.map(({ to, label, icon: Icon, activeIcon: ActiveIcon }) => (
          <BottomNavigationAction
            key={to}
            value={to}
            label={t(label)}
            icon={active === to ? <ActiveIcon /> : <Icon />}
            component={RouterLink}
            to={to}
          />
        ))}
      </BottomNavigation>
    </Paper>
  )
}

export default function Layout() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const compact = useCompact()
  const scrolled = useScrollTrigger({ disableHysteresis: true, threshold: 0 })
  const navBar = !!user && compact

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar
        position="sticky"
        sx={{
          pt: 'var(--inset-top)',
          // M3: the top app bar takes the container color once content scrolls under it.
          bgcolor: scrolled ? md('surfaceContainer') : md('surface'),
          transition: 'background-color 200ms',
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          <Button
            href="/"
            color="inherit"
            startIcon={<EcoIcon sx={{ color: md('primary') }} />}
            sx={{ typography: { xs: 'h6', sm: 'h5' }, px: 1, mr: 'auto', minWidth: 0, whiteSpace: 'nowrap' }}
          >
            {t('common.appName')}
          </Button>
          {user ? (
            <AccountMenu username={user.username} />
          ) : (
            <Stack direction="row" spacing={1} sx={{ whiteSpace: 'nowrap' }}>
              <Button href="/login">{t('layout.login')}</Button>
              <Button href="/register" variant="contained">
                {t('layout.register')}
              </Button>
            </Stack>
          )}
        </Toolbar>
      </AppBar>

      <Container component="main" maxWidth="md" sx={{ flex: 1, py: { xs: 2, sm: 4 } }}>
        <Outlet />
      </Container>

      <Box
        component="footer"
        sx={{
          mt: 4,
          bgcolor: md('surfaceContainerLow'),
          color: 'text.secondary',
          pb: navBar ? `${NAV_BAR_HEIGHT}px` : 'var(--inset-bottom)',
        }}
      >
        <Container
          maxWidth="md"
          sx={{
            py: 3,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            flexWrap: 'wrap',
            gap: { xs: 1, sm: 3 },
            alignItems: { sm: 'center' },
            typography: 'body2',
          }}
        >
          <span>
            © {YEAR} {t('common.appName')}
          </span>
          <Stack direction="row" spacing={2} sx={{ flex: 1 }}>
            <Link href="/terms" color="inherit">
              {t('layout.terms')}
            </Link>
            <Link href="/privacy" color="inherit">
              {t('layout.privacy')}
            </Link>
          </Stack>
          <ProductSource />
        </Container>
        {navBar && <Box sx={{ height: 'var(--inset-bottom)' }} />}
      </Box>

      {navBar && <NavigationBar />}
    </Box>
  )
}
