import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ─────────────────────────────────────────────────────────────────────────────
// Edge-compatible HMAC-SHA-256 JWT verification (no external dependency)
// Compatible with tokens produced by jsonwebtoken (HS256)
// ─────────────────────────────────────────────────────────────────────────────
function b64urlDecode(str: string): Uint8Array<ArrayBuffer> {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function verifyAdminJWT(token: string): Promise<boolean> {
  try {
    const secret = process.env.JWT_SECRET
    if (!secret) return false

    const parts = token.split('.')
    if (parts.length !== 3) return false

    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    )

    const signingInput = encoder.encode(`${parts[0]}.${parts[1]}`)
    const signature = b64urlDecode(parts[2])

    const valid = await crypto.subtle.verify('HMAC', key, signature, signingInput)
    if (!valid) return false

    // Check expiry
    const payload = JSON.parse(
      new TextDecoder().decode(b64urlDecode(parts[1])),
    ) as { exp?: number }
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return false

    return true
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Ne pas protéger la page de login
  if (pathname === '/admin/login') {
    const token = request.cookies.get('admin_token')?.value
    if (token && (await verifyAdminJWT(token))) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    return NextResponse.next()
  }

  // Protéger toutes les routes /admin/*
  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get('admin_token')?.value
    if (!token || !(await verifyAdminJWT(token))) {
      const loginUrl = new URL('/admin/login', request.url)
      const response = NextResponse.redirect(loginUrl)
      // Clear invalid/expired cookie
      if (token) {
        response.cookies.delete('admin_token')
      }
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
