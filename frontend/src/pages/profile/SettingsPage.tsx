import {useTranslation} from 'react-i18next'
import {currentLanguage, LANGUAGES, setLanguage} from '@hse/shared/i18n'
import {THEMES, useTheme} from '@hse/shared/theme'

interface ChipProps {
  name: string
  checked: boolean
  onChange: () => void
  label: string
}

function Chip({ name, checked, onChange, label }: ChipProps) {
  return (
    <label className="chip">
      <input type="radio" name={name} checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  )
}

/** UI preferences; applied immediately and kept in this browser only. */
export default function SettingsPage() {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const language = currentLanguage()

  return (
    <section className="profile-settings">
      <h2>{t('settings.title')}</h2>
      <div className="settings-form">
        <fieldset>
          <legend>{t('settings.theme')}</legend>
          <div className="chips">
            {THEMES.map((th) => (
              <Chip
                key={th}
                name="theme"
                checked={theme === th}
                onChange={() => setTheme(th)}
                label={t(`settings.themes.${th}`)}
              />
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>{t('settings.language')}</legend>
          <div className="chips">
            {LANGUAGES.map((lng) => (
              <Chip
                key={lng}
                name="language"
                checked={language === lng}
                onChange={() => void setLanguage(lng)}
                label={t(`settings.languages.${lng}`)}
              />
            ))}
          </div>
        </fieldset>
      </div>
    </section>
  )
}
