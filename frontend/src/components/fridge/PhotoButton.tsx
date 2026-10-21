import AddAPhotoOutlinedIcon from '@mui/icons-material/AddAPhotoOutlined'
import Button, {type ButtonProps} from '@mui/material/Button'
import type {ChangeEvent, ReactNode} from 'react'
import {CODE_MAX_SIDE, downscalePhoto} from '@hse/shared/photo'

/** Opens the camera (or the gallery) and hands over the photo, by default downscaled just enough to keep codes readable. */
export default function PhotoButton({
  children,
  onPhoto,
  disabled,
  variant = 'contained',
  startIcon = <AddAPhotoOutlinedIcon />,
  sx,
  maxSide = CODE_MAX_SIDE,
}: {
  children: ReactNode
  onPhoto: (photo: Blob, file: File) => void
  disabled?: boolean
  variant?: ButtonProps['variant']
  startIcon?: ReactNode
  sx?: ButtonProps['sx']
  maxSide?: number
}) {
  async function choose(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) onPhoto(await downscalePhoto(file, maxSide), file)
  }

  return (
    <Button component="label" variant={variant} startIcon={startIcon} disabled={disabled} sx={sx}>
      {children}
      <input type="file" accept="image/*" capture="environment" hidden disabled={disabled} onChange={choose} />
    </Button>
  )
}
