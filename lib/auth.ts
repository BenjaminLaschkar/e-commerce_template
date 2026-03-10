import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { prisma } from './prisma'
import { isTokenRevoked, revocationKey } from './token-revocation'

// Fail loudly at startup if the secret is missing — never use a hardcoded fallback
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('[auth] JWT_SECRET environment variable is not set')
  return secret
}

const COOKIE_NAME = 'admin_token'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 jours

export interface AdminPayload {
  id: string
  email: string
  name: string
}

// ============================================
// HASH PASSWORD
// ============================================
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ============================================
// JWT
// ============================================
export function signToken(payload: AdminPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' })
}

export function verifyToken(token: string): AdminPayload | null {
  try {
    const payload = jwt.verify(token, getJwtSecret()) as AdminPayload & { exp?: number; iat?: number; jti?: string }
    // Check in-memory revocation list (populated by logout)
    const key = revocationKey({ jti: payload.jti, id: payload.id, iat: payload.iat })
    if (isTokenRevoked(key)) return null
    return payload
  } catch {
    return null
  }
}

// ============================================
// COOKIE AUTH
// ============================================
export function setAuthCookie(token: string) {
  const cookieStore = cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict', // strict: cookie not sent on cross-site navigation
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
}

export function clearAuthCookie() {
  const cookieStore = cookies()
  cookieStore.delete(COOKIE_NAME)
}

export function getAuthToken(): string | undefined {
  const cookieStore = cookies()
  return cookieStore.get(COOKIE_NAME)?.value
}

/**
 * Revoke the token currently stored in the server-side cookie.
 * Call this from the logout route BEFORE deleting the cookie.
 */
export function revokeCurrentToken(): void {
  const token = getAuthToken()
  if (!token) return
  try {
    const { revokeToken, revocationKey: rk } = require('./token-revocation')
    const payload = jwt.decode(token) as { exp?: number; iat?: number; jti?: string; id?: string } | null
    if (payload?.exp) {
      revokeToken(rk({ jti: payload.jti, id: payload.id, iat: payload.iat }), payload.exp)
    }
  } catch {
    // Best-effort: if decode fails, token is likely invalid anyway
  }
}

// ============================================
// MIDDLEWARE AUTH
// ============================================
export async function getAdminFromRequest(req: NextRequest): Promise<AdminPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

export async function requireAdmin(req: NextRequest): Promise<AdminPayload> {
  const admin = await getAdminFromRequest(req)
  if (!admin) {
    throw new Error('Non autorisé')
  }
  return admin
}

// ============================================
// LOGIN
// ============================================
export async function adminLogin(email: string, password: string) {
  const admin = await prisma.admin.findUnique({ where: { email } })
  if (!admin) return null

  const valid = await verifyPassword(password, admin.password)
  if (!valid) return null

  const payload: AdminPayload = {
    id: admin.id,
    email: admin.email,
    name: admin.name,
  }

  const token = signToken(payload)
  return { admin: payload, token }
}

// ============================================
// GET CURRENT ADMIN (Server Component)
// ============================================
export async function getCurrentAdmin(): Promise<AdminPayload | null> {
  const token = getAuthToken()
  if (!token) return null
  return verifyToken(token)
}
