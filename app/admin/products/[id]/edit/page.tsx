import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ProductEditClient from './ProductEditClient'

interface Props {
  params: { id: string }
}

export default async function EditProductPage({ params }: Props) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
  })

  if (!product) notFound()

  return <ProductEditClient product={product} />
}
