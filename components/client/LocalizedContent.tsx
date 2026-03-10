'use client'

import { useLang } from './LangProvider'

/**
 * Renders the FR or EN text inline (for headings, labels, etc.)
 * The server renders FR by default; client switches on hydration.
 */
export function LocalizedText({ fr, en }: { fr: string; en?: string | null }) {
  const { lang } = useLang()
  return <>{lang === 'en' && en?.trim() ? en : fr}</>
}

/**
 * Renders the FR or EN text as a prose block (for page body content).
 */
export function LocalizedContent({
  fr,
  en,
  className,
}: {
  fr: string
  en?: string | null
  className?: string
}) {
  const { lang } = useLang()
  const text = lang === 'en' && en?.trim() ? en : fr
  return (
    <div className={className ?? 'prose prose-indigo max-w-none text-gray-700 leading-relaxed whitespace-pre-line'}>
      {text}
    </div>
  )
}
