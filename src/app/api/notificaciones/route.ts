// ATLAS GSE - API de Notificaciones

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// GET - Listar notificaciones del usuario
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const soloNoLeidas = searchParams.get('noLeidas') === 'true'

    const where: any = { usuarioId: session.user.id }
    if (soloNoLeidas) where.leida = false

    const notificaciones = await db.notificacion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const noLeidas = await db.notificacion.count({
      where: { usuarioId: session.user.id, leida: false },
    })

    return NextResponse.json({ notificaciones, noLeidas })
  } catch (error) {
    console.error('Error obteniendo notificaciones:', error)
    return NextResponse.json(
      { error: 'Error al obtener notificaciones' },
      { status: 500 }
    )
  }
}

// POST - Crear notificación
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { titulo, mensaje, tipo, usuarioId } = body

    if (!titulo || !mensaje) {
      return NextResponse.json({ error: 'Título y mensaje son requeridos' }, { status: 400 })
    }

    const notificacion = await db.notificacion.create({
      data: {
        titulo,
        mensaje,
        tipo: tipo || 'info',
        usuarioId: usuarioId || session.user.id,
      },
    })

    return NextResponse.json(notificacion, { status: 201 })
  } catch (error) {
    console.error('Error creando notificación:', error)
    return NextResponse.json({ error: 'Error al crear notificación' }, { status: 500 })
  }
}

// PUT - Marcar como leída
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { id, todas } = body

    if (todas) {
      await db.notificacion.updateMany({
        where: { usuarioId: session.user.id, leida: false },
        data: { leida: true },
      })
      return NextResponse.json({ message: 'Todas marcadas como leídas' })
    }

    if (id) {
      await db.notificacion.update({
        where: { id },
        data: { leida: true },
      })
      return NextResponse.json({ message: 'Notificación marcada como leída' })
    }

    return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  } catch (error) {
    console.error('Error actualizando notificación:', error)
    return NextResponse.json(
      { error: 'Error al actualizar notificación' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar notificación
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    await db.notificacion.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Notificación eliminada' })
  } catch (error) {
    console.error('Error eliminando notificación:', error)
    return NextResponse.json(
      { error: 'Error al eliminar notificación' },
      { status: 500 }
    )
  }
}
