import { NextRequest, NextResponse } from 'next/server'
import { processAbandonedCarts } from '@/lib/email'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    logger.info('cron', 'Début traitement paniers abandonnés')
    const result = await processAbandonedCarts()
    logger.info('cron', 'Paniers abandonnés traités', result)
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    logger.error('cron', 'Erreur traitement paniers abandonnés', { error: String(error) })
    logger.error('error', 'Cron abandoned-carts crash', { error: String(error) })
    return NextResponse.json({ error: 'Erreur cron' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  return GET(req)
}
