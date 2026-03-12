import { db } from '@/lib/db'
import { SessionUser } from '@/lib/api-security'

export interface TenantBoundContext {
  tenantId: string | null
  userId: string
  role: SessionUser['rol']
}

export function tenantDb(user: SessionUser): TenantBoundContext {
  return {
    tenantId: user.empresaId ?? null,
    userId: user.id,
    role: user.rol,
  }
}

export async function resolveCandidateIdsForTenant(ctx: TenantBoundContext, ids: string[]): Promise<string[]> {
  if (ids.length === 0) {
    return []
  }

  const allowed = await db.candidato.findMany({
    where: {
      id: { in: ids },
      equipo: ctx.tenantId
        ? {
            empresaId: ctx.tenantId,
          }
        : undefined,
      ...(ctx.role === 'RECLUTADOR' ? { reclutadorId: ctx.userId } : {}),
    },
    select: { id: true },
  })

  return allowed.map((item) => item.id)
}
