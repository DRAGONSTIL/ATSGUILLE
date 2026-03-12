import NextAuth from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { assertRuntimeSecurity } from '@/lib/bootstrap'

// Guardia de seguridad en producción
if (process.env.NODE_ENV === 'production') {
  assertRuntimeSecurity()
}

const handler = NextAuth(authOptions)

const customHandler = async (req: NextRequest, props: { params: Promise<{ nextauth: string[] }> }) => {
  let params: any = {}
  try {
    params = await props.params
  } catch (e) {
    // ignorar error de acceso asíncrono preventivo
  }

  const context = { params }
  const tail = req.nextUrl.pathname.split('/').filter(Boolean).pop()

  if (tail === 'session') {
    try {
      const response = await handler(req, context as any)
      if (response && response.status >= 500) {
        return NextResponse.json({}, { status: 401 })
      }
      return response
    } catch (error) {
      console.error('nextauth_session_fallback_error', error)
      return NextResponse.json({}, { status: 401 })
    }
  }

  try {
    return await handler(req, context as any)
  } catch (error) {
    console.error('nextauth_generic_error', error)
    return NextResponse.json({ error: 'Internal Auth Error' }, { status: 401 })
  }
}

export { customHandler as GET, customHandler as POST }
