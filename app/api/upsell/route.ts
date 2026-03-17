import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/upsell?productIds=id1,id2
 *
 * Returns the first active upsell product configured for the given
 * list of purchased product IDs (comma-separated).
 * A product is returned as an upsell if:
 *   - upsellActive === true
 *   - isActive === true
 *   - at least one purchased productId is listed in upsellTriggerIds
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const param = searchParams.get('productIds') ?? ''
  const productIds = param.split(',').map((s) => s.trim()).filter(Boolean)

  if (!productIds.length) {
    return NextResponse.json({ upsell: null })
  }

  // Fetch all active upsell products
  const candidates = await prisma.product.findMany({
    where: { upsellActive: true, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      images: true,
      price: true,
      comparePrice: true,
      upsellPrice: true,
      upsellMessage: true,
      upsellSendEmail: true,
      upsellTriggerIds: true,
    },
  })

  // Find first match where one of the purchased products is in the trigger list
  const match = candidates.find((u) =>
    u.upsellTriggerIds.some((triggerId) => productIds.includes(triggerId))
  ) ?? null

  return NextResponse.json({ upsell: match })
}
