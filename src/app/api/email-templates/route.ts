// ATLAS GSE - API de Plantillas de Email

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const EmailTemplateCreateSchema = z.object({
  nombre: z.string().min(1),
  asunto: z.string().min(1),
  cuerpo: z.string().min(1),
  tipo: z.string().optional(),
  variables: z.string().optional(),
  activo: z.boolean().optional(),
})

// GET - Listar plantillas
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')

    const where: any = { activo: true }
    if (tipo) where.tipo = tipo

    const templates = await db.emailTemplate.findMany({
      where,
      orderBy: { nombre: 'asc' },
    })

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Error al obtener plantillas:', error)
    return NextResponse.json({ error: 'Error al obtener plantillas' }, { status: 500 })
  }
}

// POST - Crear plantilla
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const data = EmailTemplateCreateSchema.parse(body)

    const template = await db.emailTemplate.create({
      data: {
        nombre: data.nombre,
        asunto: data.asunto,
        cuerpo: data.cuerpo,
        tipo: data.tipo || 'CUSTOM',
        variables: data.variables,
        activo: data.activo ?? true,
        creadoPorId: session.user.id,
        empresaId: session.user.empresaId ?? undefined,
      },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('Error al crear plantilla:', error)
    return NextResponse.json({ error: 'Error al crear plantilla' }, { status: 500 })
  }
}

// PUT - Actualizar plantilla
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const { id, ...data } = body

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const template = await db.emailTemplate.update({
      where: { id },
      data,
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error('Error al actualizar plantilla:', error)
    return NextResponse.json({ error: 'Error al actualizar plantilla' }, { status: 500 })
  }
}

// DELETE - Eliminar plantilla (desactivar)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    // Desactivar en lugar de eliminar
    await db.emailTemplate.update({
      where: { id },
      data: { activo: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al eliminar plantilla:', error)
    return NextResponse.json({ error: 'Error al eliminar plantilla' }, { status: 500 })
  }
}
