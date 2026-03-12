// ATLAS GSE - API de Notas

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { ApiHttpError, requireRole, requireSession, requireTenantScope, safeErrorResponse, type SessionUser } from '@/lib/api-security'

const NotaCreateSchema = z.object({
  titulo: z.string().optional(),
  contenido: z.string().min(1),
  tipo: z.string().optional(),
  entidad: z.string().optional(),
  entidadId: z.string().optional(),
  candidatoId: z.string().optional(),
  vacanteId: z.string().optional(),
})

async function assertCandidateScope(user: SessionUser, candidatoId?: string | null) {
  if (!candidatoId) return
  const candidato = await db.candidato.findUnique({
    where: { id: candidatoId },
    include: { equipo: { select: { empresaId: true } } },
  })
  if (!candidato) throw new ApiHttpError(404, 'NOT_FOUND', 'Candidato no encontrado')
  requireTenantScope(user, { empresaId: candidato.equipo.empresaId })
}

async function assertVacanteScope(user: SessionUser, vacanteId?: string | null) {
  if (!vacanteId) return
  const vacante = await db.vacante.findUnique({
    where: { id: vacanteId },
    select: { empresaId: true },
  })
  if (!vacante) throw new ApiHttpError(404, 'NOT_FOUND', 'Vacante no encontrada')
  requireTenantScope(user, { empresaId: vacante.empresaId })
}

// GET - Listar notas
export async function GET(request: NextRequest) {
  try {
    const { user } = await requireSession()
    requireRole(user, ['ADMIN', 'GERENTE', 'RECLUTADOR'])

    const { searchParams } = new URL(request.url)
    const candidatoId = searchParams.get('candidatoId')
    const entidad = searchParams.get('entidad')
    const entidadId = searchParams.get('entidadId')

    await assertCandidateScope(user, candidatoId)

    const where: Record<string, unknown> = { archived: false }
    if (candidatoId) where.candidatoId = candidatoId
    if (entidad && entidadId) {
      where.entidad = entidad
      where.entidadId = entidadId
    }

    if (user.rol === 'GERENTE') {
      where.usuario = { empresaId: user.empresaId }
    } else if (user.rol === 'RECLUTADOR') {
      where.usuarioId = user.id
    }

    const notas = await db.nota.findMany({
      where,
      include: {
        usuario: { select: { id: true, name: true, email: true } },
        candidato: { select: { id: true, nombre: true, apellido: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json({ notas })
  } catch (error) {
    return safeErrorResponse(error, request)
  }
}

// POST - Crear nota
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireSession()
    requireRole(user, ['ADMIN', 'GERENTE', 'RECLUTADOR'])

    const body = await request.json()
    const data = NotaCreateSchema.parse(body)

    await assertCandidateScope(user, data.candidatoId)
    await assertVacanteScope(user, data.vacanteId)

    const nota = await db.nota.create({
      data: {
        ...data,
        usuarioId: user.id,
      },
      include: {
        usuario: { select: { id: true, name: true, email: true } },
        candidato: { select: { id: true, nombre: true, apellido: true } },
      },
    })

    if (data.candidatoId) {
      await db.actividad.create({
        data: {
          tipo: 'NOTA_AGREGADA',
          descripcion: `Nota agregada: ${data.titulo || 'Sin título'}`,
          entidad: 'candidato',
          entidadId: data.candidatoId,
          usuarioId: user.id,
          candidatoId: data.candidatoId,
        },
      })
    }

    return NextResponse.json(nota, { status: 201 })
  } catch (error) {
    return safeErrorResponse(error, request)
  }
}

// PUT - Actualizar nota
export async function PUT(request: NextRequest) {
  try {
    const { user } = await requireSession()
    requireRole(user, ['ADMIN', 'GERENTE', 'RECLUTADOR'])

    const body = await request.json()
    const { id, ...data } = body as { id?: string; candidatoId?: string; vacanteId?: string }

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const notaExistente = await db.nota.findUnique({
      where: { id },
      include: {
        usuario: { select: { empresaId: true } },
      },
    })

    if (!notaExistente) {
      return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 })
    }

    if (user.rol === 'RECLUTADOR' && notaExistente.usuarioId !== user.id) {
      return NextResponse.json({ error: 'No tienes permiso para editar esta nota' }, { status: 403 })
    }

    if (user.rol === 'GERENTE') {
      requireTenantScope(user, { empresaId: notaExistente.usuario?.empresaId })
    }

    await assertCandidateScope(user, data.candidatoId)
    await assertVacanteScope(user, data.vacanteId)

    const nota = await db.nota.update({
      where: { id },
      data,
      include: {
        usuario: { select: { id: true, name: true, email: true } },
        candidato: { select: { id: true, nombre: true, apellido: true } },
      },
    })

    return NextResponse.json(nota)
  } catch (error) {
    return safeErrorResponse(error, request)
  }
}

// DELETE - Eliminar nota (archivar)
export async function DELETE(request: NextRequest) {
  try {
    const { user } = await requireSession()
    requireRole(user, ['ADMIN', 'GERENTE', 'RECLUTADOR'])

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const notaExistente = await db.nota.findUnique({
      where: { id },
      include: { usuario: { select: { empresaId: true } } },
    })

    if (!notaExistente) {
      return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 })
    }

    if (user.rol === 'RECLUTADOR' && notaExistente.usuarioId !== user.id) {
      return NextResponse.json({ error: 'No tienes permiso para eliminar esta nota' }, { status: 403 })
    }

    if (user.rol === 'GERENTE') {
      requireTenantScope(user, { empresaId: notaExistente.usuario?.empresaId })
    }

    await db.nota.update({
      where: { id },
      data: { archived: true },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return safeErrorResponse(error, request)
  }
}
