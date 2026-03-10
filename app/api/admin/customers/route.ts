import { NextResponse, NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminFromRequest } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
})

// POST /api/admin/customers — Ajouter un contact manuellement
export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { email, firstName, lastName, phone } = parsed.data

  const existing = await prisma.customer.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Ce contact existe déjà' }, { status: 409 })
  }

  const customer = await prisma.customer.create({
    data: {
      email,
      firstName: firstName ?? '',
      lastName: lastName ?? '',
      phone: phone ?? null,
    },
  })

  return NextResponse.json(customer, { status: 201 })
}

// GET /api/admin/customers — Liste tous les contacts
export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      createdAt: true,
      _count: { select: { orders: true } },
    },
  })

  return NextResponse.json(customers)
}

// DELETE /api/admin/customers — Supprimer un contact
export async function DELETE(req: NextRequest) {
  const admin = await getAdminFromRequest(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await prisma.customer.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
