export type LegalPage = 'terms' | 'privacy'

/**
 * Shape of the legal texts in the i18n dictionaries under `legal.*`. Inline markup in paragraphs and list
 * items: **bold** and [link text](terms|privacy).
 */
export type LegalBlock = { heading: string } | { paragraph: string } | { list: string[] }

export interface LegalDoc {
  title: string
  updated: string
  blocks: LegalBlock[]
}

export type InlinePart = { text: string; bold?: boolean; link?: LegalPage }

export function parseInline(text: string): InlinePart[] {
  const parts: InlinePart[] = []
  const re = /\*\*(.+?)\*\*|\[(.+?)\]\((terms|privacy)\)/g
  let last = 0
  for (const m of text.matchAll(re)) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index) })
    parts.push(m[1] !== undefined ? { text: m[1], bold: true } : { text: m[2], link: m[3] as LegalPage })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last) })
  return parts
}
