import test from 'node:test'
import assert from 'node:assert/strict'
import { authorize } from '../src/lib/authorization'
import { ApiHttpError } from '../src/lib/api-security'
import { getRateLimitIdentifier } from '../src/lib/rate-limit'
import { readFileSync } from 'node:fs'

test('cross-tenant read returns hidden via generic 404 decision', () => {
  assert.throws(
    () => authorize({ id: 'u1', rol: 'GERENTE', empresaId: 'tenant-a' }, 'candidate.read', { tenantId: 'tenant-b' }),
    (error: unknown) => error instanceof ApiHttpError && error.status === 404
  )
})

test('recruiter cannot hijack another tenant user assignment', () => {
  assert.throws(
    () => authorize({ id: 'u2', rol: 'RECLUTADOR', empresaId: 'tenant-a' }, 'user.assignTeam', { tenantId: 'tenant-a' }),
    (error: unknown) => error instanceof ApiHttpError && error.status === 403
  )
})

test('rate limiter identifier contains tenant correlation', () => {
  const request = new Request('http://localhost', { headers: { 'x-real-ip': '10.0.0.1' } })
  const identifier = getRateLimitIdentifier(request, 'actor-1', 'tenant-1')
  assert.equal(identifier, 'user:actor-1:tenant:tenant-1')
})

test('demo mode provider hard guard is present in auth module', () => {
  const auth = readFileSync('src/lib/auth.ts', 'utf8')
  assert.match(auth, /process\.env\.NODE_ENV !== 'production'/)
})

test('security scan protected routes avoid direct db import', () => {
  const protectedRoutes = [
    'src/app/api/candidatos/bulk/route.ts',
    'src/app/api/admin/asignar/route.ts',
    'src/app/api/candidatos/[id]/route.ts',
  ]

  for (const routePath of protectedRoutes) {
    const source = readFileSync(routePath, 'utf8')
    assert.equal(source.includes("from '@/lib/db'"), false, `${routePath} no debe importar db directo`)
  }
})
