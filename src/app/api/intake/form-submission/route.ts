import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { IntakeSubmissionStatus, Prisma } from '@prisma/client'
import { upsertCandidateFromIntake } from '@/lib/intake'
import { IntakePayloadSchema, normalizeIntakePayload } from '@/lib/intake-normalize'
import {
  buildSigningMessage,
  decryptSecret,
  hashNonce,
  isTimestampWithinWindow,
  signPayload,
  timingSafeCompare,
} from '@/lib/intake-security'

const ERROR = {
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  REPLAY: 'REPLAY',
  STALE_TIMESTAMP: 'STALE_TIMESTAMP',
  INVALID_KEY: 'INVALID_KEY',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL: 'INTERNAL',
} as const

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ ok: false, code, message }, { status })
}


function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) {
      return jsonError(415, ERROR.VALIDATION_ERROR, 'Content-Type debe ser application/json')
    }

    const timestamp = request.headers.get('x-atlas-timestamp')
    const nonce = request.headers.get('x-atlas-nonce')
    const signature = request.headers.get('x-atlas-signature')
    const intakeKeyId = request.headers.get('x-atlas-key')

    if (!timestamp || !nonce || !signature || !intakeKeyId) {
      return jsonError(400, ERROR.VALIDATION_ERROR, 'Headers de firma incompletos')
    }

    const tsNumber = Number(timestamp)
    if (!Number.isFinite(tsNumber) || !isTimestampWithinWindow(tsNumber, 300)) {
      return jsonError(401, ERROR.STALE_TIMESTAMP, 'Timestamp fuera de ventana permitida')
    }

    const intakeKey = await db.intakeKey.findFirst({
      where: {
        id: intakeKeyId,
        isActive: true,
      },
      select: {
        id: true,
        empresaId: true,
        equipoId: true,
        secretEncrypted: true,
      },
    })

    if (!intakeKey) {
      return jsonError(401, ERROR.INVALID_KEY, 'Intake key inválida o inactiva')
    }

    const rawBody = await request.text()
    const message = buildSigningMessage(timestamp, nonce, rawBody)
    const secret = decryptSecret(intakeKey.secretEncrypted)
    const expectedSignature = signPayload(secret, message)

    if (!timingSafeCompare(expectedSignature, signature)) {
      return jsonError(401, ERROR.INVALID_SIGNATURE, 'Firma inválida')
    }

    const now = new Date()
    const nonceHash = hashNonce(timestamp, nonce, intakeKey.id)

    await db.intakeNonce.deleteMany({
      where: {
        intakeKeyId: intakeKey.id,
        expiresAt: { lt: now },
      },
    })

    try {
      await db.intakeNonce.create({
        data: {
          empresaId: intakeKey.empresaId,
          intakeKeyId: intakeKey.id,
          nonceHash,
          timestamp: tsNumber,
          expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
        },
      })
    } catch {
      return jsonError(409, ERROR.REPLAY, 'Nonce replay detectado')
    }

    const payloadUnknown: unknown = JSON.parse(rawBody)
    const parsed = IntakePayloadSchema.safeParse(payloadUnknown)
    if (!parsed.success) {
      return jsonError(400, ERROR.VALIDATION_ERROR, parsed.error.issues[0]?.message ?? 'Payload inválido')
    }

    const normalized = normalizeIntakePayload(parsed.data)

    const existingSubmission = await db.intakeSubmission.findUnique({
      where: {
        empresaId_externalSubmissionId: {
          empresaId: intakeKey.empresaId,
          externalSubmissionId: normalized.externalSubmissionId,
        },
      },
    })

    if (existingSubmission) {
      return NextResponse.json({
        ok: true,
        status: existingSubmission.status,
        candidateId: existingSubmission.candidateId,
        submissionId: existingSubmission.id,
      })
    }

    const submission = await db.intakeSubmission.create({
      data: {
        empresaId: intakeKey.empresaId,
        intakeKeyId: intakeKey.id,
        source: 'google_form',
        sheetId: normalized.sheetId,
        sheetName: normalized.sheetName,
        rowNumber: normalized.rowNumber,
        externalSubmissionId: normalized.externalSubmissionId,
        status: IntakeSubmissionStatus.RECEIVED,
        payloadRaw: toInputJsonValue(payloadUnknown),
      },
    })

    try {
      const { candidate, status } = await upsertCandidateFromIntake({
        empresaId: intakeKey.empresaId,
        equipoId: intakeKey.equipoId,
        normalized,
      })

      const updated = await db.intakeSubmission.update({
        where: { id: submission.id },
        data: {
          status,
          processedAt: new Date(),
          payloadNormalized: toInputJsonValue(normalized),
          candidateId: candidate.id,
        },
      })

      return NextResponse.json({
        ok: true,
        status: updated.status,
        candidateId: candidate.id,
        submissionId: updated.id,
      })
    } catch (error) {
      await db.intakeSubmission.update({
        where: { id: submission.id },
        data: {
          status: IntakeSubmissionStatus.ERROR,
          processedAt: new Date(),
          payloadNormalized: toInputJsonValue(normalized),
          errorMessage: error instanceof Error ? error.message : 'Error de procesamiento',
        },
      })

      return jsonError(500, ERROR.INTERNAL, 'Error al procesar intake')
    }
  } catch {
    return jsonError(500, ERROR.INTERNAL, 'Error interno')
  }
}

export async function GET() {
  return jsonError(405, ERROR.VALIDATION_ERROR, 'Método no permitido')
}
