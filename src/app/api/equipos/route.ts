// ATLAS GSE - API de Equipos

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { EquipoCreateSchema, EquipoUpdateSchema } from '@/lib/validations'
import { checkRateLimitAsync, getRateLimitIdentifier } from '@/lib/rate-limit'
import { requireRole, requireSession, requireTenantScope, safeErrorResponse } from '@/lib/api-security'

// GET - Listar equipos
export async function GET(request: NextRequest) {
  try {
    const { user } = await requireSession()
    requireRole(user, ['ADMIN', 'GERENTE', 'RECLUTADOR'])

    const { searchParams } = new URL(request.url)
    const empresaId = searchParams.get('empresaId')

    const where: Record<string, unknown> = {}

    if (user.rol === 'ADMIN') {
      if (empresaId) where.empresaId = empresaId
    } else {
      requireTenantScope(user, { empresaId: user.empresaId })
      where.empresaId = user.empresaId
    }

    const equipos = await db.equipo.findMany({
      where,
      include: {
        empresa: { select: { id: true, nombre: true } },
        _count: { select: { usuarios: true, candidatos: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const equiposConConteo = equipos.map((e) => ({
      ...e,
      usuariosCount: e._count.usuarios,
      candidatosCount: e._count.candidatos,
      _count: undefined,
    }))

    return NextResponse.json({ equipos: equiposConConteo })
  } catch (error) {
    return safeErrorResponse(error, request)
  }
}

// POST - Crear equipo
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireSession()
    requireRole(user, ['ADMIN', 'GERENTE'])

    const rateLimitResult = await checkRateLimitAsync(
      getRateLimitIdentifier(request, user.id),
      'create'
    )
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: rateLimitResult.error },
        { status: 429, headers: rateLimitResult.headers }
      )
    }

    const body = await request.json()
    const data = EquipoCreateSchema.parse(body)

    if (user.rol === 'GERENTE') {
      data.empresaId = user.empresaId!
    }

    requireTenantScope(user, { empresaId: data.empresaId })

    const equipo = await db.equipo.create({
      data,
      include: {
        empresa: { select: { id: true, nombre: true } },
      },
    })

    return NextResponse.json(equipo, { status: 201 })
  } catch (error) {
    return safeErrorResponse(error, request)
  }
}

// PUT - Actualizar equipo
export async function PUT(request: NextRequest) {
  try {
    const { user } = await requireSession()
    requireRole(user, ['ADMIN', 'GERENTE'])

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID de equipo requerido' }, { status: 400 })
    }

    const body = await request.json()
    const data = EquipoUpdateSchema.parse(body)

    const equipo = await db.equipo.findUnique({
      where: { id },
      select: { empresaId: true },
    })

    if (!equipo) {
      return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })
    }

    requireTenantScope(user, { empresaId: equipo.empresaId })

    const updatedEquipo = await db.equipo.update({
      where: { id },
      data,
      include: {
        empresa: { select: { id: true, nombre: true } },
      },
    })

    return NextResponse.json(updatedEquipo)
  } catch (error) {
    return safeErrorResponse(error, request)
  }
}

// DELETE - Eliminar equipo
export async function DELETE(request: NextRequest) {
  try {
    const { user } = await requireSession()
    requireRole(user, ['ADMIN'])

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID de equipo requerido' }, { status: 400 })
    }

    const equipo = await db.equipo.findUnique({
      where: { id },
      select: { empresaId: true },
    })

    if (!equipo) {
      return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })
    }

    requireTenantScope(user, { empresaId: equipo.empresaId })

    await db.equipo.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    return safeErrorResponse(error, request)
  }
}
