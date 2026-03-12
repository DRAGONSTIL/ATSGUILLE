import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

test('DEMO_MODE en producción no arranca', () => {
  const result = spawnSync(process.execPath, ['--import', 'tsx', '-e', "process.env.NODE_ENV='production';process.env.DEMO_MODE='true';import('./src/lib/bootstrap.ts').then(m=>m.assertRuntimeSecurity())"], {
    cwd: process.cwd(),
    encoding: 'utf8',
  })

  assert.notEqual(result.status, 0)
  assert.match(`${result.stderr}${result.stdout}`, /DEMO_MODE/)
})
