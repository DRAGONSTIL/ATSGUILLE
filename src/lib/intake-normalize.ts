import { z } from 'zod'
import { buildExternalSubmissionId } from './intake-security'

export const IntakePayloadSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  vacancyId: z.string().optional().or(z.literal('')),
  vacancyTitle: z.string().optional().or(z.literal('')),
  storeCode: z.string().optional().or(z.literal('')),
  storeName: z.string().optional().or(z.literal('')),
  university: z.string().optional().or(z.literal('')),
  programType: z.string().optional().or(z.literal('')),
  submittedAt: z.string(),
  sheetId: z.string().min(1),
  sheetName: z.string().min(1),
  rowNumber: z.number().int().optional(),
  rawAnswers: z.record(z.string(), z.string()),
})

export type NormalizedIntakePayload = {
  fullName: string
  firstName: string
  lastName: string
  emailLower?: string
  phoneDigits?: string
  vacancyId?: string
  vacancyTitle?: string
  storeCode?: string
  storeName?: string
  university?: string
  programType?: string
  submittedAt: string
  sheetId: string
  sheetName: string
  rowNumber?: number
  rawAnswers: Record<string, string>
  externalSubmissionId: string
}

export type DedupStrategy =
  | { type: 'email'; value: string }
  | { type: 'phone'; value: string }
  | { type: 'external'; value: string }

export function getDedupStrategy(normalized: NormalizedIntakePayload): DedupStrategy {
  if (normalized.emailLower) return { type: 'email', value: normalized.emailLower }
  if (normalized.phoneDigits) return { type: 'phone', value: normalized.phoneDigits }
  return { type: 'external', value: normalized.externalSubmissionId }
}

export function normalizeIntakePayload(input: z.infer<typeof IntakePayloadSchema>): NormalizedIntakePayload {
  const fullName = input.fullName.trim().replace(/\s+/g, ' ')
  const parts = fullName.split(' ')
  const firstName = parts[0] ?? fullName
  const lastName = parts.slice(1).join(' ') || 'N/A'

  const emailLower = input.email?.trim().toLowerCase() || undefined
  const phoneDigits = input.phone?.replace(/\D/g, '') || undefined

  const normalized: Omit<NormalizedIntakePayload, 'externalSubmissionId'> = {
    fullName,
    firstName,
    lastName,
    emailLower,
    phoneDigits,
    vacancyId: input.vacancyId || undefined,
    vacancyTitle: input.vacancyTitle || undefined,
    storeCode: input.storeCode || undefined,
    storeName: input.storeName || undefined,
    university: input.university || undefined,
    programType: input.programType || undefined,
    submittedAt: input.submittedAt,
    sheetId: input.sheetId,
    sheetName: input.sheetName,
    rowNumber: input.rowNumber,
    rawAnswers: input.rawAnswers,
  }

  return {
    ...normalized,
    externalSubmissionId: buildExternalSubmissionId({
      sheetId: normalized.sheetId,
      sheetName: normalized.sheetName,
      rowNumber: normalized.rowNumber,
      submittedAt: normalized.submittedAt,
      email: normalized.emailLower,
      phone: normalized.phoneDigits,
      fullName: normalized.fullName,
    }),
  }
}
