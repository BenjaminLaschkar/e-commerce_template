import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminFromRequest } from '@/lib/auth'
import { z } from 'zod'

// GET /api/products/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
  })

  if (!product) return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })
  return NextResponse.json({ product })
}

// PATCH /api/products/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminFromRequest(req)
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const body = await req.json()

    // Explicit mapping — never spread unknown fields into Prisma
    const data: Record<string, unknown> = { updatedAt: new Date() }
    if (body.name        !== undefined) data.name        = body.name
    if (body.slug        !== undefined) data.slug        = body.slug
    if (body.description !== undefined) data.description = body.description
    if (body.shortDesc   !== undefined) data.shortDesc   = body.shortDesc
    if (body.price       !== undefined) data.price       = body.price
    if (body.comparePrice !== undefined) data.comparePrice = body.comparePrice
    if (body.images      !== undefined) data.images      = body.images
    if (body.features    !== undefined) data.features    = body.features
    if (body.stock       !== undefined) data.stock       = body.stock
    if (body.sku         !== undefined) data.sku         = body.sku
    if (body.weight           !== undefined) data.weight           = body.weight
    if (body.isActive         !== undefined) data.isActive         = body.isActive
    if (body.upsellActive     !== undefined) data.upsellActive     = body.upsellActive
    if (body.upsellPrice      !== undefined) data.upsellPrice      = body.upsellPrice
    if (body.upsellMessage    !== undefined) data.upsellMessage    = body.upsellMessage
    if (body.upsellSendEmail  !== undefined) data.upsellSendEmail  = body.upsellSendEmail
    if (body.upsellTriggerIds !== undefined) data.upsellTriggerIds = body.upsellTriggerIds
    if (body.options        !== undefined) data.options        = body.options

    const product = await prisma.product.update({
      where: { id: params.id },
      data,
    })

    return NextResponse.json({ product })
  } catch (error) {
    const { logger } = await import('@/lib/logger')
    logger.error('api', 'PATCH /api/products/[id] erreur', { id: params.id, error: String(error) })
    logger.error('error', 'Product PATCH crash', { id: params.id, error: String(error) })
    return NextResponse.json({ error: 'Erreur mise à jour' }, { status: 500 })
  }
}

// DELETE /api/products/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminFromRequest(req)
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    await prisma.product.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur suppression' }, { status: 500 })
  }
}
