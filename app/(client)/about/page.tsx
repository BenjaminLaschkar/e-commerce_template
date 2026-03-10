import { getSiteSettings } from '@/lib/site-settings'
import SiteHeader from '@/components/client/SiteHeader'
import SiteFooter from '@/components/client/SiteFooter'

export const revalidate = 60

export default async function AboutPage() {
  const settings = await getSiteSettings()

  const defaultContent = `
## Qui sommes-nous ?

Bienvenue chez **${settings.storeName}** ! Nous sommes une boutique en ligne dédiée à vous offrir les meilleurs produits avec un service client exceptionnel.

Notre mission est simple : vous proposer des produits de qualité, soigneusement sélectionnés, avec une expérience d'achat fluide et sécurisée.

### Nos valeurs

- **Qualité** : Chaque produit est rigoureusement sélectionné
- **Confiance** : Paiement 100% sécurisé via Stripe
- **Service** : Satisfaction garantie ou remboursé
- **Rapidité** : Expédition rapide et livraison soignée

N'hésitez pas à nous contacter pour toute question !
  `.trim()

  const content = settings.aboutContent || defaultContent

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <SiteHeader storeName={settings.storeName} logoUrl={settings.logoUrl} />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-8">Qui sommes-nous ?</h1>
        <div className="prose prose-indigo max-w-none text-gray-700 leading-relaxed whitespace-pre-line">
          {content}
        </div>
      </main>
      <SiteFooter storeName={settings.storeName} />
    </div>
  )
}
