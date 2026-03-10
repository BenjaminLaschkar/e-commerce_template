'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Mail,
  BarChart3,
  LogOut,
  ExternalLink,
  ClipboardList,
  Terminal,
  CreditCard,
  Palette,
  Images,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/products', icon: Package, label: 'Produits' },
  { href: '/admin/orders', icon: ShoppingCart, label: 'Commandes' },
  { href: '/admin/mailing', icon: Mail, label: 'Mailing' },
  { href: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/admin/payment', icon: CreditCard, label: 'Paiement' },
  { href: '/admin/design', icon: Palette, label: 'Design' },
  { href: '/admin/media', icon: Images, label: 'Médias' },
  { href: '/admin/logs', icon: Terminal, label: 'Logs' },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
    } catch {
      // Even if the request fails, navigate away — the cookie will expire naturally
    }
    // Use full navigation (not router.push) so middleware re-runs with the cleared cookie
    window.location.href = '/admin/login'
  }

  return (
    <div className="w-60 bg-slate-900 min-h-screen flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">B</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Boutique Admin</p>
            <p className="text-slate-400 text-xs">Tableau de bord</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (href !== '/admin' && pathname.startsWith(href))
          const isDashboard = href === '/admin'
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-600 text-white'
                  : isDashboard
                  ? 'text-white/80 hover:bg-slate-800 hover:text-white border border-slate-700/60'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom links */}
      <div className="px-3 py-4 border-t border-slate-700 space-y-1">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Voir la boutique
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-red-900/30 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>
    </div>
  )
}
