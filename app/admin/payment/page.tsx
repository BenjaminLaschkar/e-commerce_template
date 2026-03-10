import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken } from '@/lib/auth'
import { getSiteSettings } from '@/lib/site-settings'
import PaymentClient from '@/components/admin/PaymentClient'

export const dynamic = 'force-dynamic'

export default async function AdminPaymentPage() {
  const cookieStore = cookies()
  const token = cookieStore.get('admin_token')?.value
  if (!token || !verifyToken(token)) redirect('/admin/login')

  const settings = await getSiteSettings()

  return (
    <PaymentClient
      initialStripePublicKey={settings.stripePublicKey ?? ''}
      initialStripeSecretKey={settings.stripeSecretKey ? '••••••••' : ''}
      initialStripeWebhookSecret={settings.stripeWebhookSecret ? '••••••••' : ''}
      initialFreeShippingThreshold={settings.freeShippingThreshold ?? 50}
      initialShippingRules={Array.isArray(settings.shippingRules) ? settings.shippingRules as any[] : []}
      initialBlockedCountries={settings.blockedCountries ?? []}
      initialCgvContent={settings.cgvContent ?? ''}
      initialFaqContent={settings.faqContent ?? ''}
      initialDeliveryContent={settings.deliveryContent ?? ''}
      initialCgvContentEN={settings.cgvContentEN ?? ''}
      initialFaqContentEN={settings.faqContentEN ?? ''}
      initialDeliveryContentEN={settings.deliveryContentEN ?? ''}
      initialAnnounceBannerFr={settings.announceBannerFr ?? ''}
      initialAnnounceBannerEn={settings.announceBannerEn ?? ''}
      initialCheckoutDistractionFree={settings.checkoutDistractionFree ?? false}
    />
  )
}
