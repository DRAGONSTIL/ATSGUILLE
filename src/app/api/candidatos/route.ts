// ATLAS GSE - API de Candidatos

import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireRole, requireTenantScope, safeErrorResponse } from '@/lib/api-security'
import { db } from '@/lib/db'
import { CandidatoCreateSchema, CandidatoFilterSchema } from '@/lib/validations'
import { checkRateLimitAsync, getRateLimitIdentifier } from '@/lib/rate-limit'
import { canAccessEmpresa } from '@/lib/tenant-access'

// GET - Listar candidatos
export async function GET(request: NextRequest) {
  try {
    const { user } = await requireSession()
    requireRole(user, ['ADMIN', 'GERENTE', 'RECLUTADOR'])

    const { searchParams } = new URL(request.url)
    const filters = CandidatoFilterSchema.parse({
      estatus: searchParams.get('estatus') || undefined,
      reclutadorId: searchParams.get('reclutadorId') || undefined,
      vacanteId: searchParams.get('vacanteId') || undefined,
      fuente: searchParams.get('fuente') || undefined,
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 15,
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
    })

    const skip = (filters.page - 1) * filters.limit

    // Construir filtros
    const where: any = {}

    // Filtrar por empresa/equipo según el rol
    if (user.rol === 'ADMIN') {
      // Admin ve todos
    } else if (user.rol === 'GERENTE') {
      where.equipo = { empresaId: user.empresaId }
    } else {
      // Reclutador solo ve sus candidatos
      where.reclutadorId = user.id
    }

    if (filters.estatus) where.estatus = filters.estatus
    if (filters.reclutadorId) where.reclutadorId = filters.reclutadorId
    if (filters.vacanteId) where.vacanteId = filters.vacanteId
    if (filters.fuente) where.fuente = filters.fuente

    if (filters.search) {
      where.OR = [
        { nombre: { contains: filters.search } },
        { apellido: { contains: filters.search } },
        { email: { contains: filters.search } },
      ]
    }

    // Obtener candidatos
    const [candidatos, total] = await Promise.all([
      db.candidato.findMany({
        where,
        include: {
          vacante: { select: { id: true, titulo: true } },
          reclutador: { select: { id: true, name: true } },
          equipo: { select: { id: true, nombre: true } },
          documentos: { select: { id: true, nombre: true, tipo: true } },
        },
        orderBy: { [filters.sortBy || 'createdAt']: filters.sortOrder },
        skip,
        take: filters.limit,
      }),
      db.candidato.count({ where }),
    ])

    return NextResponse.json({
      candidatos,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    })
  } catch (error) {
    console.error('Error obteniendo candidatos:', error)
    return safeErrorResponse(error, request)
  }
}

// POST - Crear candidato
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireSession()
    requireRole(user, ['ADMIN', 'GERENTE', 'RECLUTADOR'])

    // Rate limiting
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
    const data = CandidatoCreateSchema.parse(body)

    // Verificar permisos
    if (user.rol === 'RECLUTADOR') {
      data.reclutadorId = user.id
      data.equipoId = user.equipoId!
    }

    // Verificar que el equipo existe
    const equipo = await db.equipo.findUnique({
      where: { id: data.equipoId },
    })

    if (!equipo) {
      return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })
    }

    requireTenantScope(user, { empresaId: equipo.empresaId })

    if (!canAccessEmpresa(user, equipo.empresaId)) {
      return NextResponse.json({ error: 'No tienes acceso a este equipo' }, { status: 403 })
    }

    if (data.vacanteId) {
      const vacante = await db.vacante.findUnique({
        where: { id: data.vacanteId },
        select: { empresaId: true },
      })

      if (!vacante) {
        return NextResponse.json({ error: 'Vacante no encontrada' }, { status: 404 })
      }

      requireTenantScope(user, { empresaId: vacante.empresaId })

      if (!canAccessEmpresa(user, vacante.empresaId) || vacante.empresaId !== equipo.empresaId) {
        return NextResponse.json(
          { error: 'La vacante no pertenece al mismo tenant del equipo' },
          { status: 403 }
        )
      }
    }

    // Crear candidato
    const candidato = await db.candidato.create({
      data,
      include: {
        vacante: { select: { id: true, titulo: true } },
        reclutador: { select: { id: true, name: true } },
        equipo: { select: { id: true, nombre: true } },
      },
    })

    // Registrar actividad
    await db.actividad.create({
      data: {
        tipo: 'CREAR_CANDIDATO',
        descripcion: `Candidato ${candidato.nombre} ${candidato.apellido} registrado`,
        entidad: 'candidato',
        entidadId: candidato.id,
        usuarioId: user.id,
        candidatoId: candidato.id,
      },
    })

    return NextResponse.json(candidato, { status: 201 })
  } catch (error) {
    console.error('Error creando candidato:', error)
    return safeErrorResponse(error, request)
  }
}
