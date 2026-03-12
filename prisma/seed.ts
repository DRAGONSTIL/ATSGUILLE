import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  if (process.env.DEMO_MODE !== 'true') {
    console.log('Seed skipped: DEMO_MODE is not enabled.')
    return
  }

  const exists = await prisma.empresa.findFirst({ where: { nombre: 'Empresa Demo ATLAS' } })
  if (exists) {
    console.log('Seed already applied.')
    return
  }

  await prisma.empresa.create({
    data: {
      nombre: 'Empresa Demo ATLAS',
      activa: true,
    },
  })

  console.log('Seed demo data created.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
