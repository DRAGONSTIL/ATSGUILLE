import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withApiAuth, requireAuthorization, safeErrorResponse } from '@/server/api/secure-route'
import { tenantDb, resolveCandidateIdsForTenant } from '@/server/tenant/tenantClient'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/audit'

const EvaluacionBulkAssignSchema = z.object({
  evaluacionId: z.string().min(1),
  candidatoIds: z.array(z.string()).min(1),
})

export async function POST(request: NextRequest) {
  try {
    return await withApiAuth(async (_request, user) => {
      requireAuthorization(user, 'candidate.assign', { tenantId: user.empresaId })

      const { evaluacionId, candidatoIds } = EvaluacionBulkAssignSchema.parse(await request.json())
      const authorizedIds = await resolveCandidateIdsForTenant(tenantDb(user), candidatoIds)

      let assigned = 0
      for (const candidatoId of authorizedIds) {
        const existing = await db.respuestaEvaluacion.findUnique({
          where: { evaluacionId_candidatoId: { evaluacionId, candidatoId } },
        })

        if (!existing) {
          await db.respuestaEvaluacion.create({
            data: { evaluacionId, candidatoId, respuestas: '{}' },
          })
          assigned += 1
        }
      }

      await logAudit({
        actor: user,
        action: 'evaluacion.bulk.assign',
        entityType: 'respuestaEvaluacion',
        before: { requestedIds: candidatoIds },
        after: { authorizedIds, assigned, evaluacionId },
        request,
      })

      return NextResponse.json({ success: true, asignados: assigned, message: `Evaluación asignada a ${assigned} candidatos` })
    }, request)
  } catch (error) {
    return safeErrorResponse(error, request)
  }
}
