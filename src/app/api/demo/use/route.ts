// ATLAS GSE - API para marcar key como usada

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { key, userId } = body

    if (!key || !userId) {
      return NextResponse.json(
        { error: 'Key y userId son requeridos' },
        { status: 400 }
      )
    }

    const demoKey = await db.demoKey.update({
      where: { key },
      data: {
        estatus: 'USADA',
        usadoPor: userId,
        usadoEn: new Date(),
      }
    })

    return NextResponse.json({ success: true, key: demoKey })
  } catch (error) {
    console.error('Error al marcar key como usada:', error)
    return NextResponse.json(
      { error: 'Error al marcar key como usada' },
      { status: 500 }
    )
  }
}
