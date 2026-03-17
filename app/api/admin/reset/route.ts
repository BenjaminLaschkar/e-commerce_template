import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'

/**
 * POST /api/admin/reset
 * Full shop reset: deletes ALL products, customers, orders, carts, events, email logs.
 * Admin accounts, SiteSettings and EmailTemplates are preserved.
 * Requires admin auth. Idempotent — safe to call on an already-empty shop.
 */
export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req)
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    // Delete in FK-safe order (children before parents)
    await prisma.$transaction([
      prisma.funnelEvent.deleteMany(),
      prisma.emailLog.deleteMany(),
      prisma.orderItem.deleteMany(),
      prisma.order.deleteMany(),
      prisma.cartItem.deleteMany(),
      prisma.cart.deleteMany(),
      prisma.product.deleteMany(),
      prisma.customer.deleteMany(),
      prisma.adminLog.deleteMany(),
    ])

    logger.warn('app', `RESET COMPLET exécuté par ${admin.email}`)

    return NextResponse.json({ success: true, message: 'Boutique réinitialisée avec succès.' })
  } catch (error) {
    logger.error('error', 'Reset échoué', { error: String(error) })
    return NextResponse.json({ error: 'Erreur lors du reset', detail: String(error) }, { status: 500 })
  }
}
