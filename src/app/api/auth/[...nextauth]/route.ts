import NextAuth from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { assertRuntimeSecurity } from '@/lib/bootstrap'

const nextAuthHandler = NextAuth(authOptions)

async function runAuthHandler(request: NextRequest, context: any) {
  if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_SECRET) {
    return NextResponse.json(
      {
        error: 'Auth misconfigured: NEXTAUTH_SECRET is required in production',
        code: 'AUTH_CONFIG_ERROR',
      },
      { status: 500 }
    )
  }

  assertRuntimeSecurity()
  return nextAuthHandler(request, context)
}

const handler = runAuthHandler

function getLastPathSegment(pathname: string): string {
  const clean = pathname.replace(/\/+$/, '')
  const parts = clean.split('/').filter(Boolean)
  return parts[parts.length - 1] || ''
}

export async function GET(request: NextRequest, props: { params: Promise<{ nextauth: string[] }> }) {
  const tail = getLastPathSegment(request.nextUrl.pathname)
  const params = await props.params

  // Re-empaquetamos el contexto de manera síncrona para que NextAuth no explote internamente
  const context = { params }

  // Manejo de la sesión (donde NextAuth y React colapsan por error de red 500)
  if (tail === 'session') {
    try {
      const response = await handler(request, context)
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
      return await handler(request, context)
  } catch(error) {
      // Fallback de cualquier ruta (ej: /api/auth/providers)
      console.error('nextauth_generic_error', error)
      return NextResponse.json({ error: 'Internal Auth Error' }, { status: 401 })
  }
}

export async function POST(request: NextRequest, props: { params: Promise<{ nextauth: string[] }> }) {
  const tail = getLastPathSegment(request.nextUrl.pathname)
  const params = await props.params

  const context = { params }

  // Hardening: evitar 500 en /api/auth/_log si este path cae por el catch-all.
  if (tail === '_log') {
    try {
      const payload = await request.json().catch(() => null)
      if (payload) console.error('nextauth_client_log_catchall', payload)
      return NextResponse.json({ ok: true })
    } catch (error) {
      console.error('nextauth_log_fallback_error', error)
      return NextResponse.json({ ok: true })
    }
  }

  return handler(request, context)
}
