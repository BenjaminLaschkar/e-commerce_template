import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import ProductPageClient from '@/components/client/ProductPageClient'

export const revalidate = 60

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
    select: { name: true, shortDesc: true, description: true, images: true },
  })
  if (!product) return { title: 'Produit introuvable' }
  return {
    title: product.name,
    description:
      product.shortDesc ||
      (product.description ?? '').replace(/<[^>]*>/g, '').substring(0, 160),
    openGraph: {
      title: product.name,
      description: product.shortDesc ?? '',
      images: product.images[0] ? [product.images[0]] : [],
    },
  }
}

export async function generateStaticParams() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { slug: true },
  })
  return products.map((p) => ({ slug: p.slug }))
}

export default async function ProductPage({ params }: Props) {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug, isActive: true },
  })

  if (!product) notFound()

  return <ProductPageClient product={product} />
}
