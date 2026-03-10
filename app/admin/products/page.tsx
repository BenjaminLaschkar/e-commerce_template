import { prisma } from '@/lib/prisma'
import AdminProductsClient from '@/components/admin/ProductsClient'

export const revalidate = 0

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { orderItems: true, cartItems: true },
      },
    },
  })

  return <AdminProductsClient products={products} />
}
