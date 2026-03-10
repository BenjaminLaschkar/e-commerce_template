import { getSiteSettings } from '@/lib/site-settings'
import SiteHeader from '@/components/client/SiteHeader'
import SiteFooter from '@/components/client/SiteFooter'
import { LocalizedText, LocalizedContent } from '@/components/client/LocalizedContent'

export const revalidate = 60

export default async function CGVPage() {
  const settings = await getSiteSettings()

  const defaultContent = `
## Conditions Générales de Vente

**Dernière mise à jour : ${new Date().toLocaleDateString('fr-FR')}**

### 1. Objet

Les présentes Conditions Générales de Vente régissent les ventes effectuées sur le site ${settings.storeName}.

### 2. Commandes

Toute commande implique l’acceptation des présentes CGV. La vente n’est définitive qu’après confirmation du paiement.

### 3. Prix

Les prix sont indiqués en euros TTC. Nous nous réservons le droit de modifier les prix à tout moment.

### 4. Paiement

Le paiement s’effectue en ligne par carte bancaire via Stripe, une plateforme sécurisée. Aucune donnée bancaire n’est stockée sur nos serveurs.

### 5. Livraison

Les délais de livraison sont indiqués sur la page « Délais de livraison ». En cas de retard, le client sera informé par email.

### 6. Droit de rétractation

Conformément à la loi, vous disposez d’un délai de 14 jours pour exercer votre droit de rétractation sans justification.

### 7. Retours

Les produits doivent être retournés dans leur état d’origine. Les frais de retour sont à la charge du client sauf en cas de produit défectueux.

### 8. Données personnelles

Vos données sont traitées conformément à notre politique de confidentialité et au RGPD.

### 9. Litiges

En cas de litige, une solution amiable sera recherchée avant tout recours judiciaire.
  `.trim()

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <SiteHeader storeName={settings.storeName} logoUrl={settings.logoUrl} />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-8">
          <LocalizedText fr="Conditions Générales de Vente" en="Terms & Conditions" />
        </h1>
        <LocalizedContent
          fr={settings.cgvContent || defaultContent}
          en={settings.cgvContentEN}
        />
      </main>
      <SiteFooter storeName={settings.storeName} />
    </div>
  )
}
