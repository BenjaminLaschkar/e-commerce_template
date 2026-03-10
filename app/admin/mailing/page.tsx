import { prisma } from '@/lib/prisma'
import AdminMailingClient from '@/components/admin/MailingClient'

export const revalidate = 0

export default async function AdminMailingPage() {
  const [customers, emailLogs, products, emailTemplates] = await Promise.all([
    prisma.customer.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        _count: {
          select: { orders: true, carts: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.emailLog.findMany({
      take: 50,
      orderBy: { sentAt: 'desc' },
      include: {
        customer: { select: { firstName: true, lastName: true, email: true } },
      },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, price: true },
    }),
    prisma.emailTemplate.findMany(),
  ])

  return <AdminMailingClient customers={customers} emailLogs={emailLogs} products={products} emailTemplates={emailTemplates} />
}
