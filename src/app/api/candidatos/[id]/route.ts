import { NextRequest, NextResponse } from 'next/server'
import { CandidatoUpdateSchema } from '@/lib/validations'
import { withApiAuth, requireAuthorization, safe404, safeErrorResponse } from '@/server/api/secure-route'
import { tenantDb } from '@/server/tenant/tenantClient'
import { findCandidateForRead } from '@/server/repositories/candidato-repository'
import { deleteCandidate, updateCandidate } from '@/server/repositories/candidato-command-repository'
import { logAudit } from '@/lib/audit'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    return await withApiAuth(async (_request, user) => {
      requireAuthorization(user, 'candidate.read', { tenantId: user.empresaId })
      const { id } = await params
      const candidate = await findCandidateForRead(tenantDb(user), id)
      if (!candidate) return safe404()
      return NextResponse.json(candidate)
    }, request)
  } catch (error) {
    return safeErrorResponse(error, request)
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    return await withApiAuth(async (_request, user) => {
      requireAuthorization(user, 'candidate.update', { tenantId: user.empresaId })
      const { id } = await params
      const before = await findCandidateForRead(tenantDb(user), id)
      if (!before) return safe404()
      const payload = CandidatoUpdateSchema.parse(await request.json())
      const updated = await updateCandidate(before.id, payload)
      await logAudit({ actor: user, action: 'candidate.update', entityType: 'candidato', entityId: updated.id, before, after: updated, request })
      return NextResponse.json(updated)
    }, request)
  } catch (error) {
    return safeErrorResponse(error, request)
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return PUT(request, { params })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    return await withApiAuth(async (_request, user) => {
      requireAuthorization(user, 'candidate.delete', { tenantId: user.empresaId })
      const { id } = await params
      const before = await findCandidateForRead(tenantDb(user), id)
      if (!before) return safe404()
      await deleteCandidate(before.id)
      await logAudit({ actor: user, action: 'candidate.delete', entityType: 'candidato', entityId: before.id, before, request })
      return NextResponse.json({ message: 'Candidato eliminado correctamente' })
    }, request)
  } catch (error) {
    return safeErrorResponse(error, request)
  }
}
