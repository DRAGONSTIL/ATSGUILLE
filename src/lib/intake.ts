import { db } from './db'
import { EstatusCandidato, IntakeSubmissionStatus } from '@prisma/client'
import { getDedupStrategy, type NormalizedIntakePayload } from './intake-normalize'

export async function upsertCandidateFromIntake(params: {
  empresaId: string
  equipoId: string
  normalized: NormalizedIntakePayload
}) {
  const { empresaId, equipoId, normalized } = params

  let existing = null as Awaited<ReturnType<typeof db.candidato.findFirst>>
  const strategy = getDedupStrategy(normalized)

  if (strategy.type === 'email') {
    existing = await db.candidato.findFirst({
      where: {
        email: strategy.value,
        equipo: { empresaId },
      },
    })
  }

  if (!existing && strategy.type === 'phone') {
    existing = await db.candidato.findFirst({
      where: {
        telefono: strategy.value,
        equipo: { empresaId },
      },
    })
  }

  const note = `Actualizado por Form (${normalized.sheetName}#${normalized.rowNumber ?? 's/n'})`

  if (existing) {
    const updated = await db.candidato.update({
      where: { id: existing.id },
      data: {
        nombre: existing.nombre || normalized.firstName,
        apellido: existing.apellido || normalized.lastName,
        email: existing.email || normalized.emailLower || `${normalized.externalSubmissionId}@intake.local`,
        telefono: existing.telefono || normalized.phoneDigits,
        notas: existing.notas ? `${existing.notas}\n${note}` : note,
        vacanteId: normalized.vacancyId || existing.vacanteId,
      },
    })

    return { candidate: updated, status: IntakeSubmissionStatus.DUPLICATE }
  }

  const created = await db.candidato.create({
    data: {
      nombre: normalized.firstName,
      apellido: normalized.lastName,
      email: normalized.emailLower || `${normalized.externalSubmissionId}@intake.local`,
      telefono: normalized.phoneDigits,
      estatus: EstatusCandidato.REGISTRADO,
      notas: note,
      equipoId,
      vacanteId: normalized.vacancyId || null,
    },
  })

  return { candidate: created, status: IntakeSubmissionStatus.PROCESSED }
}
