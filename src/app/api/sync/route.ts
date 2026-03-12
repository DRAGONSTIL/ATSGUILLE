// ATLAS GSE - API de Sincronización con Google Sheets

import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireRole, requireTenantScope, safeErrorResponse } from '@/lib/api-security'
import { db } from '@/lib/db'
import { SyncSchema } from '@/lib/validations'
import { checkRateLimitAsync, getRateLimitIdentifier } from '@/lib/rate-limit'

// Mapeo de estatus desde Google Sheets a Prisma
const estatusMap: Record<string, string> = {
  'registrado': 'REGISTRADO',
  'en proceso': 'EN_PROCESO',
  'en_proceso': 'EN_PROCESO',
  'proceso': 'EN_PROCESO',
  'entrevista': 'ENTREVISTA',
  'entrevistando': 'ENTREVISTA',
  'contratado': 'CONTRATADO',
  'contratacion': 'CONTRATADO',
  'rechazado': 'RECHAZADO',
  'no seleccionado': 'RECHAZADO',
}

// Mapeo de fuentes desde Google Sheets a Prisma
const fuenteMap: Record<string, string> = {
  'linkedin': 'LINKEDIN',
  'occ': 'OCC',
  'occ mundial': 'OCC',
  'computrabajo': 'COMPUTRABAJA',
  'computrabaja': 'COMPUTRABAJA',
  'referido': 'REFERIDO',
  'referencia': 'REFERIDO',
  'otro': 'OTRO',
  'otra': 'OTRO',
}

// POST - Sincronizar con Google Sheets
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireSession()
    requireRole(user, ['ADMIN', 'GERENTE'])

    // Rate limiting
    const rateLimitResult = await checkRateLimitAsync(
      getRateLimitIdentifier(request, user.id),
      'sync'
    )
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: rateLimitResult.error },
        { status: 429, headers: rateLimitResult.headers }
      )
    }

    const body = await request.json()
    const data = SyncSchema.parse(body)
    const sourceOfTruth = 'db'

    // Obtener equipo
    const equipo = await db.equipo.findUnique({
      where: { id: data.equipoId },
      include: { empresa: true },
    })

    if (!equipo) {
      return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })
    }

    // Verificar permisos
    if (user.rol === 'GERENTE' && equipo.empresaId !== user.empresaId) {
      return NextResponse.json({ error: 'No tienes acceso a este equipo' }, { status: 403 })
    }

    requireTenantScope(user, { empresaId: equipo.empresaId })

    if (!equipo.appsScriptUrl) {
      return NextResponse.json({ error: 'El equipo no tiene URL de Apps Script configurada' }, { status: 400 })
    }

    // Llamar al Apps Script
    let registros: any[] = []
    let errores: string[] = []

    try {
      const response = await fetch(equipo.appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getCandidatos' }),
      })

      if (!response.ok) {
        throw new Error(`Error al llamar Apps Script: ${response.status}`)
      }

      const result = await response.json()
      registros = result.data || result.candidatos || []
    } catch (error) {
      return NextResponse.json({ error: 'Error al conectar con Google Sheets' }, { status: 502 })
    }

    // Procesar registros
    let creados = 0
    let actualizados = 0
    let deduplicados = 0

    for (const registro of registros) {
      try {
        // Mapear estatus y fuente
        const estatusRaw = (registro.estatus || registro.status || 'registrado').toLowerCase()
        const fuenteRaw = (registro.fuente || registro.source || 'otro').toLowerCase()

        const estatus = (estatusMap[estatusRaw] || 'REGISTRADO') as any
        const fuente = (fuenteMap[fuenteRaw] || 'OTRO') as any

        // Buscar por googleSheetRowId
        const existente = await db.candidato.findFirst({
          where: {
            googleSheetRowId: String(registro.id || registro.rowId),
            equipoId: equipo.id,
          },
        })

        const candidatoData = {
          nombre: registro.nombre || registro.firstName || '',
          apellido: registro.apellido || registro.lastName || registro.apellidos || '',
          email: registro.email || registro.correo || '',
          telefono: registro.telefono || registro.phone || null,
          fuente,
          estatus,
          notas: registro.notas || registro.notes || null,
          googleSheetRowId: String(registro.id || registro.rowId),
          equipoId: equipo.id,
        }

        if (existente) {
          deduplicados++
          await db.candidato.update({
            where: { id: existente.id },
            data: candidatoData,
          })
          actualizados++
        } else {
          await db.candidato.create({
            data: candidatoData,
          })
          creados++
        }
      } catch (error) {
        errores.push(`Error en registro ${registro.id || 'desconocido'}: ${String(error)}`)
      }
    }

    // Guardar log de sincronización
    await db.syncLog.create({
      data: {
        equipoId: equipo.id,
        registrosProcesados: registros.length,
        errores: errores.length > 0 ? errores.join('\n') : null,
      },
    })

    return NextResponse.json({
      message: 'Sincronización completada',
      resultados: {
        total: registros.length,
        creados,
        actualizados,
        deduplicados,
        errores: errores.length,
      },
      contrato: data.contractVersion,
      sourceOfTruth,
      detallesErrores: errores.length > 0 ? errores : undefined,
    })
  } catch (error) {
    console.error('Error en sincronización:', error)
    return safeErrorResponse(error, request)
  }
}
