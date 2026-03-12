import test from 'node:test'
import assert from 'node:assert/strict'
import { ApiHttpError, requireRole, requireTenantScope } from '../src/lib/api-security'

test('requireRole allows included role', () => {
  assert.doesNotThrow(() => requireRole({ id: 'u1', rol: 'GERENTE', empresaId: 'e1' }, ['ADMIN', 'GERENTE']))
})

test('requireRole denies excluded role', () => {
  assert.throws(
    () => requireRole({ id: 'u2', rol: 'RECLUTADOR', empresaId: 'e1' }, ['ADMIN']),
    (error: unknown) => error instanceof ApiHttpError && error.status === 403
  )
})

test('requireTenantScope denies cross-tenant for non-admin', () => {
  assert.throws(
    () => requireTenantScope({ id: 'u3', rol: 'GERENTE', empresaId: 'empresa-a' }, { empresaId: 'empresa-b' }),
    (error: unknown) => error instanceof ApiHttpError && error.status === 403
  )
})

test('requireTenantScope allows admin cross-tenant', () => {
  assert.doesNotThrow(() => requireTenantScope({ id: 'u4', rol: 'ADMIN' }, { empresaId: 'empresa-b' }))
})
