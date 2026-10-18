import Box from '@mui/material/Box'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'
import {Fragment} from 'react'
import {useTranslation} from 'react-i18next'
import {type LegalDoc, type LegalPage as Page, parseInline} from '@hse/shared/legal'

function Inline({ text }: { text: string }) {
  return parseInline(text).map((part, i) =>
    part.link ? (
      <Link key={i} href={`/${part.link}`}>
        {part.text}
      </Link>
    ) : part.bold ? (
      <strong key={i}>{part.text}</strong>
    ) : (
      <Fragment key={i}>{part.text}</Fragment>
    ),
  )
}

export default function LegalPage({ page }: { page: Page }) {
  const { t } = useTranslation()
  const doc: LegalDoc = t(`legal.${page}`, { returnObjects: true })

  return (
    <Box component="article" sx={{ maxWidth: 720, mx: 'auto', '& p, & li': { lineHeight: 1.65 } }}>
      <Typography variant="h3" component="h1" sx={{ overflowWrap: 'anywhere' }}>
        {doc.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 4 }}>
        {doc.updated}
      </Typography>
      {doc.blocks.map((block, i) =>
        'heading' in block ? (
          <Typography key={i} variant="h5" component="h2" sx={{ mt: 4, mb: 1.5 }}>
            {block.heading}
          </Typography>
        ) : 'paragraph' in block ? (
          <Typography key={i} sx={{ my: 1.5 }}>
            <Inline text={block.paragraph} />
          </Typography>
        ) : (
          <Box component="ul" key={i} sx={{ pl: 2.5, typography: 'body1', '& li + li': { mt: 0.75 } }}>
            {block.list.map((item, j) => (
              <li key={j}>
                <Inline text={item} />
              </li>
            ))}
          </Box>
        ),
      )}
    </Box>
  )
}
