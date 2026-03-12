// ATLAS GSE - API para Aceptar Invitación

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const AcceptInviteSchema = z.object({
  token: z.string().min(1, 'Token requerido'),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional(),
})

// POST - Aceptar invitación y crear usuario
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = AcceptInviteSchema.parse(body)

    // Buscar invitación
    const invitacion = await db.invitacion.findUnique({
      where: { token: data.token },
      include: {
        empresa: true,
        equipo: true,
      },
    })

    if (!invitacion) {
      return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 })
    }

    if (invitacion.usada) {
      return NextResponse.json({ error: 'Esta invitación ya fue utilizada' }, { status: 400 })
    }

    if (invitacion.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Esta invitación ha expirado' }, { status: 400 })
    }

    // Verificar que no existe usuario con ese email
    const existingUser = await db.user.findUnique({
      where: { email: invitacion.email },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Ya existe un usuario con este email' }, { status: 400 })
    }

    // Crear usuario
    const user = await db.user.create({
      data: {
        email: invitacion.email,
        name: data.name,
        rol: invitacion.rol,
        empresaId: invitacion.empresaId,
        equipoId: invitacion.equipoId,
        activo: true,
      },
    })

    // Marcar invitación como usada
    await db.invitacion.update({
      where: { id: invitacion.id },
      data: {
        usada: true,
        usadoEn: new Date(),
      },
    })

    // Crear actividad
    await db.actividad.create({
      data: {
        tipo: 'NOTA_AGREGADA',
        descripcion: `Usuario ${user.name} aceptó invitación y se unió al equipo`,
        entidad: 'usuario',
        entidadId: user.id,
        usuarioId: user.id,
      },
    })

    // Crear notificación para el administrador
    if (invitacion.invitadoPorId) {
      await db.notificacion.create({
        data: {
          usuarioId: invitacion.invitadoPorId,
          titulo: 'Nuevo usuario unido',
          mensaje: `${user.name} ha aceptado la invitación y se ha unido al equipo`,
          tipo: 'success',
          entidad: 'usuario',
          entidadId: user.id,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Cuenta creada exitosamente',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        rol: user.rol,
      },
    })
  } catch (error) {
    console.error('Error aceptando invitación:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Error al aceptar invitación', details: String(error) },
      { status: 500 }
    )
  }
}
