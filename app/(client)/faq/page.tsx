import { getSiteSettings } from '@/lib/site-settings'
import FaqClient from './_client'

export const revalidate = 60

export default async function FAQPage() {
  const settings = await getSiteSettings()
  return (
    <FaqClient
      storeName={settings.storeName}
      logoUrl={settings.logoUrl ?? null}
      faqContentFr={settings.faqContent ?? ''}
      faqContentEn={settings.faqContentEN ?? null}
    />
  )
}
