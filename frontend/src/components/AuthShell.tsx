import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import type {ReactNode} from 'react'

/** Centered form surface: a card on wide screens, plain on phones. */
export default function AuthShell({
  step,
  title,
  lead,
  wide,
  children,
}: {
  step?: string
  title: string
  lead?: string
  wide?: boolean
  children: ReactNode
}) {
  return (
    <Card
      component="section"
      sx={{
        maxWidth: wide ? 600 : 420,
        mx: 'auto',
        my: { xs: 0, sm: 2 },
        p: { xs: 0, sm: 4 },
        bgcolor: { xs: 'transparent', sm: 'background.paper' },
        borderRadius: { sm: '28px' },
        overflow: 'visible',
      }}
    >
      {step && (
        <Typography variant="subtitle2" color="primary" sx={{ mb: 0.5 }}>
          {step}
        </Typography>
      )}
      <Typography variant="h3" component="h1" sx={{ mb: lead ? 1 : 3 }}>
        {title}
      </Typography>
      {lead && (
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          {lead}
        </Typography>
      )}
      {children}
    </Card>
  )
}
