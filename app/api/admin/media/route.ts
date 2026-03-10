import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { readdir, stat, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export const runtime = 'nodejs'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif']

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req)
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    if (!existsSync(UPLOAD_DIR)) {
      return NextResponse.json({ files: [] })
    }

    const names = await readdir(UPLOAD_DIR)
    const imageNames = names.filter(n =>
      IMAGE_EXTS.some(ext => n.toLowerCase().endsWith(ext))
    )

    const files = await Promise.all(
      imageNames.map(async name => {
        const filePath = path.join(UPLOAD_DIR, name)
        const s = await stat(filePath)
        return {
          name,
          url: `/uploads/${name}`,
          size: s.size,
          createdAt: s.birthtime.toISOString(),
          modifiedAt: s.mtime.toISOString(),
        }
      })
    )

    return NextResponse.json({ files })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await getAdminFromRequest(req)
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const filename = searchParams.get('filename')

  // Prevent path traversal
  if (!filename || filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    return NextResponse.json({ error: 'Nom de fichier invalide' }, { status: 400 })
  }

  const filePath = path.join(UPLOAD_DIR, filename)

  try {
    await unlink(filePath)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Fichier introuvable' }, { status: 404 })
  }
}
