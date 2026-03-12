// ATLAS GSE - API de Usuarios

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { UserCreateSchema, UserUpdateSchema } from '@/lib/validations'
import { requireRole, requireSession, requireTenantScope, safeErrorResponse } from '@/lib/api-security'

// GET - Listar usuarios
export async function GET(request: NextRequest) {
  try {
    const { user } = await requireSession()
    requireRole(user, ['ADMIN', 'GERENTE', 'RECLUTADOR'])

    const { searchParams } = new URL(request.url)
    const empresaId = searchParams.get('empresaId')
    const equipoId = searchParams.get('equipoId')

    const where: Record<string, unknown> = {}

    if (user.rol === 'ADMIN') {
      if (empresaId) where.empresaId = empresaId
      if (equipoId) where.equipoId = equipoId
    } else if (user.rol === 'GERENTE') {
      requireTenantScope(user, { empresaId: user.empresaId })
      where.empresaId = user.empresaId
      if (equipoId) where.equipoId = equipoId
    } else {
      where.equipoId = user.equipoId
    }

    const usuarios = await db.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        imagen: true,
        rol: true,
        activo: true,
        empresaId: true,
        equipoId: true,
        createdAt: true,
        empresa: { select: { id: true, nombre: true } },
        equipo: { select: { id: true, nombre: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ usuarios })
  } catch (error) {
    return safeErrorResponse(error, request)
  }
}

// POST - Crear usuario (usado después de aceptar invitación)
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireSession()
    requireRole(user, ['ADMIN', 'GERENTE'])

    const body = await request.json()
    const data = UserCreateSchema.parse(body)

    const existingUser = await db.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 400 })
    }

    if (user.rol === 'GERENTE' && user.empresaId) {
      data.empresaId = user.empresaId
    }

    requireTenantScope(user, { empresaId: data.empresaId })

    const usuario = await db.user.create({
      data,
      select: {
        id: true,
        email: true,
        name: true,
        rol: true,
        empresa: { select: { id: true, nombre: true } },
        equipo: { select: { id: true, nombre: true } },
      },
    })

    return NextResponse.json(usuario, { status: 201 })
  } catch (error) {
    return safeErrorResponse(error, request)
  }
}

// PUT - Actualizar usuario
export async function PUT(request: NextRequest) {
  try {
    const { user } = await requireSession()
    requireRole(user, ['ADMIN', 'GERENTE', 'RECLUTADOR'])

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('id')

    if (!userId) {
      return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 })
    }

    const usuarioAEditar = await db.user.findUnique({
      where: { id: userId },
    })

    if (!usuarioAEditar) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    if (user.rol === 'RECLUTADOR' && userId !== user.id) {
      return NextResponse.json({ error: 'No tienes permiso para editar este usuario' }, { status: 403 })
    }

    if (user.rol === 'GERENTE') {
      requireTenantScope(user, { empresaId: usuarioAEditar.empresaId })
    }

    const body = await request.json()
    const data = UserUpdateSchema.parse(body)

    if (data.equipoId) {
      const equipo = await db.equipo.findUnique({
        where: { id: data.equipoId },
        select: { empresaId: true },
      })
      if (equipo) {
        data.empresaId = equipo.empresaId ?? undefined
      }
    }

    if (user.rol !== 'ADMIN' && usuarioAEditar.rol === 'ADMIN' && data.rol && data.rol !== 'ADMIN') {
      return NextResponse.json({ error: 'No puedes cambiar el rol de un administrador' }, { status: 403 })
    }

    if (user.rol === 'GERENTE' && data.rol === 'ADMIN') {
      return NextResponse.json({ error: 'No tienes permiso para asignar el rol de administrador' }, { status: 403 })
    }

    if (data.empresaId) {
      requireTenantScope(user, { empresaId: data.empresaId })
    }

    const usuario = await db.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        rol: true,
        activo: true,
        empresa: { select: { id: true, nombre: true } },
        equipo: { select: { id: true, nombre: true } },
      },
    })

    await db.actividad.create({
      data: {
        tipo: 'NOTA_AGREGADA',
        descripcion: `Usuario actualizado: ${usuario.name || usuario.email}`,
        entidad: 'usuario',
        entidadId: userId,
        usuarioId: user.id,
      },
    })

    return NextResponse.json(usuario)
  } catch (error) {
    return safeErrorResponse(error, request)
  }
}
