import crypto from 'crypto'

export function buildSigningMessage(timestamp: string, nonce: string, rawBody: string) {
  return `${timestamp}.${nonce}.${rawBody}`
}

export function signPayload(secret: string, message: string) {
  return crypto.createHmac('sha256', secret).update(message).digest('hex')
}

export function timingSafeCompare(a: string, b: string) {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return crypto.timingSafeEqual(aBuf, bBuf)
}

export function isTimestampWithinWindow(unixSeconds: number, windowSeconds = 300) {
  const now = Math.floor(Date.now() / 1000)
  return Math.abs(now - unixSeconds) <= windowSeconds
}

export function hashNonce(timestamp: string, nonce: string, keyId: string) {
  return crypto.createHash('sha256').update(`${keyId}.${timestamp}.${nonce}`).digest('hex')
}

export function buildExternalSubmissionId(input: {
  sheetId: string
  sheetName: string
  rowNumber?: number | null
  submittedAt: string
  email?: string
  phone?: string
  fullName: string
}) {
  const stable = [
    input.sheetId,
    input.sheetName,
    String(input.rowNumber ?? ''),
    input.submittedAt,
    input.email ?? '',
    input.phone ?? '',
    input.fullName,
  ].join('|')

  return crypto.createHash('sha256').update(stable).digest('hex')
}

const encryptionKey = process.env.INTAKE_ENCRYPTION_KEY || ''

function getEncryptionKey() {
  if (!encryptionKey || encryptionKey.length < 32) {
    throw new Error('INTAKE_ENCRYPTION_KEY must be set with at least 32 chars')
  }

  return crypto.createHash('sha256').update(encryptionKey).digest()
}

export function encryptSecret(secret: string) {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}.${tag.toString('hex')}.${encrypted.toString('hex')}`
}

export function decryptSecret(payload: string) {
  const [ivHex, tagHex, encryptedHex] = payload.split('.')
  if (!ivHex || !tagHex || !encryptedHex) {
    throw new Error('Invalid encrypted secret format')
  }

  const key = getEncryptionKey()
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}
