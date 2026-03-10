import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken } from '@/lib/auth'
import { getSiteSettings } from '@/lib/site-settings'
import DesignClient from '@/components/admin/DesignClient'

export const dynamic = 'force-dynamic'

export default async function AdminDesignPage() {
  const cookieStore = cookies()
  const token = cookieStore.get('admin_token')?.value
  if (!token || !verifyToken(token)) redirect('/admin/login')

  const settings = await getSiteSettings()

  return (
    <DesignClient
      initialStoreName={settings.storeName}
      initialStoreTagline={settings.storeTagline ?? ''}
      initialAboutContent={settings.aboutContent ?? ''}
      initialStoreNameEN={settings.storeNameEN ?? ''}
      initialStoreTaglineEN={settings.storeTaglineEN ?? ''}
      initialAboutContentEN={settings.aboutContentEN ?? ''}
      initialPrimaryColor={settings.primaryColor ?? '#4f46e5'}
      initialFontFamily={settings.fontFamily ?? 'Inter'}
      initialLogoUrl={settings.logoUrl ?? ''}
      initialHeroImages={settings.heroImages ?? []}
    />
  )
}
