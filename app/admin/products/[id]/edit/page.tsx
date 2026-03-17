import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ProductEditClient from './ProductEditClient'

interface Props {
  params: { id: string }
}

export default async function EditProductPage({ params }: Props) {
  const [raw, allProducts] = await Promise.all([
    prisma.product.findUnique({ where: { id: params.id } }),
    prisma.product.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    }),
  ])

  if (!raw) notFound()

  const product = {
    ...raw,
    options: raw.options as { groups: Array<{ name: string; choices: string[] }> } | null,
  }

  return <ProductEditClient product={product} allProducts={allProducts} />
}
