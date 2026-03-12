// ATLAS GSE - API de Métricas Configuración

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { MetricaConfigCreateSchema, MetricaConfigUpdateSchema, METRICAS_INFO } from '@/lib/validations'

// GET - Listar métricas configuradas
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const empresaId = session.user.empresaId

    if (!empresaId) {
      // Retornar métricas por defecto
      return NextResponse.json({
        metricas: Object.entries(METRICAS_INFO).map(([tipo, info], index) => ({
          tipo,
          nombre: info.nombre,
          descripcion: info.descripcion,
          unidad: info.unidad,
          icono: info.icono,
          activa: true,
          peso: 1,
          orden: index,
        })),
      })
    }

    // Buscar configuración de la empresa
    let metricasConfig = await db.metricaConfig.findMany({
      where: { empresaId },
      orderBy: { orden: 'asc' },
    })

    // Si no hay configuración, crear la por defecto
    if (metricasConfig.length === 0) {
      const defaultConfigs = await Promise.all(
        Object.entries(METRICAS_INFO).map(([tipo, info], index) =>
          db.metricaConfig.create({
            data: {
              empresaId,
              tipo: tipo as any,
              nombre: info.nombre,
              activa: true,
              peso: 1,
              orden: index,
            },
          })
        )
      )
      metricasConfig = defaultConfigs
    }

    // Agregar info adicional
    const metricasConInfo = metricasConfig.map((m) => ({
      ...m,
      descripcion: METRICAS_INFO[m.tipo as keyof typeof METRICAS_INFO]?.descripcion,
      unidad: METRICAS_INFO[m.tipo as keyof typeof METRICAS_INFO]?.unidad,
      icono: METRICAS_INFO[m.tipo as keyof typeof METRICAS_INFO]?.icono,
    }))

    return NextResponse.json({ metricas: metricasConInfo })
  } catch (error) {
    console.error('Error obteniendo métricas:', error)
    return NextResponse.json(
      { error: 'Error al obtener métricas', details: String(error) },
      { status: 500 }
    )
  }
}

// POST - Crear/Actualizar configuración de métrica
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo ADMIN y GERENTE pueden configurar métricas
    if (session.user.rol === 'RECLUTADOR') {
      return NextResponse.json({ error: 'No tienes permiso para configurar métricas' }, { status: 403 })
    }

    const body = await request.json()
    const data = MetricaConfigCreateSchema.parse(body)

    // Usar empresa del usuario si es GERENTE
    if (session.user.rol === 'GERENTE') {
      data.empresaId = session.user.empresaId!
    }

    // Upsert
    const metrica = await db.metricaConfig.upsert({
      where: {
        empresaId_tipo: {
          empresaId: data.empresaId,
          tipo: data.tipo,
        },
      },
      update: {
        nombre: data.nombre,
        activa: data.activa,
        peso: data.peso,
        orden: data.orden,
      },
      create: data,
    })

    return NextResponse.json(metrica)
  } catch (error) {
    console.error('Error guardando métrica:', error)
    return NextResponse.json(
      { error: 'Error al guardar métrica', details: String(error) },
      { status: 500 }
    )
  }
}

// PUT - Actualizar múltiples métricas
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (session.user.rol === 'RECLUTADOR') {
      return NextResponse.json({ error: 'No tienes permiso para configurar métricas' }, { status: 403 })
    }

    const body = await request.json()
    const { metricas } = body as { metricas: Array<{ id: string; activa?: boolean; peso?: number; orden?: number }> }

    // Actualizar cada métrica
    const updates = await Promise.all(
      metricas.map((m) =>
        db.metricaConfig.update({
          where: { id: m.id },
          data: {
            activa: m.activa,
            peso: m.peso,
            orden: m.orden,
          },
        })
      )
    )

    return NextResponse.json({ updated: updates.length })
  } catch (error) {
    console.error('Error actualizando métricas:', error)
    return NextResponse.json(
      { error: 'Error al actualizar métricas', details: String(error) },
      { status: 500 }
    )
  }
}
