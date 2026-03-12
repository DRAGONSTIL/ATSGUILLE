import { NextRequest, NextResponse } from 'next/server'
import { ApiHttpError, requireSession } from '@/lib/api-security'
import { authorize, PermissionAction, ResourceContext } from '@/lib/authorization'

export async function withApiAuth<T>(handler: (request: NextRequest, user: Awaited<ReturnType<typeof requireSession>>['user']) => Promise<T>, request: NextRequest) {
  const { user } = await requireSession()
  return handler(request, user)
}

export function requireAuthorization(user: Awaited<ReturnType<typeof requireSession>>['user'], action: PermissionAction, context?: ResourceContext) {
  authorize(user, action, context)
}

export function safe404(): NextResponse {
  return NextResponse.json({ error: 'Recurso no encontrado' }, { status: 404 })
}

export function safeErrorResponse(error: unknown, request: NextRequest): NextResponse {
  if (error instanceof ApiHttpError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
  }

  return NextResponse.json(
    {
      error: 'Error interno del servidor',
      code: 'INTERNAL_SERVER_ERROR',
      requestId: request.headers.get('x-request-id') || 'unknown',
    },
    { status: 500 }
  )
}
