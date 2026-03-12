// ATLAS GSE - API para gestionar demo keys (Admin)

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Generar key única
function generateDemoKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let key = 'ATLAS-'
  for (let i = 0; i < 4; i++) {
    if (i > 0) key += '-'
    for (let j = 0; j < 4; j++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length))
    }
  }
  return key
}

// GET - Obtener todas las keys
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.rol !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const estatus = searchParams.get('estatus')

    const where: any = {}
    if (estatus) {
      where.estatus = estatus
    }

    const keys = await db.demoKey.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json({ keys })
  } catch (error) {
    console.error('Error al obtener keys:', error)
    return NextResponse.json(
      { error: 'Error al obtener keys' },
      { status: 500 }
    )
  }
}

// POST - Crear nueva key manualmente (admin)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.rol !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { email, nombre, empresa, rolSolicitado, diasExpiracion } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email es requerido' },
        { status: 400 }
      )
    }

    // Generar key única
    let key = generateDemoKey()
    let attempts = 0
    while (attempts < 10) {
      const existing = await db.demoKey.findUnique({ where: { key } })
      if (!existing) break
      key = generateDemoKey()
      attempts++
    }

    // Fecha de expiración
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + (diasExpiracion || 7))

    const demoKey = await db.demoKey.create({
      data: {
        key,
        email,
        nombre,
        empresa,
        rolSolicitado: rolSolicitado || 'RECLUTADOR',
        estatus: 'APROBADA',
        expiresAt,
        aprobadoPorId: session.user.id,
        aprobadoEn: new Date(),
      }
    })

    return NextResponse.json({
      success: true,
      key: demoKey,
    })
  } catch (error) {
    console.error('Error al crear key:', error)
    return NextResponse.json(
      { error: 'Error al crear key' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar estatus de key
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.rol !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { id, estatus } = body

    if (!id || !estatus) {
      return NextResponse.json(
        { error: 'ID y estatus son requeridos' },
        { status: 400 }
      )
    }

    const demoKey = await db.demoKey.update({
      where: { id },
      data: {
        estatus,
        aprobadoPorId: session.user.id,
        aprobadoEn: estatus === 'APROBADA' ? new Date() : undefined,
      }
    })

    return NextResponse.json({
      success: true,
      key: demoKey,
    })
  } catch (error) {
    console.error('Error al actualizar key:', error)
    return NextResponse.json(
      { error: 'Error al actualizar key' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar key
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.rol !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID es requerido' },
        { status: 400 }
      )
    }

    await db.demoKey.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al eliminar key:', error)
    return NextResponse.json(
      { error: 'Error al eliminar key' },
      { status: 500 }
    )
  }
}
