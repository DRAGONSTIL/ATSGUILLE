// ATLAS GSE - API de Invitaciones

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateInviteToken } from '@/lib/auth'
import { db } from '@/lib/db'
import { InvitacionCreateSchema } from '@/lib/validations'
import { checkRateLimitAsync, getRateLimitIdentifier } from '@/lib/rate-limit'
import { emailInvitacion } from '@/lib/email'

// GET - Listar invitaciones pendientes
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    let where: any = { usada: false, expiresAt: { gt: new Date() } }

    if (session.user.rol === 'ADMIN') {
      // Ve todas
    } else if (session.user.rol === 'GERENTE') {
      where.empresaId = session.user.empresaId
    } else {
      return NextResponse.json({ error: 'No tienes permiso para ver invitaciones' }, { status: 403 })
    }

    const invitaciones = await db.invitacion.findMany({
      where,
      include: {
        empresa: { select: { id: true, nombre: true } },
        equipo: { select: { id: true, nombre: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ invitaciones })
  } catch (error) {
    console.error('Error obteniendo invitaciones:', error)
    return NextResponse.json(
      { error: 'Error al obtener invitaciones', details: String(error) },
      { status: 500 }
    )
  }
}

// POST - Crear invitación
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo ADMIN y GERENTE pueden invitar
    if (session.user.rol === 'RECLUTADOR') {
      return NextResponse.json({ error: 'No tienes permiso para enviar invitaciones' }, { status: 403 })
    }

    // Rate limiting
    const rateLimitResult = await checkRateLimitAsync(
      getRateLimitIdentifier(request, session.user.id),
      'auth'
    )
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: rateLimitResult.error },
        { status: 429, headers: rateLimitResult.headers }
      )
    }

    const body = await request.json()
    const parsedData = InvitacionCreateSchema.safeParse(body)

    if (!parsedData.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsedData.error.issues },
        { status: 400 }
      )
    }

    const data = parsedData.data

    // Verificar que no existe usuario con ese email
    const existingUser = await db.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 400 })
    }

    // Determinar empresaId
    let empresaId = data.empresaId
    if (session.user.rol === 'GERENTE') {
      empresaId = session.user.empresaId ?? undefined
    }

    // Si no hay empresaId y es ADMIN, error
    if (!empresaId) {
      return NextResponse.json(
        { error: 'Debes seleccionar una empresa para la invitación' },
        { status: 400 }
      )
    }

    // Generar token y fecha de expiración
    const token = generateInviteToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 días

    // Crear invitación
    const invitacion = await db.invitacion.create({
      data: {
        email: data.email,
        rol: data.rol,
        empresaId: empresaId,
        equipoId: data.equipoId || null,
        mensaje: data.mensaje,
        token,
        expiresAt,
        invitadoPorId: session.user.id,
      },
      include: {
        empresa: { select: { id: true, nombre: true } },
        equipo: { select: { id: true, nombre: true } },
      },
    })

    // Enviar email de invitación
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const inviteUrl = `${baseUrl}/invite/${token}`

    await emailInvitacion(data.email, {
      invitadoPor: session.user.name || 'Un administrador',
      empresaNombre: invitacion.empresa?.nombre || 'ATLAS GSE',
      rol: data.rol,
      enlace: inviteUrl,
    })

    return NextResponse.json({
      message: 'Invitación enviada correctamente',
      invitacion: {
        id: invitacion.id,
        email: invitacion.email,
        rol: invitacion.rol,
        expiresAt: invitacion.expiresAt,
      },
    })
  } catch (error) {
    console.error('Error creando invitación:', error)
    return NextResponse.json(
      { error: 'Error al crear invitación', details: String(error) },
      { status: 500 }
    )
  }
}

// DELETE - Cancelar invitación
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID de invitación requerido' }, { status: 400 })
    }

    const invitacion = await db.invitacion.findUnique({
      where: { id },
    })

    if (!invitacion) {
      return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 })
    }

    // Verificar permisos
    if (session.user.rol === 'GERENTE' && invitacion.empresaId !== session.user.empresaId) {
      return NextResponse.json({ error: 'No tienes permiso para cancelar esta invitación' }, { status: 403 })
    }

    await db.invitacion.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Invitación cancelada correctamente' })
  } catch (error) {
    console.error('Error cancelando invitación:', error)
    return NextResponse.json(
      { error: 'Error al cancelar invitación', details: String(error) },
      { status: 500 }
    )
  }
}
