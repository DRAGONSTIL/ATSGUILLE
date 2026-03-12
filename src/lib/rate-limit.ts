// ATLAS GSE - Rate Limiting híbrido (Redis obligatorio en prod, memoria solo dev)
import { logger } from '@/lib/logger'

interface RateLimitEntry {
  count: number
  resetTime: number
}

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetTime: number
  retryAfter?: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

export const rateLimitConfigs = {
  auth: { windowMs: 60 * 1000, maxRequests: 10 },
  create: { windowMs: 60 * 1000, maxRequests: 30 },
  general: { windowMs: 60 * 1000, maxRequests: 100 },
  sync: { windowMs: 5 * 60 * 1000, maxRequests: 5 },
}

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN

function hasRedisRateLimitConfig() {
  return Boolean(upstashUrl && upstashToken)
}

function isProduction() {
  return process.env.NODE_ENV === 'production'
}

async function upstashCommand(command: Array<string | number>) {
  if (!upstashUrl || !upstashToken) {
    throw new Error('Upstash no configurado')
  }
  const response = await fetch(upstashUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${upstashToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Upstash error ${response.status}`)
  }

  const payload = await response.json()
  if (payload.error) {
    throw new Error(String(payload.error))
  }

  return payload.result
}

export async function checkRedisHealth(): Promise<boolean> {
  if (!hasRedisRateLimitConfig()) {
    return !isProduction()
  }

  try {
    await upstashCommand(['PING'])
    return true
  } catch {
    return false
  }
}

function rateLimitInMemory(identifier: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  if (!entry || now > entry.resetTime) {
    const resetTime = now + config.windowMs
    rateLimitStore.set(identifier, { count: 1, resetTime })
    return { success: true, remaining: config.maxRequests - 1, resetTime }
  }

  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    }
  }

  entry.count += 1
  return { success: true, remaining: config.maxRequests - entry.count, resetTime: entry.resetTime }
}

async function rateLimitWithRedis(identifier: string, config: RateLimitConfig): Promise<RateLimitResult> {
  const windowSeconds = Math.max(1, Math.ceil(config.windowMs / 1000))
  const key = `ratelimit:${identifier}:${windowSeconds}:${config.maxRequests}`
  const count = Number(await upstashCommand(['INCR', key]))

  if (count === 1) {
    await upstashCommand(['EXPIRE', key, windowSeconds])
  }

  const ttl = Number(await upstashCommand(['TTL', key]))
  const retryAfter = ttl > 0 ? ttl : windowSeconds
  const resetTime = Date.now() + retryAfter * 1000

  return count > config.maxRequests
    ? { success: false, remaining: 0, resetTime, retryAfter }
    : { success: true, remaining: Math.max(config.maxRequests - count, 0), resetTime }
}

export function rateLimit(identifier: string, config: RateLimitConfig = rateLimitConfigs.general): RateLimitResult {
  return rateLimitInMemory(identifier, config)
}

export async function rateLimitAsync(identifier: string, config: RateLimitConfig = rateLimitConfigs.general): Promise<RateLimitResult> {
  if (!hasRedisRateLimitConfig()) {
    if (isProduction()) {
      return { success: false, remaining: 0, resetTime: Date.now() + 60_000, retryAfter: 60 }
    }

    return rateLimitInMemory(identifier, config)
  }

  try {
    return await rateLimitWithRedis(identifier, config)
  } catch (error) {
    logger.error('rate_limit_redis_error', { error: String(error) })
    if (isProduction()) {
      return { success: false, remaining: 0, resetTime: Date.now() + 60_000, retryAfter: 60 }
    }
    return rateLimitInMemory(identifier, config)
  }
}

function buildHeaders(config: RateLimitConfig, result: RateLimitResult) {
  return {
    'X-RateLimit-Limit': String(config.maxRequests),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
    'RateLimit-Limit': String(config.maxRequests),
    'RateLimit-Remaining': String(result.remaining),
    'RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
  }
}

export async function checkRateLimitAsync(identifier: string, type: keyof typeof rateLimitConfigs = 'general') {
  const config = rateLimitConfigs[type]
  const result = await rateLimitAsync(identifier, config)
  const headers = buildHeaders(config, result)

  if (!result.success) {
    headers['Retry-After'] = String(result.retryAfter || 60)
    return { success: false, headers, error: 'Demasiadas solicitudes' }
  }

  return { success: true, headers }
}

export function getRateLimitIdentifier(request: Request, userId?: string, tenantId?: string | null): string {
  const actor = userId ? `user:${userId}` : `ip:${request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'}`
  return tenantId ? `${actor}:tenant:${tenantId}` : actor
}

export type RateLimitType = keyof typeof rateLimitConfigs
