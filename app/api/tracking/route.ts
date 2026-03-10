import { NextRequest, NextResponse } from 'next/server'
import { trackEvent } from '@/lib/tracking'
import { EventType } from '@prisma/client'
import { getClientIP } from '@/lib/utils'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sessionId, event, productId, customerId, metadata } = body

    if (!sessionId || !event) {
      return NextResponse.json({ error: 'sessionId et event requis' }, { status: 400 })
    }

    const validEvents = [
      'PAGE_VIEW', 'PRODUCT_VIEW', 'ADD_TO_CART', 'CHECKOUT_START',
      'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'CART_ABANDON',
      'UPSELL_VIEW', 'UPSELL_ACCEPT', 'UPSELL_DECLINE',
    ]

    if (!validEvents.includes(event)) {
      return NextResponse.json({ error: 'Event invalide' }, { status: 400 })
    }

    await trackEvent({
      sessionId,
      event: event as EventType,
      productId,
      customerId,
      metadata,
      ip: getClientIP(req),
      userAgent: req.headers.get('user-agent') || undefined,
    })

    logger.debug('api', `Event tracké: ${event}`, { sessionId, productId })
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('api', 'Erreur tracking event', { event, error: String(error) })
    logger.error('error', 'Tracking API crash', { error: String(error) })
    return NextResponse.json({ error: 'Erreur tracking' }, { status: 500 })
  }
}
