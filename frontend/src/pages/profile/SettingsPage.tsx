import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined'
import LogoutIcon from '@mui/icons-material/Logout'
import SettingsBrightnessOutlinedIcon from '@mui/icons-material/SettingsBrightnessOutlined'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import {type ReactNode, useEffect, useId, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {useNavigate} from 'react-router'
import * as settingsApi from '@hse/shared/api/settings'
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

/** Menu preferences stored with the account: the planner on the server acts on them. */
function PlanningSettings() {
  const { t } = useTranslation()
  const [useFridge, setUseFridge] = useState<boolean | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    settingsApi
      .load()
      .then((s) => active && setUseFridge(s.useFridgeInPlanning))
      .catch(() => active && setError(true))
    return () => void (active = false)
  }, [])

  async function toggle(next: boolean) {
    const previous = useFridge
    setUseFridge(next)
    setError(false)
    try {
      setUseFridge((await settingsApi.update({ useFridgeInPlanning: next })).useFridgeInPlanning)
    } catch {
      setUseFridge(previous)
      setError(true)
    }
  }

  return (
    <Card>
      <Setting label={t('settings.planning')}>
        {() => (
          <>
            <FormControlLabel
              control={
                <Switch
                  checked={!!useFridge}
                  disabled={useFridge === null}
                  onChange={(e) => void toggle(e.target.checked)}
                />
              }
              label={t('settings.useFridge')}
              sx={{ alignItems: 'flex-start', mr: 0, '& .MuiSwitch-root': { mt: -0.75 } }}
            />
            <Typography variant="body2" color="text.secondary">
              {t('settings.useFridgeHint')}
            </Typography>
            {error && <Alert severity="error">{t('settings.saveFailed')}</Alert>}
          </>
        )}
      </Setting>
    </Card>
  )
}

/** UI preferences (applied immediately, kept on this device) and the account's menu settings. */
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
      <PlanningSettings />
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
