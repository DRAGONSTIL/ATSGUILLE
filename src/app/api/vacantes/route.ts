// ATLAS GSE - API de Vacantes

import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireRole, requireTenantScope, safeErrorResponse } from '@/lib/api-security'
import { db } from '@/lib/db'
import { VacanteCreateSchema, VacanteFilterSchema } from '@/lib/validations'
import { checkRateLimitAsync, getRateLimitIdentifier } from '@/lib/rate-limit'
import { canAccessEmpresa, withTenantScope } from '@/lib/tenant-access'

// GET - Listar vacantes
export async function GET(request: NextRequest) {
  try {
    const { user } = await requireSession()
    requireRole(user, ['ADMIN', 'GERENTE', 'RECLUTADOR'])

    const { searchParams } = new URL(request.url)
    const filters = VacanteFilterSchema.parse({
      estatus: searchParams.get('estatus') || undefined,
      empresaId: searchParams.get('empresaId') || undefined,
      reclutadorId: searchParams.get('reclutadorId') || undefined,
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 50,
    })

    const skip = (filters.page - 1) * filters.limit

    // Construir filtros
    const where: any = {}

    // Filtrar por empresa según el rol (enforcement central)
    if (user.rol === 'ADMIN') {
      if (filters.empresaId) where.empresaId = filters.empresaId
    } else {
      Object.assign(where, withTenantScope(user, {}, 'empresaId'))
    }

    if (filters.estatus) where.estatus = filters.estatus
    if (filters.reclutadorId) where.reclutadorId = filters.reclutadorId

    // Obtener vacantes con conteo de candidatos
    const [vacantes, total] = await Promise.all([
      db.vacante.findMany({
        where,
        include: {
          empresa: { select: { id: true, nombre: true } },
          reclutador: { select: { id: true, name: true } },
          _count: { select: { candidatos: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: filters.limit,
      }),
      db.vacante.count({ where }),
    ])

    // Transformar para incluir conteo
    const vacantesConConteo = vacantes.map((v) => ({
      ...v,
      candidatosCount: v._count.candidatos,
      _count: undefined,
    }))

    return NextResponse.json({
      vacantes: vacantesConConteo,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    })
  } catch (error) {
    console.error('Error obteniendo vacantes:', error)
    return safeErrorResponse(error, request)
  }
}

// POST - Crear vacante
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireSession()
    requireRole(user, ['ADMIN', 'GERENTE'])

    // Solo GERENTE y ADMIN pueden crear vacantes
    if (user.rol === 'RECLUTADOR') {
      return NextResponse.json({ error: 'No tienes permiso para crear vacantes' }, { status: 403 })
    }

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
    const data = VacanteCreateSchema.parse(body)

    // Si es GERENTE, usar su empresa
    if (user.rol === 'GERENTE') {
      data.empresaId = user.empresaId!
    }

    requireTenantScope(user, { empresaId: data.empresaId })

    if (!canAccessEmpresa(user, data.empresaId)) {
      return NextResponse.json({ error: 'No tienes acceso a esta empresa' }, { status: 403 })
    }

    if (data.reclutadorId) {
      const reclutador = await db.user.findUnique({
        where: { id: data.reclutadorId },
        select: { empresaId: true },
      })

      if (!reclutador) {
        return NextResponse.json({ error: 'Reclutador no encontrado' }, { status: 404 })
      }

      requireTenantScope(user, { empresaId: reclutador.empresaId })

      if (!canAccessEmpresa(user, reclutador.empresaId) || reclutador.empresaId !== data.empresaId) {
        return NextResponse.json({ error: 'Reclutador fuera del tenant de la vacante' }, { status: 403 })
      }
    }

    // Crear vacante
    const vacante = await db.vacante.create({
      data,
      include: {
        empresa: { select: { id: true, nombre: true } },
        reclutador: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(vacante, { status: 201 })
  } catch (error) {
    console.error('Error creando vacante:', error)
    return safeErrorResponse(error, request)
  }
}
