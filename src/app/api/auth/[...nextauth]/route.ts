import NextAuth from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { assertRuntimeSecurity } from '@/lib/bootstrap'

async function runAuthHandler(request: NextRequest) {
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
  return NextAuth(request, NextResponse, authOptions)
}

const handler = runAuthHandler

function getLastPathSegment(pathname: string): string {
  const clean = pathname.replace(/\/+$/, '')
  const parts = clean.split('/').filter(Boolean)
  return parts[parts.length - 1] || ''
}

export async function GET(request: NextRequest) {
  const tail = getLastPathSegment(request.nextUrl.pathname)

  // Hardening: si por enrutamiento cae en el catch-all, mantener contrato JSON para NextAuth client.
  if (tail === 'session') {
    try {
      return await handler(request)
    } catch (error) {
      console.error('nextauth_session_fallback_error', error)
      return NextResponse.json({}, { status: 200 })
    }
  }

  return handler(request)
}

export async function POST(request: NextRequest) {
  const tail = getLastPathSegment(request.nextUrl.pathname)

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

  return handler(request)
}
