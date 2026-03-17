'use client'

import { useLang } from '@/components/client/LangProvider'
import SiteHeader from '@/components/client/SiteHeader'
import SiteFooter from '@/components/client/SiteFooter'

interface Props {
  storeName: string
  logoUrl?: string | null
  aboutContentFr: string
  aboutContentEn: string
}

const DEFAULT_FR = (storeName: string) => `
## Qui sommes-nous ?

Bienvenue chez **${storeName}** ! Nous sommes une boutique en ligne dédiée à vous offrir les meilleurs produits avec un service client exceptionnel.

Notre mission est simple : vous proposer des produits de qualité, soigneusement sélectionnés, avec une expérience d'achat fluide et sécurisée.

### Nos valeurs

- **Qualité** : Chaque produit est rigoureusement sélectionné
- **Confiance** : Paiement 100% sécurisé via Stripe
- **Service** : Satisfaction garantie ou remboursé
- **Rapidité** : Expédition rapide et livraison soignée

N'hésitez pas à nous contacter pour toute question !
`.trim()

const DEFAULT_EN = (storeName: string) => `
## About us

Welcome to **${storeName}**! We are an online store dedicated to offering you the best products with exceptional customer service.

Our mission is simple: to provide you with quality products, carefully selected, with a smooth and secure shopping experience.

### Our values

- **Quality**: Every product is rigorously selected
- **Trust**: 100% secure payment via Stripe
- **Service**: Satisfaction guaranteed or money back
- **Speed**: Fast shipping and careful delivery

Feel free to contact us with any questions!
`.trim()

export default function AboutClient({ storeName, logoUrl, aboutContentFr, aboutContentEn }: Props) {
  const { t, lang } = useLang()

  const content = lang === 'en'
    ? (aboutContentEn || DEFAULT_EN(storeName))
    : (aboutContentFr || DEFAULT_FR(storeName))

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <SiteHeader storeName={storeName} logoUrl={logoUrl} />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-8">
          {t.about_title}
        </h1>
        <div className="prose prose-indigo max-w-none text-gray-700 leading-relaxed whitespace-pre-line">
          {content}
        </div>
      </main>
      <SiteFooter storeName={storeName} />
    </div>
  )
}
