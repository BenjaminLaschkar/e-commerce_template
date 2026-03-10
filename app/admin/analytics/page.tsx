import { prisma } from '@/lib/prisma'
import { getFunnelStats, getDailyFunnelStats } from '@/lib/tracking'
import AdminAnalyticsClient from '@/components/admin/AnalyticsClient'

export const revalidate = 0

export default async function AdminAnalyticsPage() {
  const [funnelStats, dailyStats, products] = await Promise.all([
    getFunnelStats(undefined, 30),
    getDailyFunnelStats(14),
    prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
    }),
  ])

  // Event breakdown
  const eventBreakdown = await prisma.funnelEvent.groupBy({
    by: ['event'],
    _count: { event: true },
    where: {
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
  })

  // Top products by views
  const topProducts = await prisma.funnelEvent.groupBy({
    by: ['productId'],
    _count: { productId: true },
    where: {
      event: 'PRODUCT_VIEW',
      productId: { not: null },
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { _count: { productId: 'desc' } },
    take: 5,
  })

  return (
    <AdminAnalyticsClient
      funnelStats={funnelStats}
      dailyStats={dailyStats}
      eventBreakdown={eventBreakdown}
      topProducts={topProducts}
      products={products}
    />
  )
}
