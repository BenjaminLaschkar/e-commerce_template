'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShoppingCart, Package, Menu, X, Globe } from 'lucide-react'
import { useCart } from '@/components/client/CartProvider'
import { useLang } from '@/components/client/LangProvider'
import { cn } from '@/lib/utils'

interface Props {
  storeName?: string
  logoUrl?: string | null
}

export default function SiteHeader({ storeName = 'Boutique', logoUrl }: Props) {
  const { totalItems } = useCart()
  const { t, toggleLang } = useLang()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const navLinks = [
    { href: '/', label: t.home },
    { href: '/about', label: t.about },
  ]

  return (
    <header className="bg-white border-b sticky top-0 z-40 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={storeName} className="h-8 w-auto object-contain" />
          ) : (
            <div className="w-8 h-8 bg-brand-accent rounded-lg flex items-center justify-center shrink-0">
              <Package className="w-4 h-4 text-white" />
            </div>
          )}
          <span className="font-bold text-gray-900 text-lg hidden sm:inline">{storeName}</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'hover:text-brand-accent transition-colors font-medium',
                pathname === href && 'text-brand-accent'
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Lang toggle */}
          <button
            onClick={toggleLang}
            className="hidden sm:flex items-center gap-1 text-xs text-gray-500 hover:text-brand-accent transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200"
          >
            <Globe className="w-3.5 h-3.5" />
            {t.lang}
          </button>

          {/* Cart icon */}
          <Link href="/cart" className="relative p-2 text-gray-600 hover:text-brand-accent transition-colors">
            <ShoppingCart className="w-5 h-5" />
            {totalItems > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-brand-accent text-white text-[10px] leading-none rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </Link>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-gray-600 hover:text-brand-accent"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t bg-white px-4 py-3 space-y-1">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={cn(
                'block py-2.5 px-3 rounded-lg text-sm font-medium transition-colors',
                pathname === href
                  ? 'bg-brand-secondary text-brand-accent'
                  : 'text-gray-700 hover:bg-gray-50'
              )}
            >
              {label}
            </Link>
          ))}
          <button
            onClick={() => { toggleLang(); setMenuOpen(false) }}
            className="w-full flex items-center gap-2 py-2.5 px-3 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
          >
            <Globe className="w-4 h-4" />
            {t.langFull}
          </button>
        </div>
      )}
    </header>
  )
}
