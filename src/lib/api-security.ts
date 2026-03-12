import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logger } from '@/lib/logger'

export type AppRole = 'ADMIN' | 'GERENTE' | 'RECLUTADOR'

export interface SessionUser {
  id: string
  rol: AppRole
  empresaId?: string | null
  equipoId?: string | null
  email?: string | null
}

export interface AuthorizedSession {
  user: SessionUser
}

export class ApiHttpError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiHttpError'
    this.status = status
    this.code = code
  }
}

export async function requireSession(): Promise<AuthorizedSession> {
  const session = await getServerSession(authOptions)
  const user = session?.user as SessionUser | undefined

  if (!user?.id || !user.rol) {
    throw new ApiHttpError(401, 'UNAUTHORIZED', 'No autorizado')
  }

  return { user }
}

export function requireRole(user: SessionUser, roles: AppRole[]): void {
  if (!roles.includes(user.rol)) {
    throw new ApiHttpError(403, 'FORBIDDEN', 'No tienes permiso para esta acción')
  }
}

export function requireTenantScope(user: SessionUser, scope: { empresaId?: string | null; equipoId?: string | null }): void {
  if (user.rol === 'ADMIN') {
    return
  }

  if (!user.empresaId) {
    throw new ApiHttpError(403, 'TENANT_SCOPE_MISSING', 'Usuario sin empresa asignada')
  }

  if (scope.empresaId && scope.empresaId !== user.empresaId) {
    throw new ApiHttpError(403, 'TENANT_SCOPE_VIOLATION', 'No tienes acceso a este tenant')
  }
}

export function safeErrorResponse(error: unknown, request?: NextRequest): NextResponse {
  if (error instanceof ApiHttpError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
  }

  const requestId = request?.headers.get('x-request-id') || crypto.randomUUID()
  logger.error('api_error', { requestId, error: error instanceof Error ? error.message : String(error) })

  return NextResponse.json(
    {
      error: 'Error interno del servidor',
      code: 'INTERNAL_SERVER_ERROR',
      requestId,
    },
    { status: 500 }
  )
}
