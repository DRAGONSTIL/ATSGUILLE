import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, requireSession, requireTenantScope, safeErrorResponse } from '@/lib/api-security'

function tenantWhere(user: { rol: string; empresaId?: string | null }) {
  if (user.rol === 'ADMIN' || !user.empresaId) return {}
  return { empresaId: user.empresaId }
}

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireSession()
    requireRole(user, ['ADMIN', 'GERENTE', 'RECLUTADOR'])
    requireTenantScope(user, { empresaId: user.empresaId })

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()

    if (q.length < 2) {
      return NextResponse.json({ candidatos: [], vacantes: [] })
    }

    const empresaScope = tenantWhere(user)

    const [candidatos, vacantes] = await Promise.all([
      db.candidato.findMany({
        where: {
          ...((user.rol === 'ADMIN')
            ? {}
            : { equipo: { empresaId: user.empresaId ?? undefined } }),
          OR: [
            { nombre: { contains: q, mode: 'insensitive' } },
            { apellido: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, nombre: true, apellido: true, email: true },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
      db.vacante.findMany({
        where: {
          ...empresaScope,
          OR: [
            { titulo: { contains: q, mode: 'insensitive' } },
            { descripcion: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, titulo: true, estatus: true },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
    ])

    return NextResponse.json({ candidatos, vacantes })
  } catch (error) {
    return safeErrorResponse(error, request)
  }
}
