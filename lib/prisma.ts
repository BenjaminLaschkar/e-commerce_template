import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'warn'  },
      { emit: 'event', level: 'error' },
    ],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
