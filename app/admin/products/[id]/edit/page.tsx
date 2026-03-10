import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ProductEditClient from './ProductEditClient'

interface Props {
  params: { id: string }
}

export default async function EditProductPage({ params }: Props) {
  const [product, allProducts] = await Promise.all([
    prisma.product.findUnique({ where: { id: params.id } }),
    prisma.product.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    }),
  ])

  if (!product) notFound()

  return <ProductEditClient product={product} allProducts={allProducts} />
}
