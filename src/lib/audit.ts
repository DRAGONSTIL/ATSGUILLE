import { db } from '@/lib/db'
import { SessionUser } from '@/lib/api-security'
import { NextRequest } from 'next/server'

interface AuditInput {
  actor: SessionUser
  action: string
  entityType: string
  entityId?: string
  before?: unknown
  after?: unknown
  request: NextRequest
}

export async function logAudit(input: AuditInput): Promise<void> {
  await db.auditLog.create({
    data: {
      actorUserId: input.actor.id,
      tenantId: input.actor.empresaId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      before: input.before as object | undefined,
      after: input.after as object | undefined,
      ip: input.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? input.request.headers.get('x-real-ip') ?? undefined,
      userAgent: input.request.headers.get('user-agent') ?? undefined,
      requestId: input.request.headers.get('x-request-id') ?? undefined,
    },
  })
}
