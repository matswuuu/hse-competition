import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Link from '@mui/material/Link'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import type {FormEvent} from 'react'
import {Trans, useTranslation} from 'react-i18next'
import type {ActivityLevel, QuestionnaireResponse} from '@hse/shared/api/questionnaire'
import {QUESTIONNAIRE_LIMITS as L, useQuestionnaireForm} from '@hse/shared/hooks/useQuestionnaireForm'
import {
    ACTIVITY_VALUES,
    COOKING_VALUES,
    EXCLUSION_TAGS,
    GOAL_VALUES,
    MEALS_PER_DAY_VALUES,
    SEX_VALUES,
} from '@hse/shared/labels'
import {ChoiceChip, FieldGroup} from '@/components/form'

interface Props {
  /** Prefills the form, e.g. with the latest saved questionnaire. */
  initial?: QuestionnaireResponse | null
  submitLabel?: string
  onSubmitted: (saved: QuestionnaireResponse) => void
}

export default function QuestionnaireForm({ initial, submitLabel, onSubmitted }: Props) {
  const { t } = useTranslation()
  const f = useQuestionnaireForm(initial, onSubmitted)

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    void f.submit()
  }

  return (
    <Stack component="form" spacing={3} onSubmit={handleSubmit}>
      <FieldGroup label={t('questionnaire.sex')} role="radiogroup">
        {SEX_VALUES.map((v) => (
          <ChoiceChip
            key={v}
            type="radio"
            checked={f.sex === v}
            onChange={() => f.setSex(v)}
            label={t(`options.sex.${v}`)}
          />
        ))}
      </FieldGroup>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: { xs: 1, sm: 2 } }}>
        <TextField
          type="number"
          required
          label={t('questionnaire.age')}
          slotProps={{ htmlInput: L.age }}
          value={f.age}
          onChange={(e) => f.setAge(e.target.value)}
        />
        <TextField
          type="number"
          required
          label={t('questionnaire.height')}
          slotProps={{ htmlInput: L.heightCm }}
          value={f.heightCm}
          onChange={(e) => f.setHeightCm(e.target.value)}
        />
        <TextField
          type="number"
          required
          label={t('questionnaire.weight')}
          slotProps={{ htmlInput: L.weightKg }}
          value={f.weightKg}
          onChange={(e) => f.setWeightKg(e.target.value)}
        />
      </Box>

      <TextField
        select
        label={t('questionnaire.activity')}
        value={f.activityLevel}
        onChange={(e) => f.setActivityLevel(e.target.value as ActivityLevel)}
      >
        {ACTIVITY_VALUES.map((v) => (
          <MenuItem key={v} value={v}>
            {t(`options.activity.${v}`)}
          </MenuItem>
        ))}
      </TextField>

      <FieldGroup
        label={t('questionnaire.trainingDays')}
        hint={
          <Typography variant="caption" color="text.secondary">
            {t('questionnaire.trainingDaysHint')}
          </Typography>
        }
      >
        <Box sx={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 0.75 }}>
          {t('options.weekdays', { returnObjects: true }).map((label, i) => (
            <ChoiceChip
              key={i}
              type="checkbox"
              fullWidth
              checked={f.trainingDays.includes(i + 1)}
              onChange={() => f.toggleTrainingDay(i + 1)}
              label={label}
            />
          ))}
        </Box>
      </FieldGroup>

      <FieldGroup label={t('questionnaire.goal')} role="radiogroup">
        {GOAL_VALUES.map((v) => (
          <ChoiceChip
            key={v}
            type="radio"
            checked={f.goal === v}
            onChange={() => f.setGoal(v)}
            label={t(`options.goal.${v}`)}
          />
        ))}
      </FieldGroup>

      <FieldGroup label={t('questionnaire.mealsPerDay')} role="radiogroup">
        {MEALS_PER_DAY_VALUES.map((n) => (
          <ChoiceChip key={n} type="radio" checked={f.mealsPerDay === n} onChange={() => f.setMealsPerDay(n)} label={n} />
        ))}
      </FieldGroup>

      <FieldGroup
        label={t('questionnaire.excluded')}
        hint={
          <Alert severity="warning" sx={{ py: 0, typography: 'caption' }}>
            {t('questionnaire.excludedNotice')}
          </Alert>
        }
      >
        {EXCLUSION_TAGS.map((tag) => (
          <ChoiceChip
            key={tag}
            type="checkbox"
            checked={f.excludedTags.includes(tag)}
            onChange={() => f.toggleExcludedTag(tag)}
            label={t(`options.exclusion.${tag}`)}
          />
        ))}
        <TextField
          fullWidth
          size="small"
          sx={{ mt: 1 }}
          placeholder={t('questionnaire.excludedOther')}
          slotProps={{ htmlInput: L.excludedFreeText }}
          value={f.excludedFreeText}
          onChange={(e) => f.setExcludedFreeText(e.target.value)}
        />
      </FieldGroup>

      <FieldGroup label={t('questionnaire.cookingTime')} role="radiogroup">
        {COOKING_VALUES.map((v) => (
          <ChoiceChip
            key={v}
            type="radio"
            checked={f.cookingTime === v}
            onChange={() => f.setCookingTime(v)}
            label={t(`options.cooking.${v}`)}
          />
        ))}
      </FieldGroup>

      <TextField
        type="number"
        label={t('questionnaire.budget')}
        placeholder={t('questionnaire.budgetPlaceholder')}
        slotProps={{ htmlInput: L.budgetPerDay, inputLabel: { shrink: true } }}
        value={f.budgetPerDay}
        onChange={(e) => f.setBudgetPerDay(e.target.value)}
      />

      {f.askConsent && (
        <FormControlLabel
          sx={{ alignItems: 'flex-start' }}
          control={
            <Checkbox
              required
              checked={f.consentAgreed}
              onChange={(e) => f.setConsentAgreed(e.target.checked)}
              sx={{ mt: -1 }}
            />
          }
          label={
            <Typography variant="body2">
              {/* New tab, so the half-filled form isn't lost. */}
              <Trans i18nKey="questionnaire.consent" components={{ link: <Link href="/privacy" target="_blank" /> }} />
            </Typography>
          }
        />
      )}

      {f.error && (
        <Alert severity="error" role="alert">
          {f.error}
        </Alert>
      )}
      <Button type="submit" variant="contained" size="large" disabled={f.submitting}>
        {f.submitting ? t('questionnaire.saving') : (submitLabel ?? t('questionnaire.submit'))}
      </Button>
    </Stack>
  )
}
