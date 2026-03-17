import { Metadata } from 'next'
import { CartProvider } from '@/components/client/CartProvider'

export const dynamic = 'force-dynamic'
import { LangProvider } from '@/components/client/LangProvider'
import { SettingsProvider } from '@/components/client/SettingsProvider'
import { getSiteSettings } from '@/lib/site-settings'

export const metadata: Metadata = {
  title: {
    default: 'Boutique',
    template: '%s | Boutique',
  },
}

/** Convert #rrggbb hex to "H S% L%" (HSL format used by shadcn CSS variables) */
function hexToHsl(hex: string): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!m) return '239 84% 67%'
  let r = parseInt(m[1], 16) / 255
  let g = parseInt(m[2], 16) / 255
  let b = parseInt(m[3], 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings()
  const primaryHsl = hexToHsl(settings.primaryColor ?? '#4f46e5')
  const css = `:root { --primary: ${primaryHsl}; --ring: ${primaryHsl}; }`

  const publicSettings = {
    storeName: settings.storeName,
    logoUrl: settings.logoUrl ?? null,
    announceBannerFr: settings.announceBannerFr ?? null,
    announceBannerEn: settings.announceBannerEn ?? null,
    checkoutDistractionFree: settings.checkoutDistractionFree ?? false,
    freeShippingThreshold: settings.freeShippingThreshold ?? 0,
  }

  return (
    <LangProvider>
      <CartProvider>
        <SettingsProvider settings={publicSettings}>
          {/* eslint-disable-next-line react/no-danger */}
          <style dangerouslySetInnerHTML={{ __html: css }} />
          {children}
        </SettingsProvider>
      </CartProvider>
    </LangProvider>
  )
}
