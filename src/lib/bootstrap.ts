const isProd = process.env.NODE_ENV === 'production'
const isDemo = process.env.DEMO_MODE === 'true'

let verified = false

export function assertRuntimeSecurity(): void {
  if (verified) {
    return
  }

  if (isProd && isDemo) {
    throw new Error('Security boot guard: DEMO_MODE no puede estar habilitado en producción.')
  }

  verified = true
}
