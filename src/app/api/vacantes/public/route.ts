import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const empresaId = searchParams.get('empresaId')

    if (!empresaId) {
      return NextResponse.json({ error: 'empresaId es requerido' }, { status: 400 })
    }

    const vacantes = await db.vacante.findMany({
      where: { empresaId, estatus: 'PUBLICADA' },
      select: {
        id: true,
        titulo: true,
        descripcion: true,
        ubicacion: true,
        modalidad: true,
        tipoContrato: true,
        salarioMin: true,
        salarioMax: true,
        salarioMostrar: true,
        prioridad: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ vacantes })
  } catch (error) {
    console.error('Error obteniendo vacantes públicas:', error)
    return NextResponse.json({ error: 'Error al obtener vacantes públicas' }, { status: 500 })
  }
}
