import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { getSiteSettings, updateSiteSettings, publicSettings } from '@/lib/site-settings'
import { z } from 'zod'

export const runtime = 'nodejs'

// Whitelist of updatable fields — prevents mass-assignment of arbitrary DB columns
const settingsPatchSchema = z.object({
  storeName:          z.string().min(1).max(100).optional(),
  storeTagline:       z.string().max(200).optional(),
  aboutContent:       z.string().max(50_000).optional(),
  primaryColor:       z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  fontFamily:         z.string().max(50).optional(),
  heroImages:         z.array(z.string().min(1).max(500)).max(10).optional(),
  logoUrl:            z.string().max(500).nullable().optional(),
  stripePublicKey:    z.string().max(200).optional(),
  stripeSecretKey:    z.string().max(200).optional(),
  stripeWebhookSecret:z.string().max(200).optional(),
  freeShippingThreshold: z.number().min(0).optional(),
  shippingRules:      z.array(z.object({
    country:      z.string().length(2),
    countryName:  z.string().max(100).optional(),
    price:        z.number().min(0),
    freeThreshold: z.number().min(0).nullable().optional(),
    estimatedDays: z.string().max(100).optional(),
  })).max(50).optional(),
  cgvContent:      z.string().max(50_000).optional(),
  faqContent:      z.string().max(50_000).optional(),
  deliveryContent: z.string().max(50_000).optional(),
  storeNameEN:       z.string().max(100).nullable().optional(),
  storeTaglineEN:    z.string().max(200).nullable().optional(),
  aboutContentEN:    z.string().max(50_000).nullable().optional(),
  cgvContentEN:      z.string().max(50_000).nullable().optional(),
  faqContentEN:      z.string().max(50_000).nullable().optional(),
  deliveryContentEN: z.string().max(50_000).nullable().optional(),
  blockedCountries:  z.array(z.string().length(2)).max(200).optional(),
  announceBannerFr:  z.string().max(500).nullable().optional(),
  announceBannerEn:  z.string().max(500).nullable().optional(),
  checkoutDistractionFree: z.boolean().optional(),
}).strict() // reject unknown keys

// GET /api/admin/settings  — returns full settings (secrets masked for display)
export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req)
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const settings = await getSiteSettings()

  // Mask secrets — send boolean flags so admin UI knows if they're configured
  return NextResponse.json({
    settings: {
      ...publicSettings(settings),
      stripeSecretConfigured: !!settings.stripeSecretKey,
      stripeWebhookConfigured: !!settings.stripeWebhookSecret,
    },
  })
}

// PATCH /api/admin/settings  — partial update
export async function PATCH(req: NextRequest) {
  const admin = await getAdminFromRequest(req)
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  let data: z.infer<typeof settingsPatchSchema>
  try {
    // Strip computed/readonly fields before Zod validation
    const raw = await req.json()
    const { stripeSecretConfigured, stripeWebhookConfigured, id, createdAt, updatedAt, ...rest } = raw
    data = settingsPatchSchema.parse(rest)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.flatten() : 'Données invalides' },
      { status: 400 },
    )
  }

  // If caller sends empty string for secret fields, preserve existing value
  if (data.stripeSecretKey === '') delete data.stripeSecretKey
  if (data.stripeWebhookSecret === '') delete data.stripeWebhookSecret
  if (data.stripePublicKey === '') delete data.stripePublicKey

  try {
    const updated = await updateSiteSettings(data)
    return NextResponse.json({ success: true, settings: publicSettings(updated) })
  } catch (err) {
    console.error('[settings PATCH] DB error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur lors de la sauvegarde en base de données' },
      { status: 500 },
    )
  }
}
