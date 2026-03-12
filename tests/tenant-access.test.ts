import test from 'node:test'
import assert from 'node:assert/strict'
import { canAccessEmpresa, withTenantScope } from '../src/lib/tenant-access'

test('canAccessEmpresa allows admin everywhere', () => {
  assert.equal(canAccessEmpresa({ id: '1', rol: 'ADMIN' }, 'abc'), true)
})

test('canAccessEmpresa enforces tenant match for manager/recruiter', () => {
  assert.equal(canAccessEmpresa({ id: '2', rol: 'GERENTE', empresaId: 'acme' }, 'acme'), true)
  assert.equal(canAccessEmpresa({ id: '3', rol: 'RECLUTADOR', empresaId: 'acme' }, 'other'), false)
})

test('withTenantScope injects tenant for non-admin users', () => {
  const scoped = withTenantScope({ id: '2', rol: 'GERENTE', empresaId: 'acme' }, { activa: true }) as {
    activa: boolean
    empresaId: string
  }

  assert.equal(scoped.activa, true)
  assert.equal(scoped.empresaId, 'acme')
})
