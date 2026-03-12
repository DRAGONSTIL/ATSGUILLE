import { NextRequest, NextResponse } from 'next/server'
import { CandidatoBulkActionSchema } from '@/lib/validations'
import { withApiAuth, requireAuthorization, safeErrorResponse } from '@/server/api/secure-route'
import { tenantDb, resolveCandidateIdsForTenant } from '@/server/tenant/tenantClient'
import { bulkAppendCandidateNote, bulkDeleteCandidates, bulkUpdateCandidateStatus } from '@/server/repositories/candidato-repository'
import { checkRateLimitAsync, getRateLimitIdentifier } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'

export async function PUT(request: NextRequest) {
  try {
    return await withApiAuth(async (_request, user) => {
      requireAuthorization(user, 'candidate.bulkUpdate', { tenantId: user.empresaId })

      const rateLimitResult = await checkRateLimitAsync(
        getRateLimitIdentifier(request, user.id, user.empresaId),
        'create'
      )

      if (!rateLimitResult.success) {
        return NextResponse.json({ error: rateLimitResult.error }, { status: 429, headers: rateLimitResult.headers })
      }

      const data = CandidatoBulkActionSchema.parse(await request.json())
      const ctx = tenantDb(user)
      const authorizedIds = await resolveCandidateIdsForTenant(ctx, data.ids)

      if (authorizedIds.length === 0) {
        return NextResponse.json({ message: 'No se encontraron candidatos autorizados', affected: 0 })
      }

      let affected = 0
      if (data.action === 'cambiar_estatus' && data.estatus) {
        affected = (await bulkUpdateCandidateStatus(authorizedIds, data.estatus)).count
      } else if (data.action === 'agregar_nota' && data.nota) {
        affected = await bulkAppendCandidateNote(authorizedIds, data.nota)
      } else if (data.action === 'eliminar') {
        affected = (await bulkDeleteCandidates(authorizedIds)).count
      } else {
        return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
      }

      await logAudit({
        actor: user,
        action: `candidate.bulk.${data.action}`,
        entityType: 'candidato',
        before: { requestedIds: data.ids },
        after: { affected, authorizedIds },
        request,
      })

      return NextResponse.json({ message: `Acción ${data.action} completada`, affected })
    }, request)
  } catch (error) {
    return safeErrorResponse(error, request)
  }
}
