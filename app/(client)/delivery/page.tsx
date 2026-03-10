import { getSiteSettings } from '@/lib/site-settings'
import DeliveryClient from './_client'

export const revalidate = 60

export default async function DeliveryPage() {
  const settings = await getSiteSettings()
  const shippingRules = Array.isArray(settings.shippingRules) ? (settings.shippingRules as any[]) : []

  const defaultContent = [
    "Nous expedions vos commandes avec soin et rapidite. Vous recevrez un email de confirmation des l'expedition.",
    '',
    '**Delais estimes :**',
    '- France metropolitaine : 3 a 5 jours ouvres',
    '- Europe : 5 a 10 jours ouvres',
    '- International : 7 a 21 jours ouvres',
    '',
    '**Suivi de commande :** Un numero de suivi vous sera communique par email.',
  ].join('\n')

  return (
    <DeliveryClient
      storeName={settings.storeName}
      logoUrl={settings.logoUrl ?? null}
      deliveryContentFr={settings.deliveryContent || defaultContent}
      deliveryContentEn={settings.deliveryContentEN ?? null}
      shippingRules={shippingRules}
    />
  )
}
