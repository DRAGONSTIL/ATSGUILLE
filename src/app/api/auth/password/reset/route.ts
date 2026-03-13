import { UserStatus } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, validatePasswordStrength } from '@/lib/auth-helpers'
import { PasswordResetSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const payload = PasswordResetSchema.parse(await request.json())
    const passwordError = validatePasswordStrength(payload.password)

    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 })
    }

    const resetRequest = await db.passwordReset.findUnique({
      where: { token: payload.token },
      include: { user: true },
    })

    if (!resetRequest || resetRequest.usedAt || resetRequest.expiresAt.getTime() <= Date.now()) {
      return NextResponse.json({ error: 'Este restablecimiento ya no está disponible.' }, { status: 400 })
    }

    if (!resetRequest.user.activo || resetRequest.user.status !== UserStatus.ACTIVE) {
      return NextResponse.json({ error: 'La cuenta autorizada no puede restablecerse.' }, { status: 400 })
    }

    const passwordHash = await hashPassword(payload.password)

    await db.user.update({
      where: { id: resetRequest.userId },
      data: { passwordHash },
    })

    await db.passwordReset.update({
      where: { id: resetRequest.id },
      data: { usedAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('password_reset_error', error)
    return NextResponse.json({ error: 'No fue posible restablecer el acceso.' }, { status: 400 })
  }
}
