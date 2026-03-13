import { InvitationStatus } from '@prisma/client'
import { db } from '@/lib/db'
import { normalizeEmail } from '@/lib/auth-helpers'

export function isInvitationExpired(invitation: { expiresAt: Date }): boolean {
  return invitation.expiresAt.getTime() <= Date.now()
}

async function expireInvitationIfNeeded<T extends { id: string; expiresAt: Date; status: InvitationStatus }>(invitation: T): Promise<T> {
  if (!isInvitationExpired(invitation) || invitation.status === InvitationStatus.EXPIRED) {
    return invitation
  }

  await db.invitacion.update({
    where: { id: invitation.id },
    data: { status: InvitationStatus.EXPIRED },
  })

  return {
    ...invitation,
    status: InvitationStatus.EXPIRED,
  }
}

export async function findPendingInvitationByEmail(email: string) {
  const normalizedEmail = normalizeEmail(email)
  const invitation = await db.invitacion.findFirst({
    where: {
      email: normalizedEmail,
      status: InvitationStatus.PENDING,
    },
    orderBy: { createdAt: 'desc' },
    include: {
      empresa: { select: { id: true, nombre: true } },
      equipo: { select: { id: true, nombre: true } },
      invitadoPor: { select: { id: true, name: true, email: true } },
    },
  })

  if (!invitation) {
    return null
  }

  return expireInvitationIfNeeded(invitation)
}

export async function findInvitationByToken(token: string) {
  const invitation = await db.invitacion.findUnique({
    where: { token },
    include: {
      empresa: { select: { id: true, nombre: true } },
      equipo: { select: { id: true, nombre: true } },
      invitadoPor: { select: { id: true, name: true, email: true } },
    },
  })

  if (!invitation) {
    return null
  }

  return expireInvitationIfNeeded(invitation)
}

export async function findInvitationByEmailAndCode(email: string, code: string) {
  const invitation = await db.invitacion.findFirst({
    where: {
      email: normalizeEmail(email),
      code: code.trim().toUpperCase(),
    },
    include: {
      empresa: { select: { id: true, nombre: true } },
      equipo: { select: { id: true, nombre: true } },
      invitadoPor: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!invitation) {
    return null
  }

  return expireInvitationIfNeeded(invitation)
}
