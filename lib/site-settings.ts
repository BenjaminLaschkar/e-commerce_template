/**
 * SiteSettings helper — server-side only.
 * Uses a singleton Prisma row (id = "singleton").
 */

import { prisma } from './prisma'
import type { SiteSettings } from '@prisma/client'

export type { SiteSettings }

export interface ShippingRule {
  country: string       // ISO-3166-1 alpha-2 (e.g. "FR")
  countryName?: string  // Display name (optional)
  price: number         // In EUR, 0 = free
  freeThreshold?: number | null  // Per-country free-shipping floor (null = use global)
  estimatedDays?: string         // e.g. "3-5 jours"
}

const DEFAULTS = {
  storeName: 'Boutique',
  storeTagline: 'Des produits qui font la différence',
  aboutContent: 'Bienvenue dans notre boutique. Nous proposons une sélection rigoureuse de produits de qualité, livrés rapidement partout en France.',
  primaryColor: '#4f46e5',
  fontFamily: 'Inter',
  heroImages: [] as string[],
  logoUrl: null as string | null,
  stripePublicKey: null as string | null,
  stripeSecretKey: null as string | null,
  stripeWebhookSecret: null as string | null,
  freeShippingThreshold: 0,
  shippingRules: [] as ShippingRule[],
  cgvContent: `# Conditions Générales de Vente\n\n## Article 1 – Objet\nLes présentes CGV régissent les ventes effectuées sur ce site.\n\n## Article 2 – Prix\nLes prix sont indiqués en euros TTC.\n\n## Article 3 – Paiement\nLe paiement est sécurisé via Stripe.\n\n## Article 4 – Livraison\nLa livraison est effectuée dans les délais indiqués.\n\n## Article 5 – Droit de rétractation\nVous disposez de 14 jours pour vous rétracter.`,
  faqContent: `# Foire aux Questions\n\n## Comment passer commande ?\nAjoutez vos produits au panier puis procédez au paiement.\n\n## Quels sont les délais de livraison ?\nLivraison sous 3 à 5 jours ouvrés.\n\n## Comment suivre ma commande ?\nVous recevrez un email avec votre numéro de suivi.\n\n## Puis-je retourner un article ?\nOui, dans les 30 jours suivant la réception.`,
  deliveryContent: `# Délais et Frais de Livraison\n\n## France métropolitaine\nLivraison standard : 3-5 jours ouvrés\nLivraison express : 24h\n\n## Belgique / Suisse / Luxembourg\nLivraison : 5-7 jours ouvrés\n\n## Canada\nLivraison : 7-14 jours ouvrés`,
}

export type SiteSettingsWithRules = Omit<SiteSettings, 'shippingRules'> & {
  shippingRules: ShippingRule[]
  blockedCountries: string[]
}

export async function getSiteSettings(): Promise<SiteSettingsWithRules> {
  // READ-ONLY path: findUnique avoids touching updatedAt on every page load
  // and cannot interfere with concurrent PATCH requests.
  let row = await prisma.siteSettings.findUnique({ where: { id: 'singleton' } })

  if (!row) {
    // First boot: create the defaults row. Use upsert to handle race conditions
    // between concurrent requests that all see null simultaneously.
    row = await prisma.siteSettings.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        ...DEFAULTS,
        shippingRules: JSON.parse(JSON.stringify(DEFAULTS.shippingRules)),
      },
      update: {}, // another request already created it — keep as-is
    })
  }

  const { shippingRules, ...rest } = row
  return {
    ...rest,
    shippingRules: ((shippingRules ?? []) as unknown) as ShippingRule[],
  }
}

export async function updateSiteSettings(
  data: Partial<Omit<SiteSettings, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<SiteSettingsWithRules> {
  // Serialize any arrays/objects for Prisma JSON fields
  const serialized: any = { ...data }
  if (Array.isArray(serialized.shippingRules)) {
    serialized.shippingRules = JSON.parse(JSON.stringify(serialized.shippingRules))
  }
  if (Array.isArray(serialized.blockedCountries)) {
    serialized.blockedCountries = [...serialized.blockedCountries]
  }
  const result = await prisma.siteSettings.upsert({
    where: { id: 'singleton' },
    create: {
      id: 'singleton',
      ...DEFAULTS,
      shippingRules: JSON.parse(JSON.stringify(DEFAULTS.shippingRules)),
      ...serialized,
    } as any,
    update: serialized,
  })
  const { shippingRules, ...rest } = result
  return { ...rest, shippingRules: ((shippingRules ?? []) as unknown) as ShippingRule[] }
}

/** Returns only the public-safe subset (no secret keys) */
export function publicSettings(s: SiteSettingsWithRules) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { stripeSecretKey, stripeWebhookSecret, ...pub } = s
  return pub
}
