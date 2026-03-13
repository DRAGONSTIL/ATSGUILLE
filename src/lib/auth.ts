import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { InvitationStatus, Rol, UserStatus, type User } from '@prisma/client'
import { type Session, type NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { db } from '@/lib/db'
import { getPermissionsByRole } from '@/lib/authorization'
import { normalizeEmail, normalizeUsername, verifyPassword } from '@/lib/auth-helpers'
import { findPendingInvitationByEmail } from '@/lib/invitation-helpers'

async function getAuthUser(user: { id?: string | null; email?: string | null }): Promise<User | null> {
  if (user.id) {
    const byId = await db.user.findUnique({ where: { id: user.id } })
    if (byId) {
      return byId
    }
  }

  if (user.email) {
    return db.user.findUnique({ where: { email: normalizeEmail(user.email) } })
  }

  return null
}

function authErrorPath(code: string): string {
  return `/login?error=${encodeURIComponent(code)}`
}

async function activateInvitedUser(email: string, googleId?: string | null, profile?: { name?: string | null; image?: string | null }) {
  const invitation = await findPendingInvitationByEmail(email)

  if (!invitation || invitation.status !== InvitationStatus.PENDING) {
    return null
  }

  const user = await db.user.upsert({
    where: { email: normalizeEmail(email) },
    create: {
      email: normalizeEmail(email),
      name: profile?.name ?? null,
      imagen: profile?.image ?? null,
      googleId: googleId ?? null,
      status: UserStatus.ACTIVE,
      activo: true,
      rol: invitation.rol,
      empresaId: invitation.empresaId,
      equipoId: invitation.equipoId,
      invitedById: invitation.invitadoPorId ?? null,
    },
    update: {
      name: profile?.name ?? undefined,
      imagen: profile?.image ?? undefined,
      googleId: googleId ?? undefined,
      status: UserStatus.ACTIVE,
      activo: true,
      rol: invitation.rol,
      empresaId: invitation.empresaId,
      equipoId: invitation.equipoId,
      invitedById: invitation.invitadoPorId ?? undefined,
    },
  })

  await db.invitacion.update({
    where: { id: invitation.id },
    data: {
      status: InvitationStatus.USED,
      usedAt: new Date(),
    },
  })

  return user
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Acceso corporativo',
      credentials: {
        identifier: { label: 'Correo o usuario', type: 'text' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        const identifier = credentials?.identifier?.trim()
        const password = credentials?.password

        if (!identifier || !password) {
          throw new Error('MISSING_CREDENTIALS')
        }

        const user = identifier.includes('@')
          ? await db.user.findUnique({ where: { email: normalizeEmail(identifier) } })
          : await db.user.findUnique({ where: { username: normalizeUsername(identifier) } })

        if (!user) {
          throw new Error('INVALID_CREDENTIALS')
        }

        if (!user.activo || user.status === UserStatus.SUSPENDED) {
          throw new Error('ACCOUNT_SUSPENDED')
        }

        if (user.status !== UserStatus.ACTIVE || !user.passwordHash) {
          throw new Error('ACCOUNT_NOT_ACTIVATED')
        }

        const validPassword = await verifyPassword(password, user.passwordHash)
        if (!validPassword) {
          throw new Error('INVALID_CREDENTIALS')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.imagen,
          rol: user.rol,
          empresaId: user.empresaId,
          equipoId: user.equipoId,
          status: user.status,
        }
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== 'google' || !user.email) {
        return true
      }

      const normalizedEmail = normalizeEmail(user.email)
      const existingUser = await db.user.findUnique({
        where: { email: normalizedEmail },
      })

      if (!existingUser) {
        const activated = await activateInvitedUser(normalizedEmail, account.providerAccountId, {
          name: user.name,
          image: user.image,
        })

        return activated ? true : authErrorPath('GOOGLE_NOT_AUTHORIZED')
      }

      if (!existingUser.activo || existingUser.status === UserStatus.SUSPENDED) {
        return authErrorPath('ACCOUNT_SUSPENDED')
      }

      if (existingUser.status !== UserStatus.ACTIVE) {
        const activated = await activateInvitedUser(normalizedEmail, account.providerAccountId, {
          name: user.name,
          image: user.image,
        })

        return activated ? true : authErrorPath('ACCOUNT_NOT_ACTIVATED')
      }

      await db.user.update({
        where: { id: existingUser.id },
        data: {
          googleId: account.providerAccountId,
          imagen: user.image ?? existingUser.imagen,
          name: user.name ?? existingUser.name,
        },
      })

      return true
    },
    async jwt({ token, user }) {
      const dbUser = await getAuthUser({
        id: (user as { id?: string | null } | undefined)?.id ?? (token.id as string | undefined),
        email: user?.email ?? (token.email as string | undefined),
      })

      if (dbUser) {
        token.id = dbUser.id
        token.email = dbUser.email
        token.name = dbUser.name
        token.picture = dbUser.imagen
        token.rol = dbUser.rol
        token.empresaId = dbUser.empresaId
        token.equipoId = dbUser.equipoId
        token.permissions = getPermissionsByRole(dbUser.rol)
        token.status = dbUser.status
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = (token.name as string | null | undefined) ?? null
        session.user.image = (token.picture as string | null | undefined) ?? null
        session.user.rol = token.rol as Rol
        session.user.empresaId = (token.empresaId as string | null | undefined) ?? null
        session.user.equipoId = (token.equipoId as string | null | undefined) ?? null
        session.user.permissions = (token.permissions as string[] | undefined) ?? []
        session.user.status = token.status as UserStatus

        if (session.user.rol !== 'ADMIN' && !session.user.empresaId) {
          session.user.permissions = []
          ;(session as Session & { authWarning?: string }).authWarning = 'TENANT_NOT_ASSIGNED'
        }
      }

      return session
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`
      }

      if (new URL(url).origin === baseUrl) {
        return url
      }

      return baseUrl
    },
  },
  events: {
    async signIn({ user }) {
      const dbUser = await getAuthUser(user)
      if (!dbUser) {
        return
      }

      await db.user.update({
        where: { id: dbUser.id },
        data: { ultimoAcceso: new Date() },
      })
    },
  },
  debug: process.env.NODE_ENV === 'development',
}

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
      status: UserStatus
      permissions?: string[]
    }
  }

  interface User {
    rol: Rol
    empresaId: string | null
    equipoId: string | null
    status: UserStatus
    permissions?: string[]
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    rol: Rol
    empresaId: string | null
    equipoId: string | null
    status: UserStatus
    permissions?: string[]
  }
}
