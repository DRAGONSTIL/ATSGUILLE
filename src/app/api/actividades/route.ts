// ATLAS GSE - API de Actividades

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, requireSession, requireTenantScope, safeErrorResponse } from '@/lib/api-security'

// GET - Listar actividades
export async function GET(request: NextRequest) {
  try {
    const { user } = await requireSession()
    requireRole(user, ['ADMIN', 'GERENTE', 'RECLUTADOR'])

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const candidatoId = searchParams.get('candidatoId')
    const tipo = searchParams.get('tipo')

    const where: Record<string, unknown> = {}

    if (user.rol === 'RECLUTADOR') {
      where.OR = [
        { usuarioId: user.id },
        { candidato: { reclutadorId: user.id } },
      ]
    } else if (user.rol === 'GERENTE') {
      requireTenantScope(user, { empresaId: user.empresaId })
      const usuarios = await db.user.findMany({
        where: { empresaId: user.empresaId },
        select: { id: true },
      })
      where.OR = [
        { usuarioId: { in: usuarios.map(u => u.id) } },
        { candidato: { equipo: { empresaId: user.empresaId } } },
      ]
    }

    if (candidatoId) {
      const candidato = await db.candidato.findUnique({
        where: { id: candidatoId },
        include: { equipo: { select: { empresaId: true } } },
      })

      if (!candidato) {
        return NextResponse.json({ error: 'Candidato no encontrado' }, { status: 404 })
      }

      requireTenantScope(user, { empresaId: candidato.equipo.empresaId })
      where.candidatoId = candidatoId
    }

    if (tipo) where.tipo = tipo

    const actividades = await db.actividad.findMany({
      where,
      include: {
        usuario: { select: { id: true, name: true, email: true } },
        candidato: { select: { id: true, nombre: true, apellido: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ actividades })
  } catch (error) {
    return safeErrorResponse(error, request)
  }
}
