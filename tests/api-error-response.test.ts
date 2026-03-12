import test from 'node:test'
import assert from 'node:assert/strict'
import { ApiHttpError, safeErrorResponse } from '../src/lib/api-security'

test('safeErrorResponse returns sanitized payload for unknown errors', async () => {
  const response = safeErrorResponse(new Error('sensitive-stack'))
  const body = await response.json() as { error: string; code: string; requestId?: string; details?: string }

  assert.equal(response.status, 500)
  assert.equal(body.error, 'Error interno del servidor')
  assert.equal(body.code, 'INTERNAL_SERVER_ERROR')
  assert.equal(typeof body.requestId, 'string')
  assert.equal(body.details, undefined)
})

test('safeErrorResponse preserves ApiHttpError status/code', async () => {
  const response = safeErrorResponse(new ApiHttpError(403, 'FORBIDDEN', 'No permitido'))
  const body = await response.json() as { error: string; code: string }

  assert.equal(response.status, 403)
  assert.equal(body.code, 'FORBIDDEN')
  assert.equal(body.error, 'No permitido')
})
