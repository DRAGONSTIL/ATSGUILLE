import { InvitationStatus } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { findInvitationByEmailAndCode, findInvitationByToken } from '@/lib/invitation-helpers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const email = searchParams.get('email')
    const code = searchParams.get('code')

    const invitation =
      token?.trim()
        ? await findInvitationByToken(token.trim())
        : email?.trim() && code?.trim()
          ? await findInvitationByEmailAndCode(email, code)
          : null

    if (!invitation) {
      return NextResponse.json({ valid: false, error: 'No se encontró una invitación activa para este acceso.' }, { status: 404 })
    }

    if (invitation.status === InvitationStatus.REVOKED) {
      return NextResponse.json({ valid: false, error: 'Esta invitación fue revocada por la administración.' }, { status: 400 })
    }

    if (invitation.status === InvitationStatus.USED) {
      return NextResponse.json({ valid: false, error: 'Esta invitación ya fue utilizada.' }, { status: 400 })
    }

    if (invitation.status === InvitationStatus.EXPIRED) {
      return NextResponse.json({ valid: false, error: 'Este acceso ha expirado. Solicita una nueva invitación.' }, { status: 400 })
    }

    return NextResponse.json({
      valid: true,
      invitation: {
        id: invitation.id,
        token: invitation.token,
        email: invitation.email,
        code: invitation.code,
        rol: invitation.rol,
        empresa: invitation.empresa,
        equipo: invitation.equipo,
        invitadoPor: invitation.invitadoPor,
        expiresAt: invitation.expiresAt,
        status: invitation.status,
      },
    })
  } catch (error) {
    console.error('invite_validate_error', error)
    return NextResponse.json({ valid: false, error: 'No fue posible validar la invitación.' }, { status: 500 })
  }
}
