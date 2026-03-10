'use client'

import Link from 'next/link'
import { useLang } from '@/components/client/LangProvider'

interface Props {
  storeName?: string
}

export default function SiteFooter({ storeName = 'Boutique' }: Props) {
  const { t } = useLang()

  return (
    <footer className="border-t bg-gray-50 mt-auto">
      {/* Links row */}
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm font-semibold text-gray-700">{storeName}</p>

        <nav className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-gray-500">
          <Link href="/cgv" className="hover:text-indigo-600 transition-colors">
            {t.footer_cgv}
          </Link>
          <Link href="/faq" className="hover:text-indigo-600 transition-colors">
            {t.footer_faq}
          </Link>
          <Link href="/delivery" className="hover:text-indigo-600 transition-colors">
            {t.footer_delivery}
          </Link>
        </nav>

        <p className="text-xs text-gray-400">
          © {new Date().getFullYear()} {storeName} — {t.footer_rights}
        </p>
      </div>
    </footer>
  )
}
