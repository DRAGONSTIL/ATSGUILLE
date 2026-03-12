
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const candidateId = 'cmlzokikg000toy01sx7ke2t5' // The one that failed in the browser
  
  console.log('--- Candidate Data ---')
  const candidate = await prisma.candidato.findUnique({
    where: { id: candidateId },
    include: {
      equipo: true,
      reclutador: true
    }
  })
  console.log(JSON.stringify(candidate, null, 2))

  console.log('\n--- Recent Users ---')
  const users = await prisma.user.findMany({
    take: 5,
    orderBy: { updatedAt: 'desc' }
  })
  console.log(JSON.stringify(users, null, 2))
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
