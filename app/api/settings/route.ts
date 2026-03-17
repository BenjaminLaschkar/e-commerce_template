import { NextRequest, NextResponse } from 'next/server'
import { getSiteSettings } from '@/lib/site-settings'
import { publicSettings } from '@/lib/site-settings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/settings  — public endpoint for client-side use (no secrets)
export async function GET(_req: NextRequest) {
  const settings = await getSiteSettings()
  return NextResponse.json({ settings: publicSettings(settings) })
}
