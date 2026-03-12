// ATLAS GSE - API para solicitar demo

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, nombre, empresa, telefono, mensaje, rolSolicitado } = body

    // Validar campos requeridos
    if (!email || !nombre) {
      return NextResponse.json(
        { error: 'Email y nombre son requeridos' },
        { status: 400 }
      )
    }

    // Verificar si ya existe una solicitud con este email
    const existingKey = await db.demoKey.findFirst({
      where: {
        email,
        estatus: { in: ['PENDIENTE', 'APROBADA'] }
      }
    })

    if (existingKey) {
      return NextResponse.json(
        { error: 'Ya existe una solicitud pendiente o aprobada con este email' },
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

    // Crear la key con estatus APROBADA automáticamente (sistema automatizado)
    // La key expira en 7 días
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const demoKey = await db.demoKey.create({
      data: {
        key,
        email,
        nombre,
        empresa,
        telefono,
        mensaje,
        rolSolicitado: rolSolicitado || 'RECLUTADOR',
        estatus: 'APROBADA', // Automáticamente aprobada
        expiresAt,
      }
    })

    // En producción, aquí enviarías un email con la key
    console.log(`📧 Demo key generada para ${email}: ${key}`)

    return NextResponse.json({
      success: true,
      message: 'Solicitud procesada exitosamente',
      key: demoKey.key,
      expiresAt: demoKey.expiresAt,
    })
  } catch (error) {
    console.error('Error en solicitud de demo:', error)
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    )
  }
}

// GET - Listar todas las solicitudes (solo admin)
export async function GET(request: NextRequest) {
  try {
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
      { error: 'Error al obtener solicitudes' },
      { status: 500 }
    )
  }
}
