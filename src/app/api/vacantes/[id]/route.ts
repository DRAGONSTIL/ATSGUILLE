// ATLAS GSE - API de Vacante por ID

import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireRole, requireTenantScope, safeErrorResponse } from '@/lib/api-security'
import { db } from '@/lib/db'
import { VacanteUpdateSchema } from '@/lib/validations'
import { canAccessEmpresa } from '@/lib/tenant-access'

// GET - Obtener vacante por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireSession()
    requireRole(user, ['ADMIN', 'GERENTE', 'RECLUTADOR'])

    const { id } = await params

    const vacante = await db.vacante.findUnique({
      where: { id },
      include: {
        empresa: { select: { id: true, nombre: true } },
        reclutador: { select: { id: true, name: true, email: true } },
        candidatos: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
            estatus: true,
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { candidatos: true } },
      },
    })

    if (!vacante) {
      return NextResponse.json({ error: 'Vacante no encontrada' }, { status: 404 })
    }

    requireTenantScope(user, { empresaId: vacante.empresaId })

    if (!canAccessEmpresa(user, vacante.empresaId)) {
      return NextResponse.json({ error: 'No tienes acceso a esta vacante' }, { status: 403 })
    }

    return NextResponse.json({
      ...vacante,
      candidatosCount: vacante._count.candidatos,
      _count: undefined,
    })
  } catch (error) {
    console.error('Error obteniendo vacante:', error)
    return safeErrorResponse(error, request)
  }
}

// PUT - Actualizar vacante
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireSession()
    requireRole(user, ['ADMIN', 'GERENTE'])

    // Solo GERENTE y ADMIN pueden editar vacantes
    if (user.rol === 'RECLUTADOR') {
      return NextResponse.json({ error: 'No tienes permiso para editar vacantes' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const data = VacanteUpdateSchema.parse(body)

    // Verificar que la vacante existe
    const vacanteExistente = await db.vacante.findUnique({
      where: { id },
    })

    if (!vacanteExistente) {
      return NextResponse.json({ error: 'Vacante no encontrada' }, { status: 404 })
    }

    requireTenantScope(user, { empresaId: vacanteExistente.empresaId })

    if (!canAccessEmpresa(user, vacanteExistente.empresaId)) {
      return NextResponse.json({ error: 'No tienes permiso para editar esta vacante' }, { status: 403 })
    }

    if (data.reclutadorId) {
      const reclutador = await db.user.findUnique({
        where: { id: data.reclutadorId },
        select: { empresaId: true },
      })

      if (!reclutador) {
        return NextResponse.json({ error: 'Reclutador no encontrado' }, { status: 404 })
      }

      const targetEmpresaId = vacanteExistente.empresaId
      if (reclutador.empresaId !== targetEmpresaId) {
        return NextResponse.json({ error: 'Reclutador fuera del tenant de la vacante' }, { status: 403 })
      }
    }

    // Actualizar vacante
    const vacante = await db.vacante.update({
      where: { id },
      data,
      include: {
        empresa: { select: { id: true, nombre: true } },
        reclutador: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(vacante)
  } catch (error) {
    console.error('Error actualizando vacante:', error)
    return safeErrorResponse(error, request)
  }
}

// DELETE - Eliminar vacante
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireSession()
    requireRole(user, ['ADMIN'])

    const { id } = await params

    // Verificar que la vacante existe
    const vacante = await db.vacante.findUnique({
      where: { id },
    })

    if (!vacante) {
      return NextResponse.json({ error: 'Vacante no encontrada' }, { status: 404 })
    }

    requireTenantScope(user, { empresaId: vacante.empresaId })

    // Desasociar candidatos (vacanteId a null)
    await db.candidato.updateMany({
      where: { vacanteId: id },
      data: { vacanteId: null },
    })

    // Eliminar vacante
    await db.vacante.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Vacante eliminada correctamente' })
  } catch (error) {
    console.error('Error eliminando vacante:', error)
    return safeErrorResponse(error, request)
  }
}
