import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined'
import LogoutIcon from '@mui/icons-material/Logout'
import SettingsBrightnessOutlinedIcon from '@mui/icons-material/SettingsBrightnessOutlined'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import {type ReactNode, useId} from 'react'
import {useTranslation} from 'react-i18next'
import {useNavigate} from 'react-router'
import {useAuth} from '@hse/shared/auth/context'
import {currentLanguage, type Language, LANGUAGES, setLanguage} from '@hse/shared/i18n'
import {type Theme, THEMES, useTheme} from '@hse/shared/theme'

const THEME_ICONS: Record<Theme, ReactNode> = {
  system: <SettingsBrightnessOutlinedIcon fontSize="small" />,
  light: <LightModeOutlinedIcon fontSize="small" />,
  dark: <DarkModeOutlinedIcon fontSize="small" />,
}

function Setting({ label, children }: { label: string; children: (labelId: string) => ReactNode }) {
  const id = useId()
  return (
    <Stack spacing={1.5} sx={{ p: 2.5 }}>
      <Typography variant="subtitle2" id={id}>
        {label}
      </Typography>
      {children(id)}
    </Stack>
  )
}

/** UI preferences; applied immediately and kept on this device only. */
export default function SettingsPage() {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const language = currentLanguage()

  return (
    <Stack component="section" spacing={2} sx={{ maxWidth: 600 }}>
      <Typography variant="h5" component="h2">
        {t('settings.title')}
      </Typography>
      <Card>
        <Setting label={t('settings.theme')}>
          {(labelId) => (
            <ToggleButtonGroup
              exclusive
              fullWidth
              aria-labelledby={labelId}
              value={theme}
              onChange={(_, next: Theme | null) => next && setTheme(next)}
            >
              {THEMES.map((th) => (
                <ToggleButton key={th} value={th}>
                  {THEME_ICONS[th]}
                  {t(`settings.themes.${th}`)}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          )}
        </Setting>
        <Divider />
        <Setting label={t('settings.language')}>
          {(labelId) => (
            <ToggleButtonGroup
              exclusive
              fullWidth
              aria-labelledby={labelId}
              value={language}
              onChange={(_, next: Language | null) => next && void setLanguage(next)}
            >
              {LANGUAGES.map((lng) => (
                <ToggleButton key={lng} value={lng}>
                  {t(`settings.languages.${lng}`)}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          )}
        </Setting>
      </Card>
      <Button
        variant="outlined"
        color="error"
        startIcon={<LogoutIcon />}
        onClick={() => {
          logout()
          navigate('/', { replace: true })
        }}
        sx={{ alignSelf: 'flex-start' }}
      >
        {t('profile.nav.logout')}
      </Button>
    </Stack>
  )
}
