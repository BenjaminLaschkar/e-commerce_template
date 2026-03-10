import { prisma } from '@/lib/prisma'
import NewProductClient from './NewProductClient'

export default async function NewProductPage() {
  const allProducts = await prisma.product.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, slug: true },
  })

  return <NewProductClient allProducts={allProducts} />
}
