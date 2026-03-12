import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const ROUTE_PATH = 'src/app/api/auth/[...nextauth]/route.ts'

test('nextauth catch-all route mantiene export canónico GET/POST', () => {
  const content = readFileSync(ROUTE_PATH, 'utf8')

  assert.match(content, /const\s+handler\s*=\s*NextAuth\(authOptions\)/)
  assert.match(content, /export\s*\{\s*\w+\s+as\s+GET,\s*\w+\s+as\s+POST\s*\}/)

  // Evitar que reaparezca la variante que provocó fallos en Turbopack del deploy.
  assert.doesNotMatch(content, /export\s+async\s+function\s+GET\s*\(/)
  assert.doesNotMatch(content, /export\s+async\s+function\s+POST\s*\(/)
})
