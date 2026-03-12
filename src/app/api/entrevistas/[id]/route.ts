import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, requireSession, requireTenantScope, safeErrorResponse } from '@/lib/api-security'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireSession()
    requireRole(user, ['ADMIN', 'GERENTE', 'RECLUTADOR'])

    const { id } = await params
    const body = await request.json()

    const entrevistaExistente = await db.entrevista.findUnique({
      where: { id },
      include: { candidato: { include: { equipo: { select: { empresaId: true } } } } },
    })

    if (!entrevistaExistente) {
      return NextResponse.json({ error: 'Entrevista no encontrada' }, { status: 404 })
    }

    requireTenantScope(user, { empresaId: entrevistaExistente.candidato.equipo.empresaId })

    if (user.rol === 'RECLUTADOR' && entrevistaExistente.reclutadorId !== user.id) {
      return NextResponse.json({ error: 'No tienes permiso para actualizar esta entrevista' }, { status: 403 })
    }

    const entrevista = await db.entrevista.update({
      where: { id },
      data: body,
      include: {
        candidato: { select: { id: true, nombre: true, apellido: true, email: true } },
      },
    })

    return NextResponse.json(entrevista)
  } catch (error) {
    return safeErrorResponse(error, request)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireSession()
    requireRole(user, ['ADMIN', 'GERENTE', 'RECLUTADOR'])

    const { id } = await params

    const entrevistaExistente = await db.entrevista.findUnique({
      where: { id },
      include: { candidato: { include: { equipo: { select: { empresaId: true } } } } },
    })

    if (!entrevistaExistente) {
      return NextResponse.json({ error: 'Entrevista no encontrada' }, { status: 404 })
    }

    requireTenantScope(user, { empresaId: entrevistaExistente.candidato.equipo.empresaId })

    if (user.rol === 'RECLUTADOR' && entrevistaExistente.reclutadorId !== user.id) {
      return NextResponse.json({ error: 'No tienes permiso para eliminar esta entrevista' }, { status: 403 })
    }

    await db.entrevista.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return safeErrorResponse(error, request)
  }
}
