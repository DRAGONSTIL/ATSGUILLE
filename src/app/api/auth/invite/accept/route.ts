import { InvitationStatus, UserStatus } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { InviteActivationSchema } from '@/lib/validations'
import { findInvitationByEmailAndCode, findInvitationByToken } from '@/lib/invitation-helpers'
import { buildAbsoluteUrl, hashPassword, normalizeEmail, normalizeUsername, roleLabel, validatePasswordStrength } from '@/lib/auth-helpers'
import { emailBienvenida } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const payload = InviteActivationSchema.parse(await request.json())

    const invitation =
      (payload.email && payload.code ? await findInvitationByEmailAndCode(payload.email, payload.code) : null) ||
      (request.headers.get('x-invite-token') ? await findInvitationByToken(request.headers.get('x-invite-token')!) : null)

    if (!invitation) {
      return NextResponse.json({ error: 'No se encontró una invitación activa para este correo y código.' }, { status: 404 })
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      return NextResponse.json({ error: 'La invitación ya no está disponible para activación.' }, { status: 400 })
    }

    const normalizedEmail = normalizeEmail(payload.email)
    if (normalizedEmail !== invitation.email) {
      return NextResponse.json({ error: 'El correo no coincide con una invitación activa.' }, { status: 400 })
    }

    if (!payload.password) {
      return NextResponse.json({ error: 'Debes crear una contraseña segura para activar este acceso.' }, { status: 400 })
    }

    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, name: true },
    })

    if (!payload.name?.trim() && !existingUser?.name) {
      return NextResponse.json({ error: 'Debes registrar el nombre completo del acceso autorizado.' }, { status: 400 })
    }

    const passwordError = validatePasswordStrength(payload.password)
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 })
    }

    const normalizedUsername = payload.username ? normalizeUsername(payload.username) : null
    if (normalizedUsername) {
      const usernameOwner = await db.user.findUnique({ where: { username: normalizedUsername } })
      if (usernameOwner && usernameOwner.email !== normalizedEmail) {
        return NextResponse.json({ error: 'El usuario solicitado ya está asignado a otra cuenta.' }, { status: 400 })
      }
    }

    const passwordHash = await hashPassword(payload.password)

    const user = await db.user.upsert({
      where: { email: normalizedEmail },
      create: {
        email: normalizedEmail,
        username: normalizedUsername,
        name: payload.name?.trim() || null,
        passwordHash,
        status: UserStatus.ACTIVE,
        activo: true,
        rol: invitation.rol,
        empresaId: invitation.empresaId,
        equipoId: invitation.equipoId,
        invitedById: invitation.invitadoPorId ?? null,
      },
      update: {
        username: normalizedUsername ?? undefined,
        name: payload.name?.trim() || undefined,
        passwordHash,
        status: UserStatus.ACTIVE,
        activo: true,
        rol: invitation.rol,
        empresaId: invitation.empresaId,
        equipoId: invitation.equipoId,
        invitedById: invitation.invitadoPorId ?? undefined,
      },
    })

    await db.invitacion.update({
      where: { id: invitation.id },
      data: {
        status: InvitationStatus.USED,
        usedAt: new Date(),
      },
    })

    await db.actividad.create({
      data: {
        tipo: 'NOTA_AGREGADA',
        descripcion: `Acceso activado para ${user.email}`,
        entidad: 'usuario',
        entidadId: user.id,
        usuarioId: invitation.invitadoPorId ?? user.id,
      },
    })

    await emailBienvenida(user.email, {
      nombre: user.name || user.email,
      empresaNombre: invitation.empresa?.nombre || 'ATLAS GSE',
      rol: roleLabel(user.rol),
      enlaceLogin: buildAbsoluteUrl('/login'),
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
      },
    })
  } catch (error) {
    console.error('invite_accept_error', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No fue posible activar el acceso.' }, { status: 400 })
  }
}
