import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { PublicApplySchema } from '@/lib/validations'
import { safeErrorResponse } from '@/lib/api-security'

export async function POST(request: NextRequest) {
  try {
    const parsed = PublicApplySchema.parse(await request.json())
    const { nombre, apellido, email, telefono, vacanteId, mensaje } = parsed

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
    const rate = rateLimit(`public-apply:${ip}`, { windowMs: 60 * 60 * 1000, maxRequests: 3 })
    if (!rate.success) {
      return NextResponse.json({ error: 'Has alcanzado el máximo de aplicaciones por hora' }, { status: 429 })
    }

    const vacante = await db.vacante.findUnique({ where: { id: vacanteId } })
    if (!vacante || vacante.estatus !== 'PUBLICADA') {
      return NextResponse.json({ error: 'La vacante no existe o no está publicada' }, { status: 400 })
    }

    const equipoId = vacante.equipoId || (await db.equipo.findFirst({ where: { empresaId: vacante.empresaId }, select: { id: true } }))?.id
    if (!equipoId) {
      return NextResponse.json({ error: 'No se encontró equipo para registrar la aplicación' }, { status: 400 })
    }

    const existing = await db.candidato.findFirst({
      where: {
        email,
        vacanteId,
        equipoId,
      },
    })

    if (existing) {
      return NextResponse.json({ success: true, message: 'Ya habíamos recibido tu aplicación para esta vacante' })
    }

    await db.candidato.create({
      data: {
        nombre,
        apellido,
        email,
        telefono: telefono || null,
        notas: mensaje || null,
        vacanteId,
        equipoId,
        fuente: 'OTRO',
        estatus: 'REGISTRADO',
      },
    })

    return NextResponse.json({ success: true, message: 'Aplicación recibida' })
  } catch (error) {
    console.error('Error procesando aplicación pública:', error)
    return NextResponse.json({ error: 'Error al enviar aplicación' }, { status: 500 })
  }
}
