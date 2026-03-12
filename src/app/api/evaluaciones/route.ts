// ATLAS GSE - API de Evaluaciones

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const EvaluacionCreateSchema = z.object({
  titulo: z.string().min(1),
  descripcion: z.string().optional(),
  tipo: z.string().optional(),
  duracion: z.number().optional(),
  puntajeMaximo: z.number().optional(),
  puntajeAprobacion: z.number().optional(),
  instrucciones: z.string().optional(),
  preguntas: z.array(z.object({
    pregunta: z.string(),
    tipo: z.string(),
    opciones: z.string().optional(),
    respuestaCorrecta: z.string().optional(),
    puntaje: z.number().optional(),
    orden: z.number().optional(),
    obligatoria: z.boolean().optional(),
  })).optional(),
})

// GET - Listar evaluaciones
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')
    const includePreguntas = searchParams.get('includePreguntas') === 'true'
    const includeRespuestas = searchParams.get('includeRespuestas') === 'true'

    // Si se piden respuestas, retornar esas en lugar de evaluaciones
    if (includeRespuestas) {
      const respuestas = await db.respuestaEvaluacion.findMany({
        include: {
          candidato: { select: { id: true, nombre: true, apellido: true, email: true } },
          evaluacion: { select: { id: true, titulo: true, tipo: true, puntajeMaximo: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json({ respuestas })
    }

    const where: any = { activo: true }
    if (tipo) where.tipo = tipo

    const evaluaciones = await db.evaluacion.findMany({
      where,
      include: includePreguntas ? { preguntas: { orderBy: { orden: 'asc' } } } : undefined,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ evaluaciones })
  } catch (error) {
    console.error('Error al obtener evaluaciones:', error)
    return NextResponse.json({ error: 'Error al obtener evaluaciones' }, { status: 500 })
  }
}

// POST - Crear evaluación
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const data = EvaluacionCreateSchema.parse(body)
    const { preguntas, ...evaluacionData } = data

    const evaluacion = await db.evaluacion.create({
      data: {
        ...evaluacionData,
        creadoPorId: session.user.id,
        preguntas: preguntas ? {
          create: preguntas.map((p, i) => ({
            ...p,
            orden: p.orden ?? i,
          }))
        } : undefined,
      },
      include: { preguntas: true },
    })

    return NextResponse.json(evaluacion, { status: 201 })
  } catch (error) {
    console.error('Error al crear evaluación:', error)
    return NextResponse.json({ error: 'Error al crear evaluación' }, { status: 500 })
  }
}

// PUT - Actualizar evaluación
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const { id, preguntas, ...data } = body

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    // Si hay preguntas, eliminar las existentes y crear nuevas
    if (preguntas) {
      await db.preguntaEvaluacion.deleteMany({ where: { evaluacionId: id } })
    }

    const evaluacion = await db.evaluacion.update({
      where: { id },
      data: {
        ...data,
        preguntas: preguntas ? {
          create: preguntas.map((p: any, i: number) => ({
            ...p,
            orden: p.orden ?? i,
          }))
        } : undefined,
      },
      include: { preguntas: true },
    })

    return NextResponse.json(evaluacion)
  } catch (error) {
    console.error('Error al actualizar evaluación:', error)
    return NextResponse.json({ error: 'Error al actualizar evaluación' }, { status: 500 })
  }
}

// DELETE - Eliminar evaluación (desactivar)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    // Desactivar en lugar de eliminar
    await db.evaluacion.update({
      where: { id },
      data: { activo: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al eliminar evaluación:', error)
    return NextResponse.json({ error: 'Error al eliminar evaluación' }, { status: 500 })
  }
}
