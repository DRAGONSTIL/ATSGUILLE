import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { encryptSecret } from '../src/lib/intake-security'

const prisma = new PrismaClient()

async function main() {
  const empresaId = process.argv[2]
  const equipoId = process.argv[3]
  const name = process.argv[4] || 'Google Form Intake'

  if (!empresaId || !equipoId) {
    throw new Error('Uso: npm run intake:key:create -- <empresaId> <equipoId> [name]')
  }

  const equipo = await prisma.equipo.findUnique({ where: { id: equipoId }, select: { empresaId: true } })
  if (!equipo || equipo.empresaId !== empresaId) {
    throw new Error('Equipo inválido para la empresa indicada')
  }

  const secret = crypto.randomBytes(32).toString('hex')
  const keyHash = await bcrypt.hash(secret, 12)
  const secretEncrypted = encryptSecret(secret)

  const intakeKey = await prisma.intakeKey.create({
    data: {
      empresaId,
      equipoId,
      name,
      keyHash,
      secretEncrypted,
      isActive: true,
    },
    select: { id: true, name: true, empresaId: true, equipoId: true },
  })

  console.log('Intake Key creada:')
  console.log(JSON.stringify({ ...intakeKey, secret }, null, 2))
  console.log('⚠️ Guarda el secret ahora; no se mostrará de nuevo.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
