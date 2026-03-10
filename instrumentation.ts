/**
 * Next.js Instrumentation Hook
 * Runs once when the server starts — used to log startup info and boot the
 * Prisma client with log forwarding to the rotating logger.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { logger } = await import('./lib/logger')

    logger.info('app', 'Serveur Next.js démarré', {
      env:     process.env.NODE_ENV,
      version: process.env.npm_package_version ?? '—',
      pid:     process.pid,
    })

    // Forward Prisma query/error/warn events to the 'db' log channel
    const { prisma } = await import('./lib/prisma')

    // @ts-ignore – Prisma event emitter (available when log config includes query/warn/error)
    prisma.$on('query', (e: { query: string; duration: number }) => {
      logger.debug('db', e.query.slice(0, 200), { duration: `${e.duration}ms` })
    })

    // @ts-ignore
    prisma.$on('warn', (e: { message: string }) => {
      logger.warn('db', e.message)
    })

    // @ts-ignore
    prisma.$on('error', (e: { message: string }) => {
      logger.error('db', e.message)
      logger.error('error', `Prisma error: ${e.message}`)
    })

    // Catch unhandled rejections
    process.on('unhandledRejection', (reason) => {
      logger.error('error', 'UnhandledRejection', { reason: String(reason) })
    })

    process.on('uncaughtException', (err) => {
      logger.error('error', 'UncaughtException', { message: err.message, stack: err.stack })
    })
  }
}
