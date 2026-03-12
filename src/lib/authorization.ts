import { ApiHttpError, SessionUser } from '@/lib/api-security'

export type PermissionAction =
  | 'candidate.read'
  | 'candidate.update'
  | 'candidate.delete'
  | 'candidate.bulkUpdate'
  | 'candidate.assign'
  | 'user.assignTeam'

export interface ResourceContext {
  tenantId?: string | null
  ownerUserId?: string | null
}

const rolePermissions: Record<SessionUser['rol'], PermissionAction[]> = {
  ADMIN: ['candidate.read', 'candidate.update', 'candidate.delete', 'candidate.bulkUpdate', 'candidate.assign', 'user.assignTeam'],
  GERENTE: ['candidate.read', 'candidate.update', 'candidate.delete', 'candidate.bulkUpdate', 'candidate.assign', 'user.assignTeam'],
  RECLUTADOR: ['candidate.read', 'candidate.update'],
}

export function getPermissionsByRole(role: SessionUser['rol']): PermissionAction[] {
  return rolePermissions[role] ?? []
}

export function authorize(user: SessionUser, action: PermissionAction, resource: ResourceContext = {}): void {
  const permissions = getPermissionsByRole(user.rol)
  if (!permissions.includes(action)) {
    throw new ApiHttpError(403, 'FORBIDDEN', 'No tienes permiso para esta acción')
  }

  if (user.rol !== 'ADMIN') {
    if (!user.empresaId) {
      throw new ApiHttpError(403, 'TENANT_REQUIRED', 'Usuario sin empresa asignada')
    }

    if (resource.tenantId && resource.tenantId !== user.empresaId) {
      throw new ApiHttpError(404, 'NOT_FOUND', 'Recurso no encontrado')
    }

    if (user.rol === 'RECLUTADOR' && resource.ownerUserId && resource.ownerUserId !== user.id) {
      throw new ApiHttpError(404, 'NOT_FOUND', 'Recurso no encontrado')
    }
  }
}
