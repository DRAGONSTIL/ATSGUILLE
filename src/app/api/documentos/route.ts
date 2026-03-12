// ATLAS GSE - API de Documentos
// Almacenamiento de archivos en Object Storage (S3)

import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireRole, requireTenantScope, safeErrorResponse } from '@/lib/api-security'
import { db } from '@/lib/db'
import { checkRateLimitAsync, getRateLimitIdentifier } from '@/lib/rate-limit'
import { canAccessEmpresa } from '@/lib/tenant-access'
import { deleteDocumentObject, uploadDocumentObject } from '@/lib/object-storage'

const ALLOWED_TYPES: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
}

const MAX_FILE_SIZE = 10 * 1024 * 1024

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireSession()
    requireRole(user, ['ADMIN', 'GERENTE', 'RECLUTADOR'])

    const { searchParams } = new URL(request.url)
    const candidatoId = searchParams.get('candidatoId')

    if (!candidatoId) {
      return NextResponse.json({ error: 'candidatoId requerido' }, { status: 400 })
    }

    const candidato = await db.candidato.findUnique({
      where: { id: candidatoId },
      include: { equipo: { select: { empresaId: true } } },
    })

    if (!candidato) {
      return NextResponse.json({ error: 'Candidato no encontrado' }, { status: 404 })
    }

    if (user.rol === 'RECLUTADOR' && candidato.reclutadorId !== user.id) {
      return NextResponse.json({ error: 'No tienes acceso a este candidato' }, { status: 403 })
    }

    requireTenantScope(user, { empresaId: candidato.equipo.empresaId })

    requireTenantScope(user, { empresaId: candidato.equipo.empresaId })

    if (!canAccessEmpresa(user, candidato.equipo.empresaId)) {
      return NextResponse.json({ error: 'No tienes acceso a este candidato' }, { status: 403 })
    }

    const documentos = await db.documento.findMany({
      where: { candidatoId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nombre: true,
        nombreOriginal: true,
        tipo: true,
        tamanho: true,
        mimetype: true,
        candidatoId: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      documentos: documentos.map((documento) => ({
        ...documento,
        url: `/api/documentos/download/${documento.id}`,
      })),
    })
  } catch (error) {
    console.error('Error obteniendo documentos:', error)
    return safeErrorResponse(error, request)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireSession()
    requireRole(user, ['ADMIN', 'GERENTE', 'RECLUTADOR'])

    const rateLimitResult = await checkRateLimitAsync(
      getRateLimitIdentifier(request, user.id),
      'create'
    )
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: rateLimitResult.error },
        { status: 429, headers: rateLimitResult.headers }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const candidatoId = formData.get('candidatoId') as string
    const tipo = (formData.get('tipo') as string) || 'CV'

    if (!file || !candidatoId) {
      return NextResponse.json({ error: 'Archivo y candidatoId son requeridos' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'El archivo excede el tamaño máximo de 10MB' }, { status: 400 })
    }

    if (!ALLOWED_TYPES[file.type]) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido. Permitidos: PDF, Word, Imágenes' },
        { status: 400 }
      )
    }

    const candidato = await db.candidato.findUnique({
      where: { id: candidatoId },
      include: { equipo: { select: { empresaId: true } } },
    })

    if (!candidato) {
      return NextResponse.json({ error: 'Candidato no encontrado' }, { status: 404 })
    }

    if (user.rol === 'RECLUTADOR' && candidato.reclutadorId !== user.id) {
      return NextResponse.json({ error: 'No tienes acceso a este candidato' }, { status: 403 })
    }

    if (!canAccessEmpresa(user, candidato.equipo.empresaId)) {
      return NextResponse.json({ error: 'No tienes acceso a este candidato' }, { status: 403 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const safeName = sanitizeFileName(file.name)
    const key = `documentos/${candidatoId}/${Date.now()}-${safeName}`

    await uploadDocumentObject({
      key,
      contentType: file.type,
      body: buffer,
    })

    const documento = await db.documento.create({
      data: {
        nombre: safeName,
        nombreOriginal: file.name,
        tipo: tipo as any,
        url: key,
        tamanho: file.size,
        mimetype: file.type,
        candidatoId,
        subidoPorId: user.id,
        contenido: null,
      },
    })

    return NextResponse.json(
      {
        id: documento.id,
        nombre: documento.nombre,
        tipo: documento.tipo,
        url: `/api/documentos/download/${documento.id}`,
        tamanho: documento.tamanho,
        candidatoId: documento.candidatoId,
        createdAt: documento.createdAt,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error subiendo documento:', error)
    return safeErrorResponse(error, request)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user } = await requireSession()
    requireRole(user, ['ADMIN', 'GERENTE', 'RECLUTADOR'])

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    const documento = await db.documento.findUnique({
      where: { id },
      include: { candidato: { include: { equipo: { select: { empresaId: true } } } } },
    })

    if (!documento) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
    }

    if (user.rol === 'RECLUTADOR' && documento.candidato.reclutadorId !== user.id) {
      return NextResponse.json({ error: 'No tienes permiso para eliminar este documento' }, { status: 403 })
    }

    requireTenantScope(user, { empresaId: documento.candidato.equipo.empresaId })

    if (!canAccessEmpresa(user, documento.candidato.equipo.empresaId)) {
      return NextResponse.json({ error: 'No tienes permiso para eliminar este documento' }, { status: 403 })
    }

    await deleteDocumentObject(documento.url)

    await db.documento.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Documento eliminado correctamente' })
  } catch (error) {
    console.error('Error eliminando documento:', error)
    return safeErrorResponse(error, request)
  }
}
