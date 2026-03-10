import { NextRequest, NextResponse } from 'next/server'
import { revokeToken, revocationKey } from '@/lib/token-revocation'
import jwt from 'jsonwebtoken'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  // Revoke the JWT before clearing the cookie so it cannot be replayed
  const token = req.cookies.get('admin_token')?.value
  if (token) {
    try {
      const payload = jwt.decode(token) as { exp?: number; iat?: number; jti?: string; id?: string } | null
      if (payload?.exp) {
        revokeToken(
          revocationKey({ jti: payload.jti, id: payload.id, iat: payload.iat }),
          payload.exp,
        )
      }
    } catch {
      // Ignore malformed tokens — cookie will still be cleared
    }
  }

  const response = NextResponse.json({ success: true })

  // Explicitly overwrite the cookie with maxAge=0 to guarantee deletion.
  // cookies.delete() omits the path attribute which prevents browsers from
  // matching and deleting cookies originally set with path:'/'.
  response.cookies.set('admin_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  })

  return response
}
