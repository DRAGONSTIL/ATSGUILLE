// ATLAS GSE - Configuración de NextAuth.js v4
// Google OAuth + Credentials Provider con demo UNIFICADO

import { NextAuthOptions, type Session } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { db } from './db'
import { Rol } from '@prisma/client'
import { randomBytes } from 'crypto'
import { getPermissionsByRole } from '@/lib/authorization'

const isDemoModeEnabled = process.env.DEMO_MODE === 'true' && process.env.NODE_ENV !== 'production'

// Helper para generar token de invitación
export function generateInviteToken(): string {
  return randomBytes(32).toString('hex')
}

// ID fijo para la empresa demo compartida
const DEMO_EMPRESA_ID = 'demo-empresa-compartida'
const DEMO_EQUIPO_ID = 'demo-equipo-compartido'

// Helper para obtener o crear la empresa demo compartida
async function getOrCreateDemoEmpresa() {
  // Buscar empresa demo existente
  let empresa = await db.empresa.findUnique({
    where: { id: DEMO_EMPRESA_ID }
  })

  if (empresa) {
    return empresa
  }

  // Crear empresa demo compartida
  empresa = await db.empresa.create({
    data: {
      id: DEMO_EMPRESA_ID,
      nombre: 'Empresa Demo ATLAS',
      activa: true,
    },
  })

  return empresa
}

// Helper para obtener o crear el equipo demo compartido
async function getOrCreateDemoEquipo(empresaId: string) {
  let equipo = await db.equipo.findUnique({
    where: { id: DEMO_EQUIPO_ID }
  })

  if (equipo) {
    return equipo
  }

  // Crear equipo demo compartido
  equipo = await db.equipo.create({
    data: {
      id: DEMO_EQUIPO_ID,
      nombre: 'Equipo Principal Demo',
      empresaId,
    },
  })

  return equipo
}

// Helper para inicializar datos demo (solo una vez)
let demoInitialized = false

async function initializeDemoData(empresaId: string, equipoId: string) {
  if (demoInitialized) return
  demoInitialized = true

  // Verificar si ya hay vacantes
  const vacantesCount = await db.vacante.count({ where: { empresaId } })
  if (vacantesCount > 0) return

  // Crear vacantes demo
  await Promise.all([
    db.vacante.create({
      data: {
        titulo: 'Desarrollador Full Stack',
        descripcion: 'Buscamos desarrollador con experiencia en React y Node.js',
        ubicacion: 'Ciudad de México',
        salarioMin: 35000,
        salarioMax: 55000,
        estatus: 'PUBLICADA',
        prioridad: 'ALTA',
        empresaId,
      },
    }),
    db.vacante.create({
      data: {
        titulo: 'Diseñador UX/UI',
        descripcion: 'Diseñador con experiencia en Figma y sistemas de diseño',
        ubicacion: 'Remoto',
        salarioMin: 28000,
        salarioMax: 42000,
        estatus: 'PUBLICADA',
        prioridad: 'MEDIA',
        empresaId,
      },
    }),
    db.vacante.create({
      data: {
        titulo: 'Product Manager',
        descripcion: 'PM con experiencia en metodologías ágiles',
        ubicacion: 'Guadalajara',
        salarioMin: 45000,
        salarioMax: 70000,
        estatus: 'BORRADOR',
        prioridad: 'URGENTE',
        empresaId,
      },
    }),
  ])

  // Crear candidatos demo
  const fuentes = ['LINKEDIN', 'OCC', 'COMPUTRABAJA', 'REFERIDO', 'OTRO'] as const
  const estatuses = ['REGISTRADO', 'EN_PROCESO', 'ENTREVISTA', 'CONTRATADO', 'RECHAZADO'] as const
  const nombres = [
    { nombre: 'María', apellido: 'García' },
    { nombre: 'Carlos', apellido: 'Rodríguez' },
    { nombre: 'Ana', apellido: 'Martínez' },
    { nombre: 'José', apellido: 'López' },
    { nombre: 'Laura', apellido: 'Sánchez' },
    { nombre: 'Miguel', apellido: 'Hernández' },
    { nombre: 'Sofía', apellido: 'González' },
    { nombre: 'Diego', apellido: 'Pérez' },
    { nombre: 'Valentina', apellido: 'Ramírez' },
    { nombre: 'Andrés', apellido: 'Torres' },
    { nombre: 'Camila', apellido: 'Flores' },
    { nombre: 'Roberto', apellido: 'Rivera' },
  ]

  for (let i = 0; i < nombres.length; i++) {
    const { nombre, apellido } = nombres[i]
    await db.candidato.create({
      data: {
        nombre,
        apellido,
        email: `${nombre.toLowerCase()}.${apellido.toLowerCase()}.${Date.now()}@demo.com`,
        telefono: `+52 55 1234 ${String(5000 + i).slice(1)}`,
        fuente: fuentes[i % fuentes.length],
        estatus: estatuses[i % estatuses.length],
        equipoId,
      },
    })
  }
}

// Seed starter data for new Google OAuth users
async function seedStarterData(empresaId: string, equipoId: string, userId: string) {
  // Check if this empresa already has data
  const vacantesCount = await db.vacante.count({ where: { empresaId } })
  if (vacantesCount > 0) return

  // Create starter vacantes
  const vacanteData = [
    {
      titulo: 'Ingeniero de Software Senior',
      descripcion: 'Buscamos ingeniero con experiencia sólida en arquitectura de microservicios, React y Node.js.',
      ubicacion: 'Ciudad de México',
      salarioMin: 45000,
      salarioMax: 70000,
      estatus: 'PUBLICADA' as const,
      prioridad: 'ALTA' as const,
      empresaId,
    },
    {
      titulo: 'Analista de Datos',
      descripcion: 'Analista con experiencia en Python, SQL y herramientas de visualización como Tableau o Power BI.',
      ubicacion: 'Remoto',
      salarioMin: 30000,
      salarioMax: 48000,
      estatus: 'PUBLICADA' as const,
      prioridad: 'MEDIA' as const,
      empresaId,
    },
    {
      titulo: 'Director de Marketing Digital',
      descripcion: 'Líder de marketing con experiencia en estrategias digitales, SEO/SEM y gestión de equipos.',
      ubicacion: 'Monterrey',
      salarioMin: 55000,
      salarioMax: 85000,
      estatus: 'PUBLICADA' as const,
      prioridad: 'URGENTE' as const,
      empresaId,
    },
  ]

  const vacantes = await Promise.all(
    vacanteData.map(v => db.vacante.create({ data: v }))
  )

  // Candidate data with varied statuses
  const candidatos = [
    { nombre: 'Andrea', apellido: 'Vega', fuente: 'LINKEDIN', estatus: 'REGISTRADO' },
    { nombre: 'Ricardo', apellido: 'Morales', fuente: 'REFERIDO', estatus: 'REGISTRADO' },
    { nombre: 'Patricia', apellido: 'Castillo', fuente: 'OCC', estatus: 'EN_PROCESO' },
    { nombre: 'Fernando', apellido: 'Reyes', fuente: 'LINKEDIN', estatus: 'EN_PROCESO' },
    { nombre: 'Daniela', apellido: 'Ortiz', fuente: 'COMPUTRABAJA', estatus: 'ENTREVISTA' },
    { nombre: 'Alejandro', apellido: 'Mendoza', fuente: 'LINKEDIN', estatus: 'ENTREVISTA' },
    { nombre: 'Gabriela', apellido: 'Herrera', fuente: 'REFERIDO', estatus: 'ENTREVISTA' },
    { nombre: 'Sebastián', apellido: 'Vargas', fuente: 'OCC', estatus: 'CONTRATADO' },
    { nombre: 'Mariana', apellido: 'Jiménez', fuente: 'LINKEDIN', estatus: 'CONTRATADO' },
    { nombre: 'Hugo', apellido: 'Salazar', fuente: 'COMPUTRABAJA', estatus: 'RECHAZADO' },
    { nombre: 'Valeria', apellido: 'Aguirre', fuente: 'REFERIDO', estatus: 'REGISTRADO' },
    { nombre: 'Emilio', apellido: 'Navarro', fuente: 'OTRO', estatus: 'EN_PROCESO' },
  ]

  const createdCandidatos = await Promise.all(
    candidatos.map((c, i) => {
      const now = Date.now()
      const daysAgo = Math.floor(Math.random() * 20) + 1
      const createdAt = new Date(now - daysAgo * 24 * 60 * 60 * 1000)
      return db.candidato.create({
        data: {
          nombre: c.nombre,
          apellido: c.apellido,
          email: `${c.nombre.toLowerCase()}.${c.apellido.toLowerCase()}.${now}@aplicante.com`,
          telefono: `+52 55 ${String(1000 + i * 111).padStart(4, '0')} ${String(2000 + i * 222).padStart(4, '0')}`,
          fuente: c.fuente as any,
          estatus: c.estatus as any,
          vacanteId: vacantes[i % vacantes.length].id,
          equipoId,
          reclutadorId: userId,
          rating: c.estatus === 'CONTRATADO' ? 5 : c.estatus === 'ENTREVISTA' ? 4 : c.estatus === 'RECHAZADO' ? 2 : 3,
          createdAt,
          fechaContratacion: c.estatus === 'CONTRATADO' ? new Date(now - Math.floor(Math.random() * 5) * 24 * 60 * 60 * 1000) : undefined,
          fechaRechazo: c.estatus === 'RECHAZADO' ? new Date(now - Math.floor(Math.random() * 3) * 24 * 60 * 60 * 1000) : undefined,
        },
      })
    })
  )

  // Create recent activities
  await Promise.all([
    db.actividad.create({
      data: {
        tipo: 'CREAR_CANDIDATO',
        descripcion: `${candidatos[0].nombre} ${candidatos[0].apellido} registrado como candidato`,
        entidad: 'candidato',
        entidadId: createdCandidatos[0].id,
        usuarioId: userId,
        candidatoId: createdCandidatos[0].id,
      },
    }),
    db.actividad.create({
      data: {
        tipo: 'CAMBIO_ESTATUS',
        descripcion: `${candidatos[7].nombre} ${candidatos[7].apellido} fue contratado`,
        entidad: 'candidato',
        entidadId: createdCandidatos[7].id,
        usuarioId: userId,
        candidatoId: createdCandidatos[7].id,
      },
    }),
    db.actividad.create({
      data: {
        tipo: 'CAMBIO_ESTATUS',
        descripcion: `${candidatos[4].nombre} ${candidatos[4].apellido} pasó a etapa de entrevista`,
        entidad: 'candidato',
        entidadId: createdCandidatos[4].id,
        usuarioId: userId,
        candidatoId: createdCandidatos[4].id,
      },
    }),
  ])
}

// Helper para obtener o crear usuario demo (todos en la misma empresa)
async function getOrCreateDemoUser(rol: Rol, demoKeyEmail?: string) {
  if (!isDemoModeEnabled) {
    throw new Error('Demo mode is disabled')
  }
  // Si hay email de la demo key, usar ese para crear/actualizar el usuario
  const email = demoKeyEmail || (rol === 'ADMIN' 
    ? 'admin@atlas.demo' 
    : rol === 'GERENTE' 
      ? 'gerente@atlas.demo' 
      : 'reclutador@atlas.demo')

  // Buscar usuario existente
  let user = await db.user.findUnique({
    where: { email },
    include: { empresa: true, equipo: true }
  })

  if (user) {
    return user
  }

  // Crear/obtener empresa demo COMPARTIDA
  const empresa = await getOrCreateDemoEmpresa()
  
  // Crear/obtener equipo demo COMPARTIDO
  const equipo = await getOrCreateDemoEquipo(empresa.id)

  // Crear usuario en la empresa compartida
  user = await db.user.create({
    data: {
      email,
      name: rol === 'ADMIN' ? 'Administrador Demo' : rol === 'GERENTE' ? 'Gerente Demo' : 'Reclutador Demo',
      rol,
      empresaId: empresa.id,
      equipoId: equipo.id,
    },
    include: { empresa: true, equipo: true }
  })

  // Inicializar datos demo (vacantes, candidatos) - solo una vez
  await initializeDemoData(empresa.id, equipo.id)

  return user
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),

  providers: [
    // Google OAuth Provider
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),

    ...(isDemoModeEnabled
      ? [
    // Demo Admin
            CredentialsProvider({
              id: 'demo-admin',
              name: 'Demo Admin',
              credentials: {
                email: { label: 'Email', type: 'text' },
              },
              async authorize(credentials) {
                const user = await getOrCreateDemoUser('ADMIN', credentials?.email || undefined)
                return {
                  id: user.id,
                  email: user.email,
                  name: user.name,
                  image: user.imagen,
                  rol: user.rol,
                  empresaId: user.empresaId,
                  equipoId: user.equipoId,
                }
              },
            }),
        
            // Demo Gerente
            CredentialsProvider({
              id: 'demo-gerente',
              name: 'Demo Gerente',
              credentials: {
                email: { label: 'Email', type: 'text' },
              },
              async authorize(credentials) {
                const user = await getOrCreateDemoUser('GERENTE', credentials?.email || undefined)
                return {
                  id: user.id,
                  email: user.email,
                  name: user.name,
                  image: user.imagen,
                  rol: user.rol,
                  empresaId: user.empresaId,
                  equipoId: user.equipoId,
                }
              },
            }),
        
            // Demo Reclutador
            CredentialsProvider({
              id: 'demo-reclutador',
              name: 'Demo Reclutador',
              credentials: {
                email: { label: 'Email', type: 'text' },
              },
              async authorize(credentials) {
                const user = await getOrCreateDemoUser('RECLUTADOR', credentials?.email || undefined)
                return {
                  id: user.id,
                  email: user.email,
                  name: user.name,
                  image: user.imagen,
                  rol: user.rol,
                  empresaId: user.empresaId,
                  equipoId: user.equipoId,
                }
              },
            }),
        
      ]
      : []),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  callbacks: {
    async signIn({ user, account }) {
      // Para Google OAuth, primer usuario es ADMIN
      if (account?.provider === 'google') {
        try {
          const existingUser = await db.user.findUnique({
            where: { email: user.email! },
          })

          if (!existingUser) {
            // Crear empresa y equipo para nuevo usuario
            const empresa = await db.empresa.create({
              data: {
                nombre: `Organización de ${user.name || 'Usuario'}`,
                activa: true,
              },
            })

            const equipo = await db.equipo.create({
              data: {
                nombre: 'Equipo Principal',
                empresaId: empresa.id,
              },
            })

            const createdUser = await db.user.upsert({
              where: { email: user.email! },
              create: {
                email: user.email!,
                name: user.name,
                imagen: user.image,
                rol: 'ADMIN',
                empresaId: empresa.id,
                equipoId: equipo.id,
              },
              update: {
                rol: 'ADMIN',
                empresaId: empresa.id,
                equipoId: equipo.id,
              },
            })

            try {
              await seedStarterData(empresa.id, equipo.id, createdUser.id)
            } catch (seedError) {
              console.error('Error seeding starter data:', seedError)
            }
          } else if (existingUser.empresaId && existingUser.equipoId) {
            // Existing user: seed data if their empresa is empty
            try {
              await seedStarterData(existingUser.empresaId, existingUser.equipoId, existingUser.id)
            } catch (seedError) {
              console.error('Error seeding data for existing user:', seedError)
            }
          }
        } catch (error) {
          console.error('Error in signIn callback:', error)
        }
      }

      return true
    },

    async jwt({ token, user, trigger, session }) {
      // Al hacer login, agregar datos del usuario al token
      if (user) {
        token.id = user.id
        token.rol = user.rol
        token.empresaId = user.empresaId
        token.equipoId = user.equipoId
        token.permissions = getPermissionsByRole(user.rol as Rol)
      }

      // Actualizar token si hay cambios en la sesión
      if (trigger === 'update' && session) {
        token.rol = session.rol
        token.empresaId = session.empresaId
        token.equipoId = session.equipoId
        token.permissions = getPermissionsByRole(session.rol as Rol)
      }

      return token
    },

    async session({ session, token }) {
      // Agregar datos del token a la sesión
      if (session.user) {
        session.user.id = token.id as string
        session.user.rol = token.rol as Rol
        session.user.empresaId = token.empresaId as string | null
        session.user.equipoId = token.equipoId as string | null
        session.user.permissions = token.permissions as string[]

        if (session.user.rol !== 'ADMIN' && !session.user.empresaId) {
          console.error('Auth session warning: usuario sin tenant asignado', {
            userId: session.user.id,
            email: session.user.email,
            rol: session.user.rol,
          })
          session.user.permissions = []
          ;(session as Session & { authWarning?: string }).authWarning = 'TENANT_NOT_ASSIGNED'
        }
      }

      return session
    },

    async redirect({ url, baseUrl }) {
      // Redirigir a la página principal después del login
      if (url.startsWith('/')) return `${baseUrl}${url}`
      if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },

  events: {
    async signIn({ user, account }) {
      console.log(`✅ Usuario logueado: ${user.email} via ${account?.provider || 'credentials'}`)
    },
    async signOut({ token }) {
      console.log(`👋 Usuario deslogueado: ${token?.email}`)
    },
  },

  debug: process.env.NODE_ENV === 'development',
}

// Extender tipos de NextAuth
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      rol: Rol
      empresaId: string | null
      equipoId: string | null
      permissions?: string[]
    }
  }

  interface User {
    rol: Rol
    empresaId: string | null
    equipoId: string | null
    permissions?: string[]
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    rol: Rol
    empresaId: string | null
    equipoId: string | null
    permissions?: string[]
  }
}
