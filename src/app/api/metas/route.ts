import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { MetaCreateSchema, MetaFilterSchema } from '@/lib/validations'
import { deriveMetaStatus } from '@/lib/workflow'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const filters = MetaFilterSchema.parse({
      reclutadorId: searchParams.get('reclutadorId') || undefined,
      tipo: searchParams.get('tipo') || undefined,
      periodo: searchParams.get('periodo') || undefined,
      estatus: searchParams.get('estatus') || undefined,
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 50,
    })

    const skip = (filters.page - 1) * filters.limit
    const where: any = {}

    if (session.user.rol === 'RECLUTADOR') {
      where.reclutadorId = session.user.id
    } else if (session.user.rol === 'GERENTE') {
      const reclutadores = await db.user.findMany({
        where: { empresaId: session.user.empresaId, rol: { in: ['RECLUTADOR', 'GERENTE'] } },
        select: { id: true },
      })
      const allowedIds = reclutadores.map((r) => r.id)
      where.reclutadorId = filters.reclutadorId
        ? { in: allowedIds.filter((id) => id === filters.reclutadorId) }
        : { in: allowedIds }
    } else if (filters.reclutadorId) {
      where.reclutadorId = filters.reclutadorId
    }

    if (filters.tipo) where.tipo = filters.tipo
    if (filters.periodo) where.periodo = filters.periodo

    const [metasRaw, total] = await Promise.all([
      db.meta.findMany({
        where,
        include: { reclutador: { select: { id: true, name: true, email: true } } },
        orderBy: { fechaFin: 'asc' },
        skip,
        take: filters.limit,
      }),
      db.meta.count({ where }),
    ])

    const metas = metasRaw
      .map((meta) => ({ ...meta, estatus: deriveMetaStatus(meta) }))
      .filter((meta) => (filters.estatus ? meta.estatus === filters.estatus : true))

    return NextResponse.json({
      metas,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener metas', details: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (session.user.rol === 'RECLUTADOR') {
      return NextResponse.json({ error: 'No tienes permiso para crear metas' }, { status: 403 })
    }

    const data = MetaCreateSchema.parse(await request.json())

    const reclutador = await db.user.findUnique({ where: { id: data.reclutadorId } })
    if (!reclutador) return NextResponse.json({ error: 'Reclutador no encontrado' }, { status: 404 })

    if (session.user.rol !== 'ADMIN' && reclutador.empresaId !== session.user.empresaId) {
      return NextResponse.json({ error: 'No puedes asignar metas a este reclutador' }, { status: 403 })
    }

    const estatus = deriveMetaStatus({
      valor: data.valor,
      valorActual: 0,
      fechaInicio: data.fechaInicio,
      fechaFin: data.fechaFin,
    })

    const meta = await db.meta.create({
      data: { ...data, estatus },
      include: { reclutador: { select: { id: true, name: true, email: true } } },
    })

    return NextResponse.json(meta, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear meta', details: String(error) }, { status: 500 })
  }
}
