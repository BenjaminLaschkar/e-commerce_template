import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendOrderConfirmation } from '@/lib/email'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const schema = z.object({
  orderNumber: z.string().min(1),
  paymentIntentId: z.string().optional(),
})

/**
 * POST /api/orders/confirm-email
 *
 * Called from the confirmation page when Stripe redirects back with
 * redirect_status=succeeded. Handles two things in an idempotent way:
 *  1. Updates the order to PAID if it is still PENDING
 *  2. Sends the ORDER_CONFIRMATION email if it hasn't been sent yet
 *
 * Safe to call multiple times — will not double-send.
 */
export async function POST(req: NextRequest) {
  let body: z.infer<typeof schema>
  try {
    body = schema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  const { orderNumber, paymentIntentId } = body

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      customer: true,
      items: { select: { name: true, quantity: true, price: true } },
      emailLogs: { where: { type: 'ORDER_CONFIRMATION' }, select: { id: true } },
    },
  })

  if (!order) {
    return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
  }

  // 1 — Update to PAID if still PENDING
  if (order.status === 'PENDING') {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'PAID',
        ...(paymentIntentId ? { stripePaymentId: paymentIntentId } : {}),
        updatedAt: new Date(),
      },
    })
    logger.info('app', `Commande marquée PAID via confirm-email: ${orderNumber}`)
  }

  // 2 — Send email only if not already sent
  if (order.emailLogs.length > 0) {
    return NextResponse.json({ alreadySent: true, sent: false })
  }

  try {
    await sendOrderConfirmation({
      id: order.id,
      orderNumber: order.orderNumber,
      customer: {
        email: order.customer.email,
        firstName: order.customer.firstName,
      },
      items: order.items,
      total: order.total,
    })
    logger.info('app', `Email de confirmation envoyé: ${orderNumber}`)
    return NextResponse.json({ alreadySent: false, sent: true })
  } catch (e) {
    logger.error('error', `Échec email confirmation: ${orderNumber}`, { error: String(e) })
    return NextResponse.json({ alreadySent: false, sent: false, error: String(e) }, { status: 500 })
  }
}
