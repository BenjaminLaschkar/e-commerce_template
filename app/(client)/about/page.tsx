import { getSiteSettings } from '@/lib/site-settings'
import AboutClient from './_client'

export const revalidate = 60

export default async function AboutPage() {
  const settings = await getSiteSettings()

  return (
    <AboutClient
      storeName={settings.storeName}
      logoUrl={settings.logoUrl}
      aboutContentFr={settings.aboutContent ?? ''}
      aboutContentEn={settings.aboutContentEN ?? ''}
    />
  )
}

