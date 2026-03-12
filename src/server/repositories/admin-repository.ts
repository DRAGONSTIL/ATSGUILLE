import { db } from '@/lib/db'
import { TenantBoundContext } from '@/server/tenant/tenantClient'

export async function findTeamWithinTenant(ctx: TenantBoundContext, teamId: string) {
  return db.equipo.findFirst({
    where: {
      id: teamId,
      empresaId: ctx.tenantId ?? undefined,
    },
  })
}

export async function findUserWithinTenant(ctx: TenantBoundContext, userId: string) {
  return db.user.findFirst({
    where: {
      id: userId,
      empresaId: ctx.tenantId ?? undefined,
    },
  })
}
