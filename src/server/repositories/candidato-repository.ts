import { db } from '@/lib/db'
import { TenantBoundContext } from '@/server/tenant/tenantClient'

export async function findCandidateForRead(ctx: TenantBoundContext, candidateId: string) {
  return db.candidato.findFirst({
    where: {
      id: candidateId,
      // Ensure the candidate belongs to the same empresa as the requester
      equipo: ctx.tenantId ? { empresaId: ctx.tenantId } : undefined,
      // Reclutadores are further restricted to their assigned candidates
      ...(ctx.role === 'RECLUTADOR' ? { reclutadorId: ctx.userId } : {}),
    },
    include: {
      vacante: { select: { id: true, titulo: true, estatus: true } },
      reclutador: { select: { id: true, name: true, email: true } },
      equipo: { select: { id: true, nombre: true, empresaId: true } },
      documentos: true,
    },
  })
}

export async function bulkUpdateCandidateStatus(ids: string[], estatus: string) {
  return db.candidato.updateMany({ where: { id: { in: ids } }, data: { estatus: estatus as never } })
}

export async function bulkDeleteCandidates(ids: string[]) {
  await db.documento.deleteMany({ where: { candidatoId: { in: ids } } })
  return db.candidato.deleteMany({ where: { id: { in: ids } } })
}

export async function bulkAppendCandidateNote(ids: string[], note: string) {
  const candidates = await db.candidato.findMany({ where: { id: { in: ids } }, select: { id: true, notas: true } })
  for (const candidate of candidates) {
    const newNote = candidate.notas ? `${candidate.notas}\n\n---\n${new Date().toISOString()}: ${note}` : `${new Date().toISOString()}: ${note}`
    await db.candidato.update({ where: { id: candidate.id }, data: { notas: newNote } })
  }
  return candidates.length
}
