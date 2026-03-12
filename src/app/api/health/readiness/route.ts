import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkRedisHealth } from '@/lib/rate-limit'

export async function GET() {
  const startedAt = Date.now()

  try {
    await db.$queryRaw`SELECT 1`
    const redisOk = await checkRedisHealth()

    if (!redisOk) {
      return NextResponse.json(
        { status: 'degraded', checks: { db: 'ok', redis: 'error' }, latencyMs: Date.now() - startedAt },
        { status: 503 }
      )
    }

    return NextResponse.json({ status: 'ok', checks: { db: 'ok', redis: 'ok' }, latencyMs: Date.now() - startedAt })
  } catch {
    return NextResponse.json({ status: 'degraded', checks: { db: 'error', redis: 'unknown' }, latencyMs: Date.now() - startedAt }, { status: 503 })
  }
}
