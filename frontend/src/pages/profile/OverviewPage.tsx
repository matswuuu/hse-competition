import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import LinearProgress from '@mui/material/LinearProgress'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import {useTranslation} from 'react-i18next'
import {round} from '@hse/shared/format'
import {useProfile} from '@hse/shared/profile/context'
import {eatenStats, excludedFoods, profileFacts, targetRows} from '@hse/shared/profile/summary'
import Disclaimer from '@/components/Disclaimer'
import FillQuestionnaire from './FillQuestionnaire'

const panelSx = { p: { xs: 2, sm: 3 }, display: 'flex', flexDirection: 'column', gap: 2 } as const

export default function OverviewPage() {
  const { t } = useTranslation()
  const { questionnaire: q, targets, week } = useProfile()

  if (!q || !targets) return <FillQuestionnaire />

  const excluded = excludedFoods(q, t)
  const facts = profileFacts(q, t)
  const stats = week && eatenStats(week)

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
        <Card component="section" sx={panelSx}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5" component="h2">
              {t('profile.params')}
            </Typography>
            <Button href="/profile/data" size="small" startIcon={<EditOutlinedIcon />}>
              {t('profile.edit')}
            </Button>
          </Stack>
          <Box component="dl" sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, m: 0 }}>
            {facts.map(({ label, value }) => (
              <div key={label}>
                <Typography component="dt" variant="caption" color="text.secondary">
                  {label}
                </Typography>
                <Typography component="dd" variant="subtitle2" sx={{ m: 0 }}>
                  {value}
                </Typography>
              </div>
            ))}
            {excluded.length > 0 && (
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Typography component="dt" variant="caption" color="text.secondary">
                  {t('profile.facts.excluded')}
                </Typography>
                <Typography component="dd" variant="subtitle2" sx={{ m: 0 }}>
                  {excluded.join(', ')}
                </Typography>
              </Box>
            )}
          </Box>
        </Card>

        <Card component="section" sx={panelSx}>
          <Typography variant="h5" component="h2">
            {t('profile.targets')}
          </Typography>
          <Table size="small" sx={{ '& td, & th': { px: 0.5, fontVariantNumeric: 'tabular-nums' } }}>
            <TableHead>
              <TableRow>
                <TableCell />
                {(['kcal', 'p', 'f', 'c'] as const).map((k) => (
                  <TableCell key={k} align="right" sx={{ color: 'text.secondary' }}>
                    {t(`common.${k}`)}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {targetRows(targets, t).map(({ label, facts: row }) => (
                <TableRow key={label}>
                  <TableCell component="th" scope="row" sx={{ fontWeight: 500 }}>
                    {label}
                  </TableCell>
                  <TableCell align="right">{round(row.kcal)}</TableCell>
                  <TableCell align="right">{round(row.proteinG)}</TableCell>
                  <TableCell align="right">{round(row.fatG)}</TableCell>
                  <TableCell align="right">{round(row.carbsG)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {stats ? (
            <div>
              <Typography variant="h3" component="p" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {stats.eaten}
                <Typography component="span" variant="h5" color="text.secondary">
                  {' '}
                  / {stats.total}
                </Typography>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {t('profile.eatenSummary')}
              </Typography>
              <LinearProgress variant="determinate" value={stats.total ? (stats.eaten / stats.total) * 100 : 0} />
            </div>
          ) : (
            <Typography color="text.secondary">
              {t('profile.noPlanYet')} <Link href="/profile/plan">{t('profile.toPlan')}</Link>
            </Typography>
          )}
        </Card>
      </Box>

      <Disclaimer />
    </Stack>
  )
}
