import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertRuntimeSecurity } from '@/lib/bootstrap'

// Guardia de seguridad en producción
if (process.env.NODE_ENV === 'production') {
  assertRuntimeSecurity()
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
