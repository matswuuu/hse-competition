import CheckIcon from '@mui/icons-material/Check'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type {ReactNode} from 'react'
import {md} from '@/theme'

/** M3 filter chip acting as a radio button or checkbox. */
export function ChoiceChip({
  type,
  checked,
  onChange,
  label,
  fullWidth,
}: {
  type: 'radio' | 'checkbox'
  checked: boolean
  onChange: () => void
  label: ReactNode
  fullWidth?: boolean
}) {
  return (
    <Chip
      role={type}
      aria-checked={checked}
      label={label}
      icon={checked && !fullWidth ? <CheckIcon /> : undefined}
      variant={checked ? 'filled' : 'outlined'}
      onClick={onChange}
      sx={[
        checked && {
          bgcolor: md('secondaryContainer'),
          color: md('onSecondaryContainer'),
          '&:hover, &.Mui-focusVisible': { bgcolor: md('secondaryContainer'), filter: 'brightness(0.96)' },
          '& .MuiChip-icon': { color: 'inherit' },
        },
        !!fullWidth && { width: '100%', '& .MuiChip-label': { px: 0 } },
      ]}
    />
  )
}

/** A labelled group of controls, e.g. a row of chips. */
export function FieldGroup({
  label,
  hint,
  children,
  role = 'group',
}: {
  label: string
  hint?: ReactNode
  children: ReactNode
  role?: 'group' | 'radiogroup'
}) {
  return (
    <Stack component="fieldset" spacing={1} sx={{ m: 0, p: 0, border: 0, minWidth: 0 }}>
      <Typography component="legend" variant="subtitle2" sx={{ mb: 1, p: 0 }}>
        {label}
      </Typography>
      {hint}
      <Stack direction="row" role={role} sx={{ flexWrap: 'wrap', gap: 1 }}>
        {children}
      </Stack>
    </Stack>
  )
}
