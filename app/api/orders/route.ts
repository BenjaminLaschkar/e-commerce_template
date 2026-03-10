import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminFromRequest } from '@/lib/auth'
import { generateOrderNumber } from '@/lib/utils'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().max(100),
  price: z.number().positive(),
  name: z.string().min(1).max(200),
})

const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1).max(50),
  total: z.number().positive(),
  stripeSessionId: z.string().optional(),
  customer: z.object({
    email: z.string().email(),
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    phone: z.string().max(30).optional(),
    address: z.string().max(200).optional(),
    city: z.string().max(100).optional(),
    zipCode: z.string().max(20).optional(),
    country: z.string().length(2).optional().default('FR'),
  }),
})

// GET /api/orders
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const orderNumber = searchParams.get('orderNumber')
  const customerId = searchParams.get('customerId')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  if (orderNumber) {
    // Public endpoint: only return non-sensitive fields (used by confirmation page)
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      select: {
        orderNumber: true,
        status: true,
        total: true,
        subtotal: true,
        shipping: true,
        createdAt: true,
        // Only first name + masked email for display — no address, no phone
        customer: { select: { firstName: true, lastName: true } },
        items: {
          select: {
            quantity: true,
            price: true,
            name: true,
            product: { select: { name: true, images: true } },
          },
        },
      },
    })
    return NextResponse.json({ order })
  }

  const admin = await getAdminFromRequest(req)
  if (!admin) {
    logger.warn('api', 'Accès non autorisé GET /api/orders')
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: customerId ? { customerId } : {},
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        items: { include: { product: { select: { name: true, images: true } } } },
      },
    }),
    prisma.order.count({ where: customerId ? { customerId } : {} }),
  ])

  return NextResponse.json({ orders, total, page, limit })
}

// POST /api/orders
export async function POST(req: NextRequest) {
  let body: z.infer<typeof createOrderSchema>
  try {
    const raw = await req.json()
    body = createOrderSchema.parse(raw)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.flatten() : 'Données invalides' },
      { status: 400 },
    )
  }

  const { items, customer, total, stripeSessionId } = body

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
        country: customer.country || 'FR',
      },
    })
  }

  const orderNumber = generateOrderNumber()

  const order = await prisma.order.create({
    data: {
      orderNumber,
      customerId: customerRecord.id,
      total,
      subtotal: total,
      status: 'PENDING',
      stripeSessionId,
      shippingAddress: {
        address: customer.address,
        city: customer.city,
        zipCode: customer.zipCode,
        country: customer.country || 'FR',
      },
      items: {
        create: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          name: item.name,
        })),
      },
    },
    include: {
      customer: true,
      items: { include: { product: true } },
    },
  })

  logger.info('api', `Commande créée: ${order.orderNumber}`, { total: order.total, customerId: order.customerId })
  logger.info('db', `Order inserté: ${order.orderNumber}`, { id: order.id })

  return NextResponse.json({ order }, { status: 201 })
}
