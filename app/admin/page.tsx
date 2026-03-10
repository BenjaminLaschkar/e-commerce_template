import { prisma } from '@/lib/prisma'
import AdminDashboardClient from '@/components/admin/DashboardClient'

export const revalidate = 0

async function getDashboardData() {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

  const [
    totalRevenue,
    totalOrders,
    todayRevenue,
    todayOrders,
    lastMonthRevenue,
    pendingOrders,
    totalCustomers,
    abandonedCarts,
    recentOrders,
    // Funnel events last 30 days
    productViews,
    addToCart,
    checkoutStart,
    paymentSuccess,
  ] = await Promise.all([
    // Total CA
    prisma.order.aggregate({
      where: { status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } },
      _sum: { total: true },
    }),
    // Total commandes
    prisma.order.count({
      where: { status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } },
    }),
    // CA aujourd'hui
    prisma.order.aggregate({
      where: {
        status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
        createdAt: { gte: today },
      },
      _sum: { total: true },
    }),
    // Commandes aujourd'hui
    prisma.order.count({
      where: { createdAt: { gte: today } },
    }),
    // CA mois dernier
    prisma.order.aggregate({
      where: {
        status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
        createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
      },
      _sum: { total: true },
    }),
    // Commandes en attente
    prisma.order.count({ where: { status: 'PENDING' } }),
    // Clients total
    prisma.customer.count(),
    // Paniers abandonnés
    prisma.cart.count({ where: { isAbandoned: true } }),
    // Dernières commandes
    prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { firstName: true, lastName: true, email: true } },
        items: { include: { product: { select: { name: true } } } },
      },
    }),
    // Funnel 30 jours
    prisma.funnelEvent.count({
      where: {
        event: 'PRODUCT_VIEW',
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.funnelEvent.count({
      where: {
        event: 'ADD_TO_CART',
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.funnelEvent.count({
      where: {
        event: 'CHECKOUT_START',
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.funnelEvent.count({
      where: {
        event: 'PAYMENT_SUCCESS',
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    }),
  ])

  const thisMonthRevenue = await prisma.order.aggregate({
    where: {
      status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
      createdAt: { gte: thisMonthStart },
    },
    _sum: { total: true },
  })

  // Revenue last 14 days
  const revenueByDay = []
  for (let i = 13; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const start = new Date(date.setHours(0, 0, 0, 0))
    const end = new Date(new Date(start).setHours(23, 59, 59, 999))

    const rev = await prisma.order.aggregate({
      where: {
        status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
        createdAt: { gte: start, lte: end },
      },
      _sum: { total: true },
      _count: true,
    })

    revenueByDay.push({
      date: start.toISOString().split('T')[0],
      revenue: rev._sum.total || 0,
      orders: rev._count,
    })
  }

  const conversionRate = productViews > 0 ? ((paymentSuccess / productViews) * 100).toFixed(1) : '0'

  return {
    stats: {
      totalRevenue: totalRevenue._sum.total || 0,
      totalOrders,
      todayRevenue: todayRevenue._sum.total || 0,
      todayOrders,
      thisMonthRevenue: thisMonthRevenue._sum.total || 0,
      lastMonthRevenue: lastMonthRevenue._sum.total || 0,
      pendingOrders,
      totalCustomers,
      abandonedCarts,
      conversionRate,
    },
    funnel: { productViews, addToCart, checkoutStart, paymentSuccess },
    recentOrders,
    revenueByDay,
  }
}

export default async function AdminDashboard() {
  const data = await getDashboardData()
  return <AdminDashboardClient data={data} />
}
