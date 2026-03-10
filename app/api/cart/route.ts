import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/cart?sessionId=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) return NextResponse.json({ cart: null })

  const cart = await prisma.cart.findUnique({
    where: { sessionId },
    include: {
      items: {
        include: { product: true },
      },
    },
  })

  return NextResponse.json({ cart })
}

// POST /api/cart — Add/Update item
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { sessionId, productId, quantity, customerId } = body

  if (!sessionId || !productId) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })
  if (!product.isActive || product.stock < 1) {
    return NextResponse.json({ error: 'Produit indisponible' }, { status: 400 })
  }

  // Find or create cart
  let cart = await prisma.cart.findUnique({ where: { sessionId } })
  if (!cart) {
    cart = await prisma.cart.create({
      data: { sessionId, customerId, isAbandoned: false },
    })
  } else if (customerId && !cart.customerId) {
    cart = await prisma.cart.update({
      where: { id: cart.id },
      data: { customerId, isAbandoned: false, updatedAt: new Date() },
    })
  } else {
    // Reset abandon flags on activity
    cart = await prisma.cart.update({
      where: { id: cart.id },
      data: { isAbandoned: false, updatedAt: new Date() },
    })
  }

  const qty = Math.min(quantity || 1, product.stock)

  // Upsert cart item
  const existingItem = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId } },
  })

  if (existingItem) {
    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: qty },
    })
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId,
        quantity: qty,
        price: product.price,
      },
    })
  }

  const updatedCart = await prisma.cart.findUnique({
    where: { sessionId },
    include: { items: { include: { product: true } } },
  })

  return NextResponse.json({ cart: updatedCart })
}

// DELETE /api/cart — Remove item or clear
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('sessionId')
  const itemId = searchParams.get('itemId')

  if (!sessionId) return NextResponse.json({ error: 'sessionId requis' }, { status: 400 })

  if (itemId) {
    await prisma.cartItem.delete({ where: { id: itemId } })
  } else {
    const cart = await prisma.cart.findUnique({ where: { sessionId } })
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } })
    }
  }

  return NextResponse.json({ success: true })
}

// PATCH /api/cart — Mark abandoned
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { sessionId, isAbandoned } = body

  if (!sessionId) return NextResponse.json({ error: 'sessionId requis' }, { status: 400 })

  const cart = await prisma.cart.update({
    where: { sessionId },
    data: { isAbandoned, updatedAt: new Date() },
  })

  return NextResponse.json({ cart })
}
