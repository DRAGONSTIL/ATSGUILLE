import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase()
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash)
}

export function generateInviteToken(): string {
  return randomBytes(32).toString('hex')
}

export function generateInvitationCode(): string {
  const source = randomBytes(9).toString('base64url').toUpperCase().replace(/[^A-Z0-9]/g, '')
  const clean = source.slice(0, 12).padEnd(12, 'X')
  return `ATLAS-${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8, 12)}`
}

export function generateResetToken(): string {
  return randomBytes(32).toString('hex')
}

export function validatePasswordStrength(password: string): string | null {
  if (password.length < 10) {
    return 'La contraseña debe integrar al menos 10 caracteres.'
  }

  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    return 'La contraseña debe combinar mayúsculas y minúsculas.'
  }

  if (!/\d/.test(password)) {
    return 'La contraseña debe incluir al menos un número.'
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'La contraseña debe incluir al menos un carácter especial.'
  }

  return null
}

export function getBaseUrl(): string {
  return process.env.NEXTAUTH_URL || 'http://localhost:3000'
}

export function buildAbsoluteUrl(path: string): string {
  return new URL(path, getBaseUrl()).toString()
}

export function roleLabel(role: string): string {
  switch (role) {
    case 'ADMIN':
      return 'Administrador'
    case 'GERENTE':
      return 'Gerencia'
    default:
      return 'Reclutamiento'
  }
}
