import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const templateSchema = z.object({
  id: z.string().min(1),
  subjectFr: z.string().max(200).default(''),
  subjectEn: z.string().max(200).default(''),
  bodyFr: z.string().max(20000).default(''),
  bodyEn: z.string().max(20000).default(''),
})

// GET all templates
export async function GET() {
  const templates = await prisma.emailTemplate.findMany()
  return NextResponse.json({ templates })
}

// PUT upsert a single template
export async function PUT(req: NextRequest) {
  try {
    const body = templateSchema.parse(await req.json())
    const template = await prisma.emailTemplate.upsert({
      where: { id: body.id },
      create: body,
      update: {
        subjectFr: body.subjectFr,
        subjectEn: body.subjectEn,
        bodyFr: body.bodyFr,
        bodyEn: body.bodyEn,
      },
    })
    return NextResponse.json({ template })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.flatten() : 'Données invalides' },
      { status: 400 },
    )
  }
}
