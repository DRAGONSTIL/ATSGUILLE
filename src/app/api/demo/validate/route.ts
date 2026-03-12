// ATLAS GSE - API para validar demo key

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { key } = body

    if (!key) {
      return NextResponse.json(
        { error: 'Key es requerida' },
        { status: 400 }
      )
    }

    // Buscar la key
    const demoKey = await db.demoKey.findUnique({
      where: { key }
    })

    if (!demoKey) {
      return NextResponse.json(
        { valid: false, error: 'Key no encontrada' },
        { status: 404 }
      )
    }

    // Verificar estatus
    if (demoKey.estatus === 'RECHAZADA') {
      return NextResponse.json(
        { valid: false, error: 'La solicitud fue rechazada' },
        { status: 400 }
      )
    }

    if (demoKey.estatus === 'USADA') {
      return NextResponse.json(
        { valid: false, error: 'Esta key ya fue utilizada' },
        { status: 400 }
      )
    }

    if (demoKey.estatus === 'EXPIRADA') {
      return NextResponse.json(
        { valid: false, error: 'Esta key ha expirado' },
        { status: 400 }
      )
    }

    // Verificar expiración
    if (new Date() > demoKey.expiresAt) {
      // Actualizar estatus a expirada
      await db.demoKey.update({
        where: { key },
        data: { estatus: 'EXPIRADA' }
      })
      return NextResponse.json(
        { valid: false, error: 'Esta key ha expirado' },
        { status: 400 }
      )
    }

    // Verificar que esté aprobada
    if (demoKey.estatus !== 'APROBADA') {
      return NextResponse.json(
        { valid: false, error: 'La solicitud está pendiente de aprobación' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      rol: demoKey.rolSolicitado,
      email: demoKey.email,
    })
  } catch (error) {
    console.error('Error al validar key:', error)
    return NextResponse.json(
      { error: 'Error al validar key' },
      { status: 500 }
    )
  }
}
