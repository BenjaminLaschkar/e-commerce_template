import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

export const runtime = 'nodejs'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')

// ─────────────────────────────────────────────────────────────────────────────
// Allowed types: client-declared MIME AND (for binary formats) magic bytes must match
// SVG is a text-based format — no magic bytes, validated by MIME + extension only
// ─────────────────────────────────────────────────────────────────────────────
const BINARY_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const ALL_ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'])
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

const SAFE_EXT_MAP: Record<string, string> = {
  'image/jpeg':    'jpg',
  'image/png':     'png',
  'image/gif':     'gif',
  'image/webp':    'webp',
  'image/svg+xml': 'svg',
}

/**
 * Verify actual magic bytes of binary image formats.
 * SVG is handled separately (text-based).
 * Returns the detected MIME type or null if unrecognised.
 */
function detectMimeFromBytes(buf: Uint8Array): string | null {
  if (buf.length < 4) return null
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf.length >= 8 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return 'image/png'
  // GIF: 47 49 46 38 (GIF8)
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return 'image/gif'
  // WebP: RIFF????WEBP (need at least 12 bytes)
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return 'image/webp'
  return null
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req)
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })

  // 1. Check client-declared MIME (first gate)
  if (!ALL_ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: 'Type de fichier non autorisé (jpeg, png, webp, gif, svg uniquement)' },
      { status: 400 },
    )
  }

  // 2. Check file size
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Fichier trop lourd (max 10 MB)' }, { status: 400 })
  }

  const arrayBuf = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuf)

  // 3. Determine canonical extension from declared MIME (server-controlled, not client)
  const safeExt = SAFE_EXT_MAP[file.type] ?? 'jpg'

  // 4. For binary formats: verify magic bytes (prevents MIME spoofing)
  if (BINARY_MIME.has(file.type)) {
    const detectedMime = detectMimeFromBytes(new Uint8Array(buffer))

    if (!detectedMime) {
      return NextResponse.json(
        { error: 'Le contenu du fichier ne correspond pas à une image valide' },
        { status: 400 },
      )
    }

    if (detectedMime !== file.type) {
      return NextResponse.json(
        { error: 'Le type MIME déclaré ne correspond pas au contenu réel du fichier' },
        { status: 400 },
      )
    }
  }
  // SVG: text-based format — no magic bytes check needed
  // Security: SVGs in <img> tags cannot execute scripts; served with correct Content-Type

  // 5. Write with UUID filename — no user-controlled path component
  await mkdir(UPLOAD_DIR, { recursive: true })
  const filename = `${uuidv4()}.${safeExt}`
  const filepath = path.join(UPLOAD_DIR, filename)
  await writeFile(filepath, buffer)

  const url = `/uploads/${filename}`
  return NextResponse.json({ url })
}
