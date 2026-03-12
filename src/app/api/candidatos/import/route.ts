import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, requireSession, requireTenantScope, safeErrorResponse } from '@/lib/api-security'
import { parseCandidateCsv, validateCandidateRows } from '@/lib/csv-import'

const fuentesValidas = new Set([
  'LINKEDIN',
  'OCC',
  'COMPUTRABAJA',
  'REFERIDO',
  'AGENCIA',
  'FERIA_EMPLEO',
  'UNIVERSIDAD',
  'RED_SOCIAL',
  'OTRO',
])

function normalizeFuente(value?: string): string {
  const normalized = (value || 'OTRO').toUpperCase().trim()
  return fuentesValidas.has(normalized) ? normalized : 'OTRO'
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireSession()
    requireRole(user, ['ADMIN', 'GERENTE'])

    const body = await request.json()
    const rawCsv = typeof body?.csv === 'string' ? body.csv : null
    const payloadRows = Array.isArray(body?.candidatos) ? body.candidatos : null

    const equipoId = user.equipoId
    if (!equipoId) {
      return NextResponse.json({ error: 'Sin equipo asignado' }, { status: 400 })
    }

    const equipo = await db.equipo.findUnique({ where: { id: equipoId }, select: { empresaId: true } })
    if (!equipo) {
      return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })
    }

    requireTenantScope(user, { empresaId: equipo.empresaId })

    const rows = rawCsv
      ? parseCandidateCsv(rawCsv)
      : payloadRows
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Sin candidatos para importar' }, { status: 400 })
    }

    const normalizedRows = rows.slice(0, 500).map((c: Record<string, unknown>) => ({
      nombre: String(c.nombre || '').trim(),
      apellido: String(c.apellido || '').trim(),
      email: String(c.email || '').trim().toLowerCase(),
      telefono: String(c.telefono || '').trim(),
      fuente: normalizeFuente(String(c.fuente || 'OTRO')),
      notas: String(c.notas || '').trim(),
      tags: String(c.tags || '').trim(),
      linkedin: String(c.linkedin || '').trim(),
      portfolio: String(c.portfolio || '').trim(),
    }))

    const validation = validateCandidateRows(normalizedRows)
    const invalidRows = validation.filter((v) => v.errors.length > 0)

    if (invalidRows.length > 0) {
      return NextResponse.json(
        {
          error: 'CSV inválido',
          preview: {
            totalRows: normalizedRows.length,
            invalidRows: invalidRows.length,
          },
          errores: invalidRows.map((row) => ({ fila: row.index, errores: row.errors })),
        },
        { status: 422 }
      )
    }

    let importados = 0
    let omitidos = 0
    const errores: string[] = []

    for (const row of normalizedRows) {
      const exists = await db.candidato.findFirst({
        where: {
          email: row.email,
          equipo: { empresaId: equipo.empresaId },
        },
      })

      if (exists) {
        omitidos += 1
        continue
      }

      try {
        await db.candidato.create({
          data: {
            nombre: row.nombre,
            apellido: row.apellido,
            email: row.email,
            telefono: row.telefono || null,
            fuente: row.fuente as
              | 'LINKEDIN'
              | 'OCC'
              | 'COMPUTRABAJA'
              | 'REFERIDO'
              | 'AGENCIA'
              | 'FERIA_EMPLEO'
              | 'UNIVERSIDAD'
              | 'RED_SOCIAL'
              | 'OTRO',
            notas: row.notas || null,
            tags: row.tags || null,
            linkedin: row.linkedin || null,
            portfolio: row.portfolio || null,
            equipoId,
            reclutadorId: user.id,
          },
        })
        importados += 1
      } catch (error) {
        errores.push(`Error creando ${row.email}: ${String(error)}`)
      }
    }

    return NextResponse.json({
      importados,
      omitidos,
      errores,
      preview: {
        totalRows: normalizedRows.length,
        importedRows: importados,
        omittedRows: omitidos,
      },
    })
  } catch (error) {
    return safeErrorResponse(error, request)
  }
}
