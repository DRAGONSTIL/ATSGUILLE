// ATLAS GSE - API de Envío de Emails

import { NextRequest, NextResponse } from 'next/server'
import { EmailSendSchema } from '@/lib/validations'
import { checkRateLimitAsync, getRateLimitIdentifier } from '@/lib/rate-limit'
import { enqueueEmailJob, getEmailQueueStats } from '@/lib/email-queue'
import { requireRole, requireSession, requireTenantScope, safeErrorResponse } from '@/lib/api-security'

// GET - Estado de cola
export async function GET(request: NextRequest) {
  try {
    const { user } = await requireSession()
    requireRole(user, ['ADMIN', 'GERENTE'])
    requireTenantScope(user, { empresaId: user.empresaId })

    return NextResponse.json({
      queue: getEmailQueueStats(),
    })
  } catch (error) {
    return safeErrorResponse(error, request)
  }
}

// POST - Encolar email (async)
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireSession()
    requireRole(user, ['ADMIN', 'GERENTE'])
    requireTenantScope(user, { empresaId: user.empresaId })

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

    const body = await request.json()
    const data = EmailSendSchema.parse(body)

    const result = enqueueEmailJob({
      id: crypto.randomUUID(),
      to: data.to,
      template: data.template,
      data: data.data,
    })

    return NextResponse.json(
      {
        message: 'Email encolado',
        jobId: result.id,
      },
      { status: 202 }
    )
  } catch (error) {
    return safeErrorResponse(error, request)
  }
}
