import { readFileSync } from 'node:fs'

const protectedRoutes = [
  'src/app/api/candidatos/bulk/route.ts',
  'src/app/api/admin/asignar/route.ts',
  'src/app/api/candidatos/[id]/route.ts',
]

const violations: string[] = []

for (const routePath of protectedRoutes) {
  const source = readFileSync(routePath, 'utf8')
  if (source.includes("from '@/lib/db'") || source.includes('from "@/lib/db"')) {
    violations.push(`${routePath}: import directo de db prohibido en ruta protegida`)
  }
}

if (violations.length) {
  console.error('Security scan failed:\n' + violations.join('\n'))
  process.exit(1)
}

console.log(`Security scan OK. Revisadas ${protectedRoutes.length} rutas protegidas.`)
