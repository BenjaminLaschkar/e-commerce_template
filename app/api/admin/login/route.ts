import { NextRequest, NextResponse } from 'next/server'
import { adminLogin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getClientIP } from '@/lib/utils'
import { logger } from '@/lib/logger'
import { checkRateLimit } from '@/lib/rate-limit'

// 10 attempts per 15 minutes per IP, 5 per 15 minutes per email
const IP_LIMIT    = 10
const EMAIL_LIMIT = 5
const WINDOW_MS   = 15 * 60 * 1000 // 15 minutes

export async function POST(req: NextRequest) {
  const ip = getClientIP(req)

  // ── Rate limit by IP ──────────────────────────────────────────────────────
  const ipCheck = checkRateLimit(`login:ip:${ip}`, IP_LIMIT, WINDOW_MS)
  if (!ipCheck.allowed) {
    logger.warn('app', 'Login rate limit dépassé (IP)', { ip })
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((ipCheck.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(IP_LIMIT),
          'X-RateLimit-Remaining': '0',
        },
      },
    )
  }

  const body = await req.json()
  const { email, password } = body

  if (!email || !password) {
    return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 })
  }

  // ── Rate limit by email ───────────────────────────────────────────────────
  const emailCheck = checkRateLimit(`login:email:${String(email).toLowerCase()}`, EMAIL_LIMIT, WINDOW_MS)
  if (!emailCheck.allowed) {
    logger.warn('app', 'Login rate limit dépassé (email)', { email, ip })
    return NextResponse.json(
      { error: 'Trop de tentatives sur ce compte. Réessayez dans quelques minutes.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((emailCheck.resetAt - Date.now()) / 1000)) } },
    )
  }

  const result = await adminLogin(email, password)

  if (!result) {
    logger.warn('app', 'Tentative de connexion admin échouée', { email, ip: getClientIP(req) })
    return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 })
  }

  // Log admin login
  await prisma.adminLog.create({
    data: {
      adminId: result.admin.id,
      action: 'LOGIN',
      details: 'Connexion réussie',
      ip: getClientIP(req),
    },
  })
  logger.info('app', 'Connexion admin réussie', { email: result.admin.email, ip: getClientIP(req) })

  const response = NextResponse.json({
    success: true,
    admin: { id: result.admin.id, email: result.admin.email, name: result.admin.name },
  })

  response.cookies.set('admin_token', result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict', // strict: cookie not sent on cross-site navigation
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })

  return response
}
