// ATLAS GSE - API de Reportes

import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireRole, requireTenantScope, safeErrorResponse } from '@/lib/api-security'
import { db } from '@/lib/db'
import { format, subDays } from 'date-fns'

// GET /api/reportes?format=csv&vacanteId=xxx&days=30
export async function GET(request: NextRequest) {
  try {
    const { user } = await requireSession()
    requireRole(user, ['ADMIN', 'GERENTE', 'RECLUTADOR'])

    const { searchParams } = new URL(request.url)
    const formatType = searchParams.get('format') || 'json'
    const vacanteId = searchParams.get('vacanteId')
    const days = parseInt(searchParams.get('days') || '30')

    // Construir filtros
    const where: any = {}

    // Filtrar por fecha (últimos N días)
    const fechaDesde = subDays(new Date(), days)
    where.createdAt = { gte: fechaDesde }

    // Filtrar por vacante si se proporciona (no vacío, no "all")
    if (vacanteId && vacanteId !== '' && vacanteId !== 'all') {
      const vacante = await db.vacante.findUnique({
        where: { id: vacanteId },
        select: { empresaId: true },
      })

      if (!vacante) {
        return NextResponse.json({ error: 'Vacante no encontrada' }, { status: 404 })
      }

      requireTenantScope(user, { empresaId: vacante.empresaId })
      where.vacanteId = vacanteId
    }

    // Filtrar por empresa/equipo según rol
    if (user.rol === 'RECLUTADOR') {
      where.equipoId = user.equipoId
    } else if (user.rol === 'GERENTE') {
      where.equipo = { empresaId: user.empresaId }
    }
    // ADMIN ve todos

    const candidatos = await db.candidato.findMany({
      where,
      include: {
        vacante: { select: { titulo: true } },
        reclutador: { select: { name: true } },
        equipo: { select: { nombre: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Calcular días en proceso
    const hoy = new Date()
    const candidatosConDias = candidatos.map((c) => {
      const fechaFin = c.fechaContratacion || c.fechaRechazo || hoy
      const diasEnProceso = Math.floor(
        (fechaFin.getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      )
      return {
        ...c,
        diasEnProceso,
      }
    })

    if (formatType === 'csv') {
      // Generar CSV
      const headers = [
        'Nombre',
        'Apellido',
        'Email',
        'Teléfono',
        'Vacante',
        'Estatus',
        'Fuente',
        'Reclutador',
        'Equipo',
        'Días en Proceso',
        'Fecha Registro',
      ]

      const rows = candidatosConDias.map((c) => [
        c.nombre,
        c.apellido,
        c.email,
        c.telefono || '',
        c.vacante?.titulo || '',
        c.estatus,
        c.fuente,
        c.reclutador?.name || '',
        c.equipo?.nombre || '',
        c.diasEnProceso.toString(),
        format(new Date(c.createdAt), 'dd/MM/yyyy'),
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n')

      const fechaArchivo = format(new Date(), 'yyyy-MM-dd')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="candidatos-${fechaArchivo}.csv"`,
        },
      })
    }

    // Formato JSON
    return NextResponse.json({ candidatos: candidatosConDias, total: candidatosConDias.length })
  } catch (error) {
    console.error('Error al generar reporte:', error)
    return safeErrorResponse(error, request)
  }
}
