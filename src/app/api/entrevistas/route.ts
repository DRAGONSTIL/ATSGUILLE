// ATLAS GSE - API de Entrevistas

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { emailEntrevista } from '@/lib/email'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ApiHttpError, requireRole, requireSession, requireTenantScope, safeErrorResponse, type SessionUser } from '@/lib/api-security'

const EntrevistaCreateSchema = z.object({
  candidatoId: z.string().min(1),
  titulo: z.string().optional(),
  tipo: z.string().optional(),
  fecha: z.string().transform(v => new Date(v)),
  duracion: z.number().optional(),
  ubicacion: z.string().optional(),
  enlace: z.string().optional(),
  notas: z.string().optional(),
})

async function getCandidateOrThrow(candidatoId: string) {
  const candidato = await db.candidato.findUnique({
    where: { id: candidatoId },
    include: { equipo: { select: { empresaId: true } } },
  })

  if (!candidato) {
    throw new ApiHttpError(404, 'NOT_FOUND', 'Candidato no encontrado')
  }

  return candidato
}

async function assertEntrevistaScope(user: SessionUser, entrevistaId: string) {
  const entrevista = await db.entrevista.findUnique({
    where: { id: entrevistaId },
    include: { candidato: { include: { equipo: { select: { empresaId: true } } } } },
  })

  if (!entrevista) {
    throw new ApiHttpError(404, 'NOT_FOUND', 'Entrevista no encontrada')
  }

  requireTenantScope(user, { empresaId: entrevista.candidato.equipo.empresaId })

  if (user.rol === 'RECLUTADOR' && entrevista.reclutadorId !== user.id) {
    throw new ApiHttpError(403, 'FORBIDDEN', 'No tienes permiso para esta entrevista')
  }

  return entrevista
}

// GET
export async function GET(request: NextRequest) {
  try {
    const { user } = await requireSession()
    requireRole(user, ['ADMIN', 'GERENTE', 'RECLUTADOR'])

    const where: Record<string, unknown> = {}

    if (user.rol === 'GERENTE') {
      requireTenantScope(user, { empresaId: user.empresaId })
      where.candidato = { equipo: { empresaId: user.empresaId } }
    } else if (user.rol === 'RECLUTADOR') {
      where.reclutadorId = user.id
    }

    const entrevistas = await db.entrevista.findMany({
      where,
      include: { candidato: { select: { id: true, nombre: true, apellido: true, email: true } } },
      orderBy: { fecha: 'asc' },
    })
    return NextResponse.json({ entrevistas })
  } catch (error) {
    return safeErrorResponse(error, request)
  }
}

// POST
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireSession()
    requireRole(user, ['ADMIN', 'GERENTE', 'RECLUTADOR'])

    const body = await request.json()
    const data = EntrevistaCreateSchema.parse(body)

    const candidato = await getCandidateOrThrow(data.candidatoId)
    requireTenantScope(user, { empresaId: candidato.equipo.empresaId })

    const entrevista = await db.entrevista.create({
      data: { ...data, reclutadorId: user.id },
      include: { candidato: { select: { id: true, nombre: true, apellido: true, email: true } } },
    })

    await db.actividad.create({
      data: {
        tipo: 'AGENDAR_ENTREVISTA',
        descripcion: 'Entrevista agendada',
        entidad: 'entrevista',
        entidadId: entrevista.id,
        usuarioId: user.id,
        candidatoId: data.candidatoId,
      },
    })

    if (entrevista.candidato?.email) {
      try {
        await emailEntrevista(entrevista.candidato.email, {
          candidatoNombre: `${entrevista.candidato.nombre} ${entrevista.candidato.apellido}`,
          vacanteTitulo: 'Proceso de selección',
          fecha: format(new Date(entrevista.fecha), "d 'de' MMMM yyyy", { locale: es }),
          hora: format(new Date(entrevista.fecha), 'HH:mm'),
          modalidad: entrevista.tipo === 'VIDEO' ? 'Video llamada' :
                    entrevista.tipo === 'TELEFONICA' ? 'Llamada telefónica' : 'Presencial',
          ubicacion: entrevista.enlace || entrevista.ubicacion || undefined,
        })
      } catch (emailError) {
        console.error('Error enviando email de entrevista:', emailError)
      }
    }

    return NextResponse.json(entrevista, { status: 201 })
  } catch (error) {
    return safeErrorResponse(error, request)
  }
}
