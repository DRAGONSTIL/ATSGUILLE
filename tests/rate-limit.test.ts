import test from 'node:test'
import assert from 'node:assert/strict'
import { rateLimit } from '../src/lib/rate-limit'

test('rateLimit blocks after configured max requests', () => {
  const key = `test:${Date.now()}`
  const config = { windowMs: 60_000, maxRequests: 2 }

  const first = rateLimit(key, config)
  const second = rateLimit(key, config)
  const third = rateLimit(key, config)

  assert.equal(first.success, true)
  assert.equal(second.success, true)
  assert.equal(third.success, false)
  assert.ok(typeof third.retryAfter === 'number')
})
