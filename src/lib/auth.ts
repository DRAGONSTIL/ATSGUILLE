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

            // El PrismaAdapter puede no haber creado el usuario todavía,
            // así que usamos upsert para manejar ambos casos
            await db.user.upsert({
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
          }
        } catch (error) {
          console.error('Error in signIn callback:', error)
          // No bloquear el login por errores en la asignación de empresa
          // El usuario se creará sin empresa y se puede asignar después
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
