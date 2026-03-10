import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'Boutique - Formations & Produits Premium',
    template: '%s | Boutique',
  },
  description:
    'Découvrez nos formations et produits premium. Qualité garantie, satisfaction assurée.',
  keywords: ['formation', 'marketing', 'digital', 'ecommerce'],
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'Boutique',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
