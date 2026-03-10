import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { sendOrderConfirmation } from '@/lib/email'
import { trackEvent } from '@/lib/tracking'
import { logger } from '@/lib/logger'
import Stripe from 'stripe'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Signature manquante' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Signature invalide'
    logger.error('stripe', 'Webhook signature invalide', { message })
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 })
  }

  // ── Idempotency guard ─────────────────────────────────────────────────────
  // Stripe can deliver the same event more than once. We use the order's
  // current status as a natural idempotency key: if the order is already PAID
  // we skip the handler and return 200 so Stripe stops retrying.
  logger.info('stripe', `Webhook reçu: ${event.type}`, { id: event.id })

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        // Idempotency: skip if already processed (order already PAID)
        if (session.metadata?.orderNumber) {
          const existing = await prisma.order.findUnique({
            where: { orderNumber: session.metadata.orderNumber },
            select: { status: true },
          })
          if (existing?.status === 'PAID') {
            logger.info('stripe', `Webhook doublon ignoré: ${event.type}`, { id: event.id, orderNumber: session.metadata.orderNumber })
            return NextResponse.json({ received: true, skipped: 'already_processed' })
          }
        }
        await handlePaymentSuccess(session)
        break
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await handlePaymentFailed(paymentIntent)
        break
      }
      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.metadata?.orderNumber) {
          await prisma.order.updateMany({
            where: { orderNumber: session.metadata.orderNumber, status: 'PENDING' },
            data: { status: 'CANCELLED' },
          })
          logger.warn('stripe', 'Session Stripe expirée — commande annulée', { orderNumber: session.metadata.orderNumber })
        }
        break
      }
      case 'payment_intent.succeeded': {
        // Handled via payment-intent flow (idempotency: check order stripePaymentId)
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        if (paymentIntent.metadata?.orderNumber) {
          const existing = await prisma.order.findUnique({
            where: { orderNumber: paymentIntent.metadata.orderNumber },
            select: { status: true },
          })
          if (existing?.status === 'PAID') {
            logger.info('stripe', `Webhook doublon ignoré: ${event.type}`, { id: event.id })
            return NextResponse.json({ received: true, skipped: 'already_processed' })
          }
          await prisma.order.updateMany({
            where: { orderNumber: paymentIntent.metadata.orderNumber, status: 'PENDING' },
            data: { status: 'PAID', stripePaymentId: paymentIntent.id },
          })
          logger.info('stripe', `PaymentIntent réussi: ${paymentIntent.id}`, { orderNumber: paymentIntent.metadata.orderNumber })
        }
        break
      }
    }
  } catch (error) {
    logger.error('stripe', 'Erreur handler webhook', { event: event.type, error: String(error) })
    logger.error('error', 'Stripe webhook handler crash', { event: event.type, error: String(error) })
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function handlePaymentSuccess(session: Stripe.Checkout.Session) {
  const { orderNumber, customerId, sessionId } = session.metadata || {}

  if (!orderNumber) {
    logger.error('stripe', 'checkout.session.completed sans orderNumber dans metadata', { sessionId: session.id })
    return
  }

  // Update order status
  const order = await prisma.order.update({
    where: { orderNumber },
    data: {
      status: 'PAID',
      stripePaymentId: session.payment_intent as string,
      updatedAt: new Date(),
    },
    include: {
      customer: true,
      items: {
        include: { product: true },
      },
    },
  })

  // Decrease stock
  for (const item of order.items) {
    await prisma.product.update({
      where: { id: item.productId },
      data: {
        stock: { decrement: item.quantity },
      },
    })
  }

  // Track payment success
  if (sessionId) {
    await trackEvent({
      sessionId,
      event: 'PAYMENT_SUCCESS',
      customerId: order.customerId,
      metadata: { orderNumber, total: order.total },
    })
  }

  // Send confirmation email
  try {
    await sendOrderConfirmation({
      id: order.id,
      orderNumber: order.orderNumber,
      customer: {
        email: order.customer.email,
        firstName: order.customer.firstName,
      },
      items: order.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      total: order.total,
    })
  } catch (e) {
    logger.warn('stripe', 'Échec envoi email de confirmation', { orderNumber, error: String(e) })
  }

  logger.info('stripe', `Paiement validé: ${orderNumber}`, { total: order.total, customerId: order.customerId })
  logger.info('app', `Nouvelle commande payée: ${orderNumber}`, { total: order.total })
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const { orderNumber } = paymentIntent.metadata || {}

  if (orderNumber) {
    await prisma.order.updateMany({
      where: { orderNumber, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    })
  }

  logger.warn('stripe', `Paiement échoué: ${orderNumber}`)
  logger.warn('error', `Paiement Stripe échoué: ${orderNumber}`)
}
