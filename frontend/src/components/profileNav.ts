import AssignmentIcon from '@mui/icons-material/Assignment'
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import PersonIcon from '@mui/icons-material/Person'
import PersonOutlineIcon from '@mui/icons-material/PersonOutlined'
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'
import RestaurantMenuOutlinedIcon from '@mui/icons-material/RestaurantMenuOutlined'
import SettingsIcon from '@mui/icons-material/Settings'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import useMediaQuery from '@mui/material/useMediaQuery'
import {useTheme} from '@mui/material/styles'
import {matchPath} from 'react-router'

/** Profile sections: tabs on wide screens, the bottom navigation bar on phones. */
export const PROFILE_NAV = [
  { to: '/profile', label: 'profile.nav.overview', icon: PersonOutlineIcon, activeIcon: PersonIcon, end: true },
  { to: '/profile/plan', label: 'profile.nav.plan', icon: RestaurantMenuOutlinedIcon, activeIcon: RestaurantMenuIcon },
  {
    to: '/profile/shopping',
    label: 'profile.nav.shopping',
    icon: ShoppingCartOutlinedIcon,
    activeIcon: ShoppingCartIcon,
  },
  { to: '/profile/data', label: 'profile.nav.data', icon: AssignmentOutlinedIcon, activeIcon: AssignmentIcon },
  { to: '/profile/settings', label: 'profile.nav.settings', icon: SettingsOutlinedIcon, activeIcon: SettingsIcon },
] as const

/** The section the path belongs to, or false outside the profile. */
export const activeSection = (pathname: string) =>
  PROFILE_NAV.find((s) => matchPath({ path: s.to, end: 'end' in s }, pathname))?.to ?? false

/** Phones and narrow windows get the bottom navigation bar. */
export const useCompact = () => useMediaQuery(useTheme().breakpoints.down('md'))
