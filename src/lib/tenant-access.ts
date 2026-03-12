export type SessionUser = {
  id: string
  rol: 'ADMIN' | 'GERENTE' | 'RECLUTADOR'
  empresaId?: string | null
}

export function canAccessEmpresa(user: SessionUser, empresaId: string | null | undefined): boolean {
  if (user.rol === 'ADMIN') return true
  if (!empresaId) return false
  return user.empresaId === empresaId
}

export function withTenantScope<T extends Record<string, unknown>>(
  user: SessionUser,
  where: T,
  tenantField: string = 'empresaId'
): T {
  if (user.rol === 'ADMIN') return where

  if (!user.empresaId) {
    throw new Error('Usuario sin tenant asignado')
  }

  return {
    ...where,
    [tenantField]: user.empresaId,
  } as T
}

export function canAccessOwnedResource(
  user: SessionUser,
  resource: {
    empresaId?: string | null
    reclutadorId?: string | null
  }
): boolean {
  if (user.rol === 'ADMIN') return true

  if (user.rol === 'GERENTE') {
    return canAccessEmpresa(user, resource.empresaId)
  }

  return resource.reclutadorId === user.id
}
