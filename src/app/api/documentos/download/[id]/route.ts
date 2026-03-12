// ATLAS GSE - API de Descarga de Documentos
// Descarga segura con URL firmada desde Object Storage

import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireRole, requireTenantScope, safeErrorResponse } from '@/lib/api-security'
import { db } from '@/lib/db'
import { canAccessEmpresa } from '@/lib/tenant-access'
import { createSignedDownloadUrl } from '@/lib/object-storage'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireSession()
    requireRole(user, ['ADMIN', 'GERENTE', 'RECLUTADOR'])

    const { id } = await context.params

    const documento = await db.documento.findUnique({
      where: { id },
      include: { candidato: { include: { equipo: { select: { empresaId: true } } } } },
    })

    if (!documento) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
    }

    if (user.rol === 'RECLUTADOR' && documento.candidato.reclutadorId !== user.id) {
      return NextResponse.json({ error: 'No tienes acceso a este documento' }, { status: 403 })
    }

    requireTenantScope(user, { empresaId: documento.candidato.equipo.empresaId })

    if (!canAccessEmpresa(user, documento.candidato.equipo.empresaId)) {
      return NextResponse.json({ error: 'No tienes acceso a este documento' }, { status: 403 })
    }

    const signedUrl = await createSignedDownloadUrl(documento.url)
    return NextResponse.redirect(signedUrl)
  } catch (error) {
    console.error('Error descargando documento:', error)
    return safeErrorResponse(error, request)
  }
}
