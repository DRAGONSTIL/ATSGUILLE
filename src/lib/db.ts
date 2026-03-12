import { assertRuntimeSecurity } from './bootstrap'
import { PrismaClient } from '@prisma/client'

assertRuntimeSecurity()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prismaLogConfig: Array<'query' | 'info' | 'warn' | 'error'> =
  process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error']

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: prismaLogConfig,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
