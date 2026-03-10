import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSiteSettings } from '@/lib/site-settings'
import { generateOrderNumber } from '@/lib/utils'
import { logger } from '@/lib/logger'
import Stripe from 'stripe'
import { z } from 'zod'

export const runtime = 'nodejs'

// ─────────────────────────────────────────────────────────────────────────────
// Input validation
// ─────────────────────────────────────────────────────────────────────────────
const piItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().max(100),
})

const piCustomerSchema = z.object({
  email: z.string().email(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  address: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  zipCode: z.string().max(20).optional(),
  country: z.string().length(2).optional().default('FR'),
})

const paymentIntentBodySchema = z.object({
  items: z.array(piItemSchema).min(1).max(50),
  customer: piCustomerSchema,
  sessionId: z.string().optional(),
})

/**
 * POST /api/stripe/payment-intent
 * Creates a Stripe PaymentIntent and a PENDING order.
 * Returns { clientSecret, orderNumber } to the client.
 */
export async function POST(req: NextRequest) {
  let body: z.infer<typeof paymentIntentBodySchema>
  try {
    body = paymentIntentBodySchema.parse(await req.json())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.flatten() : 'Données invalides' },
      { status: 400 },
    )
  }

  const { items, customer, sessionId } = body

  // Get Stripe secret key from settings (or fallback to env)
  const siteSettings = await getSiteSettings()
  const secretKey = siteSettings.stripeSecretKey || process.env.STRIPE_SECRET_KEY

  if (!secretKey) {
    return NextResponse.json(
      { error: 'Stripe non configuré. Ajoutez vos clés API dans l\'admin.' },
      { status: 503 }
    )
  }

  const stripe = new Stripe(secretKey, { apiVersion: '2024-04-10' as any })

  // Validate products and calculate total — prices come from DB, never from client
  const productIds = items.map((i) => i.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
  })

  let total = 0
  const validatedItems: Array<{ product: typeof products[0]; quantity: number }> = []

  for (const item of items) {
    const product = products.find((p) => p.id === item.productId)
    if (!product) continue
    if (product.stock < item.quantity) {
      return NextResponse.json(
        { error: `Stock insuffisant pour ${product.name}` },
        { status: 400 }
      )
    }
    validatedItems.push({ product, quantity: item.quantity })
    total += product.price * item.quantity
  }

  if (validatedItems.length === 0) {
    return NextResponse.json({ error: 'Aucun produit valide' }, { status: 400 })
  }

  // Apply shipping cost
  const { shippingRules, blockedCountries, freeShippingThreshold } = siteSettings
  const countryCode = customer.country ?? 'FR'

  // Blocked-country check — managed via the separate blockedCountries[] list
  if (Array.isArray(blockedCountries) && blockedCountries.includes(countryCode)) {
    return NextResponse.json(
      { error: `Les livraisons vers ${countryCode} ne sont pas disponibles.` },
      { status: 400 },
    )
  }

  const rule = Array.isArray(shippingRules)
    ? (shippingRules as Array<{ country: string; price?: number; freeThreshold?: number | null }>).find(
        (r) => r.country === countryCode,
      )
    : null

  const shippingCost =
    rule && total < ((rule.freeThreshold ?? freeShippingThreshold) ?? 0)
      ? rule.price ?? 0
      : 0

  const orderTotal = total + shippingCost

  // Find or create customer
  let customerRecord = await prisma.customer.findUnique({
    where: { email: customer.email },
  })

  if (!customerRecord) {
    customerRecord = await prisma.customer.create({
      data: {
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        address: customer.address,
        city: customer.city,
        zipCode: customer.zipCode,
        country: countryCode,
      },
    })
  }

  const orderNumber = generateOrderNumber()

  // Create PENDING order
  const order = await prisma.order.create({
    data: {
      orderNumber,
      customerId: customerRecord.id,
      total: orderTotal,
      subtotal: total,
      shipping: shippingCost,
      status: 'PENDING',
      shippingAddress: {
        address: customer.address,
        city: customer.city,
        zipCode: customer.zipCode,
        country: countryCode,
      },
      items: {
        create: validatedItems.map(({ product, quantity }) => ({
          productId: product.id,
          quantity,
          price: product.price,
          name: product.name,
        })),
      },
    },
  })

  // Create Stripe PaymentIntent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(orderTotal * 100), // cents
    currency: 'eur',
    metadata: {
      orderNumber,
      customerId: customerRecord.id,
      sessionId: sessionId || '',
    },
    receipt_email: customer.email,
    description: `Commande ${orderNumber}`,
  })

  logger.info('stripe', `PaymentIntent créé: ${paymentIntent.id}`, { orderNumber, total: orderTotal })
  logger.info('db', `Order PENDING créé: ${orderNumber}`, { id: order.id })

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    orderNumber,
    publishableKey: siteSettings.stripePublicKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  })
}
