import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function updateCandidate(candidateId: string, data: Prisma.CandidatoUpdateInput) {
  return db.candidato.update({ where: { id: candidateId }, data })
}

export async function deleteCandidate(candidateId: string) {
  await db.documento.deleteMany({ where: { candidatoId: candidateId } })
  return db.candidato.delete({ where: { id: candidateId } })
}

export async function bulkAssignRecruiter(candidateIds: string[], recruiterId: string) {
  return db.candidato.updateMany({ where: { id: { in: candidateIds } }, data: { reclutadorId: recruiterId } })
}

export async function bulkAssignVacante(candidateIds: string[], vacanteId: string) {
  return db.candidato.updateMany({ where: { id: { in: candidateIds } }, data: { vacanteId } })
}

export async function bulkClearRecruiter(candidateIds: string[]) {
  return db.candidato.updateMany({ where: { id: { in: candidateIds } }, data: { reclutadorId: null } })
}

export async function bulkClearVacante(candidateIds: string[]) {
  return db.candidato.updateMany({ where: { id: { in: candidateIds } }, data: { vacanteId: null } })
}

export async function updateUserTeam(userId: string, teamId: string, empresaId: string) {
  return db.user.update({ where: { id: userId }, data: { equipoId: teamId, empresaId }, include: { equipo: { select: { id: true, nombre: true } } } })
}

export async function findVacanteInTenant(vacanteId: string, tenantId: string | null) {
  return db.vacante.findFirst({ where: { id: vacanteId, empresaId: tenantId ?? undefined } })
}
