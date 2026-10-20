
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import DonutLargeOutlinedIcon from '@mui/icons-material/DonutLargeOutlined'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@hse/shared/auth/context'
import { md } from '@/theme'

const FEATURE_ICONS = [
  DonutLargeOutlinedIcon,
  CalendarMonthOutlinedIcon,
  TuneOutlinedIcon,
  ShoppingCartOutlinedIcon,
]

export default function HomePage() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const features = t('home.features', { returnObjects: true })
  const steps = t('home.steps', { returnObjects: true })
  const faq = t('home.faq', { returnObjects: true })

  return (
    <Stack spacing={{ xs: 5, sm: 8 }}>
      <Box
        component="section"
        sx={{
          textAlign: 'center',
          px: { xs: 2.5, sm: 6 },
          py: { xs: 5, sm: 8 },
          borderRadius: '28px',
          bgcolor: md('primaryContainer'),
          color: md('onPrimaryContainer'),
        }}
      >
        <Typography
          variant="h1"
          sx={{
            fontSize: 'clamp(2rem, 6vw, 3.5rem)',
            lineHeight: 1.12,
            mb: 2,
          }}
        >
          {t('home.title1')}
          <br />
          {t('home.title2')}
        </Typography>

        <Typography
          variant="body1"
          sx={{
            maxWidth: 600,
            mx: 'auto',
            fontSize: { sm: '1.125rem' },
            opacity: 0.9,
          }}
        >
          {t('home.lead')}
        </Typography>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{
            justifyContent: 'center',
            alignItems: { sm: 'center' },
            mt: 4,
            flexWrap: 'wrap',
          }}
        >
          {user ? (
            <>
              <Typography variant="subtitle1">
                {t('home.greeting', { name: user.username })}
              </Typography>
              <Button
                href="/profile/plan"
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon />}
              >
                {t('home.myPlan')}
              </Button>
            </>
          ) : (
            <>
              <Button href="/register" variant="contained" size="large">
                {t('home.start')}
              </Button>
              <Button
                href="/login"
                variant="outlined"
                size="large"
                color="inherit"
              >
                {t('home.haveAccount')}
              </Button>
            </>
          )}
        </Stack>
      </Box>

      <Box component="section">
        <Typography variant="h4" component="h2" sx={{ mb: 2.5 }}>
          {t('home.featuresTitle')}
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: 2,
          }}
        >
          {features.map((feature, index) => {
            const Icon = FEATURE_ICONS[index % FEATURE_ICONS.length]

            return (
              <Card key={feature.title} component="article">
                <CardContent sx={{ p: 2.5 }}>
                  <Avatar
                    variant="rounded"
                    sx={{
                      mb: 2,
                      borderRadius: '12px',
                      bgcolor: md('secondaryContainer'),
                      color: md('onSecondaryContainer'),
                    }}
                  >
                    <Icon />
                  </Avatar>

                  <Typography
                    variant="subtitle1"
                    component="h3"
                    sx={{ mb: 0.5 }}
                  >
                    {feature.title}
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    {feature.text}
                  </Typography>
                </CardContent>
              </Card>
            )
          })}
        </Box>
      </Box>

      <Box component="section">
        <Typography variant="h4" component="h2" sx={{ mb: 2.5 }}>
          {t('home.stepsTitle')}
        </Typography>

        <Box
          component="ol"
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 3,
            m: 0,
            p: 0,
            listStyle: 'none',
          }}
        >
          {steps.map((step, index) => (
            <Stack component="li" key={step.title} direction="row" spacing={2}>
              <Avatar
                sx={{
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  fontWeight: 700,
                }}
              >
                {index + 1}
              </Avatar>

              <Box>
                <Typography
                  variant="subtitle1"
                  component="h3"
                  sx={{ mb: 0.5 }}
                >
                  {step.title}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  {step.text}
                </Typography>
              </Box>
            </Stack>
          ))}
        </Box>
      </Box>

      <Box component="section">
        <Typography variant="h4" component="h2" sx={{ mb: 2.5 }}>
          {t('home.faqTitle')}
        </Typography>

        <Stack spacing={1.5}>
          {faq.map((item, index) => (
            <Accordion
              key={item.question}
              disableGutters
              elevation={0}
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: '16px !important',
                overflow: 'hidden',
                bgcolor: 'background.paper',
                '&::before': {
                  display: 'none',
                },
                '&.Mui-expanded': {
                  margin: 0,
                },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls={`home-faq-${index}-content`}
                id={`home-faq-${index}-header`}
                sx={{
                  px: { xs: 2, sm: 2.5 },
                  py: 0.5,
                  '& .MuiAccordionSummary-content': {
                    my: 1.5,
                  },
                }}
              >
                <Typography variant="subtitle1" component="h3">
                  {item.question}
                </Typography>
              </AccordionSummary>

              <AccordionDetails
                id={`home-faq-${index}-content`}
                sx={{
                  px: { xs: 2, sm: 2.5 },
                  pt: 0,
                  pb: 2.5,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {item.answer}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>
      </Box>

      {!user && (
        <Card
          component="section"
          sx={{
            bgcolor: md('surfaceContainerHigh'),
            borderRadius: '28px',
          }}
        >
          <Stack
            spacing={1.5}
            sx={{
              alignItems: 'center',
              textAlign: 'center',
              px: 3,
              py: 5,
            }}
          >
            <Typography variant="h4" component="h2">
              {t('home.ctaTitle')}
            </Typography>

            <Typography color="text.secondary">
              {t('home.ctaText')}
            </Typography>

            <Button
              href="/register"
              variant="contained"
              size="large"
              sx={{ mt: 1 }}
            >
              {t('home.ctaButton')}
            </Button>
          </Stack>
        </Card>
      )}
    </Stack>
  )
}
