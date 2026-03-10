import { NextRequest, NextResponse } from 'next/server'
import { stripe, formatAmountForStripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { generateOrderNumber } from '@/lib/utils'
import { trackEvent } from '@/lib/tracking'
import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────────
// Input validation schema
// ─────────────────────────────────────────────────────────────────────────────
const cartItemSchema = z.object({
  productId: z.string().min(1),
  id: z.string().optional(), // legacy alias used in some places
  quantity: z.number().int().positive().max(100),
})

const customerSchema = z.object({
  email: z.string().email(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  address: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  zipCode: z.string().max(20).optional(),
  country: z.string().length(2).optional().default('FR'),
})

const checkoutBodySchema = z.object({
  items: z.array(cartItemSchema).min(1).max(50),
  customer: customerSchema,
  sessionId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  let body: z.infer<typeof checkoutBodySchema>
  try {
    const raw = await req.json()
    body = checkoutBodySchema.parse(raw)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.flatten() : 'Données invalides' },
      { status: 400 },
    )
  }

  const { items, customer, sessionId } = body

  // Validate products and calculate total
  const productIds = items.map((i) => i.productId ?? i.id).filter(Boolean) as string[]
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
  })

  const lineItems = []
  let total = 0

  for (const item of items) {
    const product = products.find((p) => p.id === item.productId)
    if (!product) continue
    if (product.stock < item.quantity) {
      return NextResponse.json(
        { error: `Stock insuffisant pour ${product.name}` },
        { status: 400 }
      )
    }

    const itemTotal = product.price * item.quantity
    total += itemTotal

    lineItems.push({
      price_data: {
        currency: 'eur',
        product_data: {
          name: product.name,
          images: product.images.filter(Boolean).slice(0, 1),
          description: product.shortDesc || undefined,
        },
        unit_amount: formatAmountForStripe(product.price),
      },
      quantity: item.quantity,
    })
  }

  if (lineItems.length === 0) {
    return NextResponse.json({ error: 'Aucun produit valide' }, { status: 400 })
  }

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
        phone: customer.phone,
        address: customer.address,
        city: customer.city,
        zipCode: customer.zipCode,
      },
    })
  }

  const orderNumber = generateOrderNumber()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Create Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: lineItems,
    customer_email: customer.email,
    metadata: {
      orderNumber,
      customerId: customerRecord.id,
      sessionId: sessionId || '',
    },
    success_url: `${appUrl}/confirmation?order=${orderNumber}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/checkout`,
    locale: 'fr',
    shipping_address_collection: {
      allowed_countries: ['FR', 'BE', 'CH', 'LU', 'CA'],
    },
    billing_address_collection: 'auto',
    allow_promotion_codes: true,
    payment_intent_data: {
      metadata: {
        orderNumber,
      },
    },
  })

  // Pre-create order as PENDING
  await prisma.order.create({
    data: {
      orderNumber,
      customerId: customerRecord.id,
      total,
      subtotal: total,
      status: 'PENDING',
      stripeSessionId: session.id,
      shippingAddress: {
        address: customer.address,
        city: customer.city,
        zipCode: customer.zipCode,
        country: customer.country || 'FR',
      },
      items: {
        create: items.map((item: any) => {
          const product = products.find((p) => p.id === item.id)!
          return {
            productId: item.id,
            quantity: item.quantity,
            price: product.price,
            name: product.name,
          }
        }),
      },
    },
  })

  // Track checkout start
  if (sessionId) {
    await trackEvent({
      sessionId,
      event: 'CHECKOUT_START',
      customerId: customerRecord.id,
    })
  }

  return NextResponse.json({ sessionId: session.id })
}
