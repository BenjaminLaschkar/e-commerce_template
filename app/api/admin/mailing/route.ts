import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendCampaign } from '@/lib/email'
import { z } from 'zod'

const VALID_SEGMENTS = ['all', 'buyers', 'abandoned', 'visitors'] as const

const campaignSchema = z.object({
  segment: z.enum(VALID_SEGMENTS),
  subject: z.string().min(1).max(200),
  content: z.string().min(1).max(100_000),
  productId: z.string().optional(),
})

// GET /api/admin/mailing — List email logs
export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req)
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')

  const logs = await prisma.emailLog.findMany({
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { sentAt: 'desc' },
    include: {
      customer: { select: { firstName: true, lastName: true, email: true } },
    },
  })

  return NextResponse.json({ logs })
}

// POST /api/admin/mailing — Send campaign
export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req)
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  let body: z.infer<typeof campaignSchema>
  try {
    body = campaignSchema.parse(await req.json())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.flatten() : 'Données invalides' },
      { status: 400 },
    )
  }

  const { segment, subject, content, productId } = body

  // Get recipients by segment
  let customers: { id: string; email: string }[] = []

  if (segment === 'all') {
    customers = await prisma.customer.findMany({ select: { id: true, email: true } })
  } else if (segment === 'buyers') {
    const orders = await prisma.order.findMany({
      where: { status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } },
      select: { customer: { select: { id: true, email: true } } },
      distinct: ['customerId'],
    })
    customers = orders.map((o) => o.customer)
  } else if (segment === 'abandoned') {
    const carts = await prisma.cart.findMany({
      where: { isAbandoned: true, customerId: { not: null } },
      select: { customer: { select: { id: true, email: true } } },
      distinct: ['customerId'],
    })
    customers = carts.filter((c) => c.customer).map((c) => c.customer!)
  } else if (segment === 'visitors') {
    const events = await prisma.funnelEvent.findMany({
      where: { customerId: { not: null } },
      select: { customer: { select: { id: true, email: true } } },
      distinct: ['customerId'],
    })
    customers = events.filter((e) => e.customer).map((e) => e.customer!)
  }

  // Remove duplicates
  const unique = Array.from(new Map(customers.map((c) => [c.email, c])).values())

  let sent = 0
  let failed = 0

  for (const customer of unique) {
    const success = await sendCampaign({
      to: customer.email,
      subject,
      content,
      customerId: customer.id,
    })
    if (success) sent++
    else failed++

    // Small delay to avoid SMTP rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  // Log admin action
  await prisma.adminLog.create({
    data: {
      adminId: admin.id,
      action: 'SEND_CAMPAIGN',
      details: `Campagne "${subject}" envoyée à ${sent}/${unique.length} recipients (segment: ${segment})`,
    },
  })

  return NextResponse.json({ success: true, sent, failed, total: unique.length })
}
