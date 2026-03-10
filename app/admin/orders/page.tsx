import { prisma } from '@/lib/prisma'
import AdminOrdersClient from '@/components/admin/OrdersClient'

export const revalidate = 0

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      customer: true,
      items: {
        include: {
          product: { select: { name: true, images: true } },
        },
      },
    },
  })

  return <AdminOrdersClient orders={orders} />
}
