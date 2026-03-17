import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminFromRequest } from '@/lib/auth'
import { slugify } from '@/lib/utils'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const productSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().min(1),
  shortDesc: z.string().optional(),
  price: z.number().positive(),
  comparePrice: z.number().positive().optional().nullable(),
  images: z.array(z.string()).default([]),
  stock: z.number().int().min(0),
  isActive: z.boolean().default(true),
  sku: z.string().optional(),
  weight: z.number().optional(),
  // Upsell
  upsellActive: z.boolean().default(false),
  upsellPrice: z.number().positive().optional().nullable(),
  upsellMessage: z.string().optional().nullable(),
  upsellSendEmail: z.boolean().default(false),
  upsellTriggerIds: z.array(z.string()).default([]),
  // Options (versions, colours, etc.)
  options: z.any().optional().default({}),
})

// GET /api/products
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  const activeOnly = searchParams.get('active') !== 'false'

  if (slug) {
    const product = await prisma.product.findUnique({
      where: { slug },
    })
    if (!product) return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })
    return NextResponse.json({ product })
  }

  const products = await prisma.product.findMany({
    where: activeOnly ? { isActive: true } : {},
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ products })
}

// POST /api/products (Admin)
export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req)
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const body = await req.json()
    const data = productSchema.parse(body)

    const slug = data.slug || slugify(data.name)

    // Check unique slug
    const existing = await prisma.product.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json(
        { error: 'Un produit avec ce slug existe déjà' },
        { status: 400 }
      )
    }

    const product = await prisma.product.create({
      data: { ...data, slug },
    })

    logger.info('app', `Produit créé: ${product.name}`, { id: product.id, slug: product.slug, admin: admin.email })
    logger.info('db', `Product inserté: ${product.slug}`, { id: product.id })

    return NextResponse.json({ product }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Données invalides', details: error.errors }, { status: 400 })
    }
    logger.error('error', 'Erreur création produit', { error: String(error) })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
