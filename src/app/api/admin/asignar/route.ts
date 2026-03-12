import { NextRequest, NextResponse } from 'next/server'
import { AdminAsignarSchema } from '@/lib/validations'
import { withApiAuth, requireAuthorization, safe404, safeErrorResponse } from '@/server/api/secure-route'
import { tenantDb, resolveCandidateIdsForTenant } from '@/server/tenant/tenantClient'
import { findTeamWithinTenant, findUserWithinTenant } from '@/server/repositories/admin-repository'
import { bulkAssignRecruiter, bulkAssignVacante, bulkClearRecruiter, bulkClearVacante, findVacanteInTenant, updateUserTeam } from '@/server/repositories/candidato-command-repository'
import { logAudit } from '@/lib/audit'

export async function POST(request: NextRequest) {
  try {
    return await withApiAuth(async (_request, user) => {
      requireAuthorization(user, 'candidate.assign', { tenantId: user.empresaId })

      const body = AdminAsignarSchema.parse(await request.json())
      const ctx = tenantDb(user)

      if (body.usuarioId && body.equipoId) {
        requireAuthorization(user, 'user.assignTeam', { tenantId: user.empresaId })
        const [usuario, equipo] = await Promise.all([
          findUserWithinTenant(ctx, body.usuarioId),
          findTeamWithinTenant(ctx, body.equipoId),
        ])

        if (!usuario || !equipo) {
          return safe404()
        }

        const updatedUser = await updateUserTeam(usuario.id, equipo.id, equipo.empresaId)

        await logAudit({
          actor: user,
          action: 'admin.user.assign_team',
          entityType: 'user',
          entityId: usuario.id,
          before: { equipoId: usuario.equipoId },
          after: { equipoId: equipo.id },
          request,
        })

        return NextResponse.json({ message: 'Usuario asignado al equipo correctamente', usuario: updatedUser })
      }

      const ids = body.candidatoIds ?? []
      const authorizedIds = await resolveCandidateIdsForTenant(ctx, ids)
      if (authorizedIds.length === 0 || !body.action) {
        return NextResponse.json({ message: 'No hay candidatos autorizados para esta acción', count: 0 })
      }

      let resultCount = 0
      if (body.action === 'asignar_reclutador' && body.reclutadorId) {
        const recruiter = await findUserWithinTenant(ctx, body.reclutadorId)
        if (!recruiter) return safe404()
        resultCount = (await bulkAssignRecruiter(authorizedIds, recruiter.id)).count
      } else if (body.action === 'asignar_vacante' && body.vacanteId) {
        const vacante = await findVacanteInTenant(body.vacanteId, ctx.tenantId)
        if (!vacante) return safe404()
        resultCount = (await bulkAssignVacante(authorizedIds, vacante.id)).count
      } else if (body.action === 'desasignar_reclutador') {
        resultCount = (await bulkClearRecruiter(authorizedIds)).count
      } else if (body.action === 'desasignar_vacante') {
        resultCount = (await bulkClearVacante(authorizedIds)).count
      }

      await logAudit({
        actor: user,
        action: `admin.candidate.${body.action}`,
        entityType: 'candidato',
        before: { requestedIds: ids },
        after: { authorizedIds, resultCount },
        request,
      })

      return NextResponse.json({ message: 'Asignación realizada', count: resultCount })
    }, request)
  } catch (error) {
    return safeErrorResponse(error, request)
  }
}

export async function DELETE(request: NextRequest) {
  return POST(request)
}
