import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { isValidTaskTransition, TAREA_ESTATUS } from '@/lib/workflow'
import type { SessionUser } from '@/lib/api-security'

const PRIORIDADES = ['BAJA', 'MEDIA', 'ALTA', 'URGENTE'] as const

const TareaCreateSchema = z.object({
  titulo: z.string().min(1),
  descripcion: z.string().optional(),
  prioridad: z.enum(PRIORIDADES).optional(),
  estatus: z.enum(TAREA_ESTATUS).optional(),
  fechaLimite: z.string().transform((v) => (v ? new Date(v) : undefined)).optional(),
  entidad: z.string().optional(),
  entidadId: z.string().optional(),
  asignadoAId: z.string().optional(),
})

const TareaUpdateSchema = z.object({
  id: z.string().min(1),
  titulo: z.string().min(1).optional(),
  descripcion: z.string().optional(),
  prioridad: z.enum(PRIORIDADES).optional(),
  estatus: z.enum(TAREA_ESTATUS).optional(),
  fechaLimite: z.string().transform((v) => (v ? new Date(v) : null)).optional(),
  asignadoAId: z.string().nullable().optional(),
})

const TareaQuerySchema = z.object({
  estatus: z.enum(TAREA_ESTATUS).optional(),
  prioridad: z.enum(PRIORIDADES).optional(),
  asignadoAId: z.string().optional(),
  q: z.string().optional(),
  overdue: z.enum(['true', 'false']).optional(),
  onlyMine: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

function tenantWhere(user: SessionUser) {
  if (user.rol === 'ADMIN') return {}
  if (user.rol === 'GERENTE') {
    return {
      OR: [{ creadoPor: { empresaId: user.empresaId } }, { asignadoA: { empresaId: user.empresaId } }],
    }
  }
  return { OR: [{ creadoPorId: user.id }, { asignadoAId: user.id }] }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const user = session.user as SessionUser

    const { searchParams } = new URL(request.url)
    const query = TareaQuerySchema.parse({
      estatus: searchParams.get('estatus') || undefined,
      prioridad: searchParams.get('prioridad') || undefined,
      asignadoAId: searchParams.get('asignadoAId') || undefined,
      q: searchParams.get('q') || undefined,
      overdue: searchParams.get('overdue') || undefined,
      onlyMine: searchParams.get('onlyMine') || undefined,
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 50,
    })

    const andFilters: any[] = [tenantWhere(user)]

    if (query.estatus) andFilters.push({ estatus: query.estatus })
    if (query.prioridad) andFilters.push({ prioridad: query.prioridad })
    if (query.asignadoAId) andFilters.push({ asignadoAId: query.asignadoAId })

    if (query.q) {
      andFilters.push({
        OR: [
          { titulo: { contains: query.q, mode: 'insensitive' } },
          { descripcion: { contains: query.q, mode: 'insensitive' } },
        ],
      })
    }

    if (query.overdue === 'true') {
      andFilters.push({ estatus: { not: 'COMPLETADA' } })
      andFilters.push({ fechaLimite: { lt: new Date() } })
    }

    if (query.onlyMine === 'true') {
      andFilters.push({ OR: [{ creadoPorId: user.id }, { asignadoAId: user.id }] })
    }

    const where: any = { AND: andFilters }

    const skip = (query.page - 1) * query.limit
    const [tareas, total] = await Promise.all([
      db.tarea.findMany({
        where,
        include: {
          asignadoA: { select: { id: true, name: true, email: true } },
          creadoPor: { select: { id: true, name: true, email: true } },
        },
        orderBy: [{ estatus: 'asc' }, { prioridad: 'desc' }, { fechaLimite: 'asc' }],
        skip,
        take: query.limit,
      }),
      db.tarea.count({ where }),
    ])

    return NextResponse.json({
      tareas,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    })
  } catch {
    return NextResponse.json({ error: 'Error al obtener tareas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const data = TareaCreateSchema.parse(await request.json())

    if (data.asignadoAId) {
      const assigned = await db.user.findUnique({ where: { id: data.asignadoAId } })
      if (!assigned) return NextResponse.json({ error: 'Usuario asignado no encontrado' }, { status: 404 })
      if (session.user.rol !== 'ADMIN' && assigned.empresaId !== session.user.empresaId) {
        return NextResponse.json({ error: 'Asignación fuera de tu tenant' }, { status: 403 })
      }
    }

    const tarea = await db.tarea.create({
      data: { ...data, creadoPorId: session.user.id },
      include: {
        asignadoA: { select: { id: true, name: true, email: true } },
        creadoPor: { select: { id: true, name: true, email: true } },
      },
    })

    if (data.asignadoAId) {
      await db.notificacion.create({
        data: {
          usuarioId: data.asignadoAId,
          titulo: 'Nueva tarea asignada',
          mensaje: data.titulo,
          tipo: 'info',
          entidad: 'tarea',
          entidadId: tarea.id,
        },
      })
    }

    return NextResponse.json(tarea, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error al crear tarea' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const data = TareaUpdateSchema.parse(await request.json())

    const existing = await db.tarea.findUnique({
      where: { id: data.id },
      include: { creadoPor: true, asignadoA: true },
    })
    if (!existing) return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 })

    const canEdit =
      session.user.rol === 'ADMIN' ||
      existing.creadoPorId === session.user.id ||
      existing.asignadoAId === session.user.id ||
      (session.user.rol === 'GERENTE' && existing.creadoPor?.empresaId === session.user.empresaId)

    if (!canEdit) return NextResponse.json({ error: 'No tienes permiso para editar esta tarea' }, { status: 403 })

    if (data.estatus && !isValidTaskTransition(existing.estatus, data.estatus)) {
      return NextResponse.json({ error: `Cambio de estatus inválido: ${existing.estatus} → ${data.estatus}` }, { status: 422 })
    }

    if (data.asignadoAId) {
      const assigned = await db.user.findUnique({ where: { id: data.asignadoAId } })
      if (!assigned) return NextResponse.json({ error: 'Usuario asignado no encontrado' }, { status: 404 })
      if (session.user.rol !== 'ADMIN' && assigned.empresaId !== session.user.empresaId) {
        return NextResponse.json({ error: 'Asignación fuera de tu tenant' }, { status: 403 })
      }
    }

    const payload: any = { ...data }
    delete payload.id

    if (data.estatus === 'COMPLETADA') payload.completedAt = new Date()
    if (data.estatus && data.estatus !== 'COMPLETADA') payload.completedAt = null

    const tarea = await db.tarea.update({
      where: { id: data.id },
      data: payload,
      include: {
        asignadoA: { select: { id: true, name: true, email: true } },
        creadoPor: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json(tarea)
  } catch {
    return NextResponse.json({ error: 'Error al actualizar tarea' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const existing = await db.tarea.findUnique({ where: { id }, include: { creadoPor: true } })
    if (!existing) return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 })

    const canDelete =
      session.user.rol === 'ADMIN' ||
      existing.creadoPorId === session.user.id ||
      (session.user.rol === 'GERENTE' && existing.creadoPor?.empresaId === session.user.empresaId)

    if (!canDelete) return NextResponse.json({ error: 'No tienes permiso para eliminar esta tarea' }, { status: 403 })

    await db.tarea.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar tarea' }, { status: 500 })
  }
}
