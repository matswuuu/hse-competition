import {Fragment} from 'react'
import {useTranslation} from 'react-i18next'
import {Link} from 'react-router'
import {type LegalDoc, type LegalPage as Page, parseInline} from '@hse/shared/legal'

function Inline({ text }: { text: string }) {
  return parseInline(text).map((part, i) =>
    part.link ? (
      <Link key={i} to={`/${part.link}`}>
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
    <article className="legal">
      <h1>{doc.title}</h1>
      <p className="legal-updated">{doc.updated}</p>
      {doc.blocks.map((block, i) =>
        'heading' in block ? (
          <h2 key={i}>{block.heading}</h2>
        ) : 'paragraph' in block ? (
          <p key={i}>
            <Inline text={block.paragraph} />
          </p>
        ) : (
          <ul key={i}>
            {block.list.map((item, j) => (
              <li key={j}>
                <Inline text={item} />
              </li>
            ))}
          </ul>
        ),
      )}
    </article>
  )
}
