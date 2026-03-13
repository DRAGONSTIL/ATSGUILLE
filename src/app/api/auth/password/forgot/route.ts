import { UserStatus } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { emailPasswordReset } from '@/lib/email'
import { buildAbsoluteUrl, generateResetToken, normalizeEmail } from '@/lib/auth-helpers'
import { PasswordResetRequestSchema } from '@/lib/validations'
import { checkRateLimitAsync, getRateLimitIdentifier } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = await checkRateLimitAsync(getRateLimitIdentifier(request), 'auth')
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: rateLimitResult.error }, { status: 429, headers: rateLimitResult.headers })
    }

    const payload = PasswordResetRequestSchema.parse(await request.json())
    const email = normalizeEmail(payload.email)

    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, email: true, status: true, activo: true },
    })

    if (!user || !user.activo || user.status !== UserStatus.ACTIVE) {
      return NextResponse.json({
        message: 'Si el acceso existe y está activo, enviaremos instrucciones al correo corporativo autorizado.',
      })
    }

    await db.passwordReset.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    })

    const token = generateResetToken()

    await db.passwordReset.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    })

    await emailPasswordReset(user.email, {
      email: user.email,
      enlace: buildAbsoluteUrl(`/reset-password/${token}`),
    })

    return NextResponse.json({
      message: 'Si el acceso existe y está activo, enviaremos instrucciones al correo corporativo autorizado.',
    })
  } catch (error) {
    console.error('password_forgot_error', error)
    return NextResponse.json({ error: 'No fue posible procesar la solicitud de seguridad.' }, { status: 400 })
  }
}
