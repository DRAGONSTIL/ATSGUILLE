import { InvitationStatus } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { safeErrorResponse, requireRole, requireSession, requireTenantScope } from '@/lib/api-security'
import { generateInvitationCode, generateInviteToken, buildAbsoluteUrl, roleLabel } from '@/lib/auth-helpers'
import { InvitacionCreateSchema } from '@/lib/validations'
import { emailInvitacion } from '@/lib/email'
import { checkRateLimitAsync, getRateLimitIdentifier } from '@/lib/rate-limit'

async function sendInvitationEmail(invitationId: string) {
  const invitation = await db.invitacion.findUnique({
    where: { id: invitationId },
    include: {
      empresa: { select: { nombre: true } },
      invitadoPor: { select: { name: true } },
    },
  })

  if (!invitation) {
    throw new Error('INVITATION_NOT_FOUND')
  }

  await emailInvitacion(invitation.email, {
    invitadoPor: invitation.invitadoPor?.name || 'Administración de ATLAS GSE',
    empresaNombre: invitation.empresa?.nombre || 'ATLAS GSE',
    rol: roleLabel(invitation.rol),
    enlace: buildAbsoluteUrl(`/invite/${invitation.token}`),
    codigoInvitacion: invitation.code,
    emailInvitado: invitation.email,
  })

  await db.invitacion.update({
    where: { id: invitationId },
    data: {
      sentAt: invitation.sentAt ?? new Date(),
      lastSentAt: new Date(),
    },
  })
}

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireSession()
    requireRole(user, ['ADMIN', 'GERENTE'])

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as InvitationStatus | null
    const where: Record<string, unknown> = {}

    if (user.rol === 'GERENTE') {
      requireTenantScope(user, { empresaId: user.empresaId })
      where.empresaId = user.empresaId
    }

    if (status) {
      where.status = status
    }

    const invitaciones = await db.invitacion.findMany({
      where,
      include: {
        empresa: { select: { id: true, nombre: true } },
        equipo: { select: { id: true, nombre: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ invitaciones })
  } catch (error) {
    return safeErrorResponse(error, request)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireSession()
    requireRole(user, ['ADMIN', 'GERENTE'])

    const rateLimitResult = await checkRateLimitAsync(getRateLimitIdentifier(request, user.id, user.empresaId ?? undefined), 'auth')
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: rateLimitResult.error }, { status: 429, headers: rateLimitResult.headers })
    }

    const payload = InvitacionCreateSchema.parse(await request.json())
    const normalizedEmail = payload.email.trim().toLowerCase()

    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, status: true, activo: true },
    })

    if (existingUser?.activo && existingUser.status === 'ACTIVE') {
      return NextResponse.json({ error: 'El correo ya cuenta con acceso activo.' }, { status: 400 })
    }

    const tenantEmpresaId = user.rol === 'GERENTE' ? user.empresaId : payload.empresaId
    requireTenantScope(user, { empresaId: tenantEmpresaId })

    if (!tenantEmpresaId) {
      return NextResponse.json({ error: 'Debes seleccionar una empresa válida para la invitación.' }, { status: 400 })
    }

    await db.invitacion.updateMany({
      where: {
        email: normalizedEmail,
        status: InvitationStatus.PENDING,
      },
      data: {
        status: InvitationStatus.REVOKED,
        revokedAt: new Date(),
      },
    })

    const expiresAt = new Date(Date.now() + payload.expiresInDays * 24 * 60 * 60 * 1000)

    const invitacion = await db.invitacion.create({
      data: {
        email: normalizedEmail,
        rol: payload.rol,
        empresaId: tenantEmpresaId,
        equipoId: payload.equipoId || null,
        mensaje: payload.mensaje?.trim() || null,
        token: generateInviteToken(),
        code: generateInvitationCode(),
        expiresAt,
        status: InvitationStatus.PENDING,
        invitadoPorId: user.id,
      },
      include: {
        empresa: { select: { id: true, nombre: true } },
        equipo: { select: { id: true, nombre: true } },
      },
    })

    await db.user.upsert({
      where: { email: normalizedEmail },
      create: {
        email: normalizedEmail,
        status: 'INVITED',
        activo: true,
        rol: payload.rol,
        empresaId: tenantEmpresaId,
        equipoId: payload.equipoId || null,
        invitedById: user.id,
      },
      update: {
        status: 'INVITED',
        activo: true,
        rol: payload.rol,
        empresaId: tenantEmpresaId,
        equipoId: payload.equipoId || null,
        invitedById: user.id,
      },
    })

    await sendInvitationEmail(invitacion.id)

    return NextResponse.json({
      message: 'Invitación enviada correctamente.',
      invitacion,
    })
  } catch (error) {
    return safeErrorResponse(error, request)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { user } = await requireSession()
    requireRole(user, ['ADMIN', 'GERENTE'])

    const body = await request.json()
    const invitationId = String(body.id || '')
    const action = String(body.action || '')

    if (!invitationId || !['resend', 'revoke'].includes(action)) {
      return NextResponse.json({ error: 'Solicitud de invitación inválida.' }, { status: 400 })
    }

    const invitation = await db.invitacion.findUnique({ where: { id: invitationId } })

    if (!invitation) {
      return NextResponse.json({ error: 'Invitación no encontrada.' }, { status: 404 })
    }

    if (user.rol === 'GERENTE') {
      requireTenantScope(user, { empresaId: invitation.empresaId })
    }

    if (action === 'revoke') {
      const updated = await db.invitacion.update({
        where: { id: invitationId },
        data: {
          status: InvitationStatus.REVOKED,
          revokedAt: new Date(),
        },
      })

      return NextResponse.json({ invitation: updated })
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      return NextResponse.json({ error: 'Solo es posible reenviar invitaciones pendientes.' }, { status: 400 })
    }

    await sendInvitationEmail(invitation.id)

    return NextResponse.json({ message: 'Invitación reenviada correctamente.' })
  } catch (error) {
    return safeErrorResponse(error, request)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user } = await requireSession()
    requireRole(user, ['ADMIN', 'GERENTE'])

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID de invitación requerido.' }, { status: 400 })
    }

    const invitation = await db.invitacion.findUnique({ where: { id } })
    if (!invitation) {
      return NextResponse.json({ error: 'Invitación no encontrada.' }, { status: 404 })
    }

    if (user.rol === 'GERENTE') {
      requireTenantScope(user, { empresaId: invitation.empresaId })
    }

    await db.invitacion.update({
      where: { id },
      data: {
        status: InvitationStatus.REVOKED,
        revokedAt: new Date(),
      },
    })

    return NextResponse.json({ message: 'Invitación revocada.' })
  } catch (error) {
    return safeErrorResponse(error, request)
  }
}
