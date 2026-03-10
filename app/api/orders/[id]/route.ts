import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminFromRequest } from '@/lib/auth'
import { sendOrderShipped, sendOrderDelivered } from '@/lib/email'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const VALID_STATUSES = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const
const patchOrderSchema = z.object({
  status: z.enum(VALID_STATUSES).optional(),
  trackingNumber: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
})

// GET /api/orders/[id] — Admin only
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminFromRequest(req)
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      items: { include: { product: true } },
      emailLogs: { orderBy: { sentAt: 'desc' }, take: 5 },
    },
  })

  if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
  return NextResponse.json({ order })
}

// PATCH /api/orders/[id] — Update status
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminFromRequest(req)
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  let body: z.infer<typeof patchOrderSchema>
  try {
    body = patchOrderSchema.parse(await req.json())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.flatten() : 'Données invalides' },
      { status: 400 },
    )
  }

  const { status, trackingNumber, notes } = body

  const existing = await prisma.order.findUnique({
    where: { id: params.id },
    include: { customer: true, items: true },
  })

  if (!existing) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })

  const order = await prisma.order.update({
    where: { id: params.id },
    data: {
      ...(status && { status }),
      ...(trackingNumber !== undefined && { trackingNumber }),
      ...(notes !== undefined && { notes }),
      updatedAt: new Date(),
    },
    include: { customer: true, items: true },
  })

  // Trigger emails on status change
  if (status && status !== existing.status) {
    try {
      if (status === 'SHIPPED') {
        await sendOrderShipped({
          id: order.id,
          orderNumber: order.orderNumber,
          customer: {
            email: order.customer.email,
            firstName: order.customer.firstName,
          },
          trackingNumber: order.trackingNumber,
        })
      } else if (status === 'DELIVERED') {
        await sendOrderDelivered({
          id: order.id,
          orderNumber: order.orderNumber,
          customer: {
            email: order.customer.email,
            firstName: order.customer.firstName,
          },
        })
      }
    } catch (e) {
      logger.error('api', 'Erreur envoi email changement statut commande', {
        orderId: params.id,
        status,
        error: String(e),
      })
    }
  }

  // Log admin action
  await prisma.adminLog.create({
    data: {
      adminId: admin.id,
      action: `UPDATE_ORDER_STATUS`,
      details: `Commande ${order.orderNumber}: ${existing.status} → ${status}`,
    },
  })

  return NextResponse.json({ order })
}
