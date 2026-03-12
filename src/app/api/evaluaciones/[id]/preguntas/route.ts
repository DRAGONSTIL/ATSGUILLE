import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id } = await params
    const { preguntas } = await request.json()

    await db.preguntaEvaluacion.deleteMany({ where: { evaluacionId: id } })

    if (preguntas && preguntas.length > 0) {
      await db.preguntaEvaluacion.createMany({
        data: preguntas.map((p: any, i: number) => ({
          evaluacionId: id,
          pregunta: p.pregunta,
          tipo: p.tipo,
          opciones: p.opciones || null,
          respuestaCorrecta: p.respuestaCorrecta || null,
          puntaje: p.puntaje || 1,
          orden: i,
          obligatoria: p.obligatoria !== false,
        }))
      })
    }

    const evaluacion = await db.evaluacion.findUnique({
      where: { id },
      include: { preguntas: { orderBy: { orden: 'asc' } } },
    })

    return NextResponse.json(evaluacion)
  } catch (error) {
    return NextResponse.json({ error: 'Error al guardar preguntas' }, { status: 500 })
  }
}
