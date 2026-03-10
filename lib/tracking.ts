import { prisma } from './prisma'
import { EventType } from '@prisma/client'

// ============================================
// TRACK FUNNEL EVENT
// ============================================
export async function trackEvent({
  sessionId,
  event,
  productId,
  customerId,
  metadata,
  ip,
  userAgent,
}: {
  sessionId: string
  event: EventType
  productId?: string
  customerId?: string
  metadata?: Record<string, unknown>
  ip?: string
  userAgent?: string
}) {
  try {
    await prisma.funnelEvent.create({
      data: {
        sessionId,
        event,
        productId,
        customerId,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        ip,
        userAgent,
      },
    })
  } catch (error) {
    // Non-fatal: tracking failures must never crash the app
    // Use a direct import to avoid circular deps with lib/logger
    try {
      const { logger } = await import('./logger')
      logger.error('api', 'Erreur tracking event', { event, error: String(error) })
    } catch { /* ignore */ }
  }
}

// ============================================
// ANALYTICS FUNNEL
// ============================================
export async function getFunnelStats(productId?: string, days = 30) {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const where = {
    createdAt: { gte: since },
    ...(productId ? { productId } : {}),
  }

  const [
    productViews,
    addToCart,
    checkoutStart,
    paymentSuccess,
    cartAbandon,
    upsellViews,
    upsellAccept,
  ] = await Promise.all([
    prisma.funnelEvent.count({ where: { ...where, event: 'PRODUCT_VIEW' } }),
    prisma.funnelEvent.count({ where: { ...where, event: 'ADD_TO_CART' } }),
    prisma.funnelEvent.count({ where: { ...where, event: 'CHECKOUT_START' } }),
    prisma.funnelEvent.count({ where: { ...where, event: 'PAYMENT_SUCCESS' } }),
    prisma.funnelEvent.count({ where: { ...where, event: 'CART_ABANDON' } }),
    prisma.funnelEvent.count({ where: { ...where, event: 'UPSELL_VIEW' } }),
    prisma.funnelEvent.count({ where: { ...where, event: 'UPSELL_ACCEPT' } }),
  ])

  const conversionRate = productViews > 0 ? (paymentSuccess / productViews) * 100 : 0
  const cartAbandonRate = addToCart > 0 ? (cartAbandon / addToCart) * 100 : 0
  const checkoutConversionRate = checkoutStart > 0 ? (paymentSuccess / checkoutStart) * 100 : 0
  const upsellConversionRate = upsellViews > 0 ? (upsellAccept / upsellViews) * 100 : 0

  return {
    steps: [
      { name: 'Vues produit', value: productViews, event: 'PRODUCT_VIEW' },
      { name: 'Ajout panier', value: addToCart, event: 'ADD_TO_CART' },
      { name: 'Checkout', value: checkoutStart, event: 'CHECKOUT_START' },
      { name: 'Paiement réussi', value: paymentSuccess, event: 'PAYMENT_SUCCESS' },
    ],
    metrics: {
      productViews,
      addToCart,
      checkoutStart,
      paymentSuccess,
      cartAbandon,
      upsellViews,
      upsellAccept,
      conversionRate: parseFloat(conversionRate.toFixed(2)),
      cartAbandonRate: parseFloat(cartAbandonRate.toFixed(2)),
      checkoutConversionRate: parseFloat(checkoutConversionRate.toFixed(2)),
      upsellConversionRate: parseFloat(upsellConversionRate.toFixed(2)),
    },
  }
}

// ============================================
// DAILY STATS
// ============================================
export async function getDailyFunnelStats(days = 14) {
  const stats = []

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const start = new Date(date.setHours(0, 0, 0, 0))
    const end = new Date(date.setHours(23, 59, 59, 999))

    const [views, sales, revenue] = await Promise.all([
      prisma.funnelEvent.count({
        where: { event: 'PRODUCT_VIEW', createdAt: { gte: start, lte: end } },
      }),
      prisma.funnelEvent.count({
        where: { event: 'PAYMENT_SUCCESS', createdAt: { gte: start, lte: end } },
      }),
      prisma.order.aggregate({
        where: {
          status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
          createdAt: { gte: start, lte: end },
        },
        _sum: { total: true },
      }),
    ])

    stats.push({
      date: start.toISOString().split('T')[0],
      views,
      sales,
      revenue: revenue._sum.total || 0,
    })
  }

  return stats
}
