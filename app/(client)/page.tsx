import { prisma } from '@/lib/prisma'
import { getSiteSettings } from '@/lib/site-settings'
import { Metadata } from 'next'
import CatalogClient from '@/components/client/CatalogClient'

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  return {
    title: settings.storeName,
    description: settings.storeTagline,
  }
}

export default async function HomePage() {
  const [products, settings] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        shortDesc: true,
        price: true,
        comparePrice: true,
        images: true,
        stock: true,
      },
    }),
    getSiteSettings(),
  ])

  return (
    <CatalogClient
      products={products}
      heroImages={settings.heroImages}
      storeName={settings.storeName}
      storeTagline={settings.storeTagline}
      storeTaglineEN={settings.storeTaglineEN ?? undefined}
      logoUrl={settings.logoUrl}
    />
  )
}
