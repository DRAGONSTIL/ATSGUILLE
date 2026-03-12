import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildSigningMessage,
  hashNonce,
  isTimestampWithinWindow,
  signPayload,
  timingSafeCompare,
} from '../src/lib/intake-security'
import { getDedupStrategy, normalizeIntakePayload } from '../src/lib/intake-normalize'

test('HMAC verification with fixed body', () => {
  const ts = '1700000000'
  const nonce = 'abc-123'
  const body = '{"fullName":"Ana"}'
  const secret = 'super-secret'

  const message = buildSigningMessage(ts, nonce, body)
  const sig = signPayload(secret, message)
  const expected = signPayload(secret, message)

  assert.equal(timingSafeCompare(sig, expected), true)
})

test('timestamp outside allowed window is rejected', () => {
  const staleTs = Math.floor(Date.now() / 1000) - 1000
  assert.equal(isTimestampWithinWindow(staleTs, 300), false)
})

test('nonce replay produces same hash for same nonce+timestamp+key', () => {
  const first = hashNonce('1700000000', 'nonce-1', 'key-1')
  const second = hashNonce('1700000000', 'nonce-1', 'key-1')
  assert.equal(first, second)
})

test('dedup strategy prefers email, then phone', () => {
  const base = {
    fullName: 'Ana Perez',
    submittedAt: new Date().toISOString(),
    sheetId: 'sheet-1',
    sheetName: 'Responses',
    rawAnswers: {},
  }

  const byEmail = normalizeIntakePayload({
    ...base,
    email: ' ANA@EXAMPLE.COM ',
    phone: '55-11-22',
  })
  assert.deepEqual(getDedupStrategy(byEmail), { type: 'email', value: 'ana@example.com' })

  const byPhone = normalizeIntakePayload({
    ...base,
    email: '',
    phone: '+52 55 1234 5678',
  })
  assert.deepEqual(getDedupStrategy(byPhone), { type: 'phone', value: '525512345678' })
})
