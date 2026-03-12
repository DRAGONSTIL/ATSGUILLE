// ATLAS GSE - API para Validar Invitación

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Validar token de invitación
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 400 })
    }

    const invitacion = await db.invitacion.findUnique({
      where: { token },
      include: {
        empresa: { select: { id: true, nombre: true } },
        equipo: { select: { id: true, nombre: true } },
        invitadoPor: { select: { id: true, name: true } },
      },
    })

    if (!invitacion) {
      return NextResponse.json({ error: 'Invitación no encontrada', valid: false }, { status: 404 })
    }

    if (invitacion.usada) {
      return NextResponse.json({ error: 'Esta invitación ya fue utilizada', valid: false }, { status: 400 })
    }

    if (invitacion.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Esta invitación ha expirado', valid: false }, { status: 400 })
    }

    return NextResponse.json({
      valid: true,
      invitacion: {
        email: invitacion.email,
        rol: invitacion.rol,
        empresa: invitacion.empresa,
        equipo: invitacion.equipo,
        invitadoPor: invitacion.invitadoPor,
        expiresAt: invitacion.expiresAt,
      },
    })
  } catch (error) {
    console.error('Error validando invitación:', error)
    return NextResponse.json(
      { error: 'Error al validar invitación', details: String(error) },
      { status: 500 }
    )
  }
}
