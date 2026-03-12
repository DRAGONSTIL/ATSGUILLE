// ATLAS GSE - API de Empresas

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { EmpresaCreateSchema, EmpresaUpdateSchema } from '@/lib/validations'
import { checkRateLimitAsync, getRateLimitIdentifier } from '@/lib/rate-limit'

// GET - Listar empresas
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    let empresas

    if (session.user.rol === 'ADMIN') {
      // Admin ve todas las empresas
      empresas = await db.empresa.findMany({
        include: {
          _count: { select: { equipos: true, usuarios: true, vacantes: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
    } else {
      // Otros roles solo ven su empresa
      if (!session.user.empresaId) {
        return NextResponse.json({ empresas: [] })
      }
      empresas = await db.empresa.findMany({
        where: { id: session.user.empresaId },
        include: {
          _count: { select: { equipos: true, usuarios: true, vacantes: true } },
        },
      })
    }

    // Transformar para incluir conteos
    const empresasConConteo = empresas.map((e) => ({
      ...e,
      equiposCount: e._count.equipos,
      usuariosCount: e._count.usuarios,
      vacantesCount: e._count.vacantes,
      _count: undefined,
    }))

    return NextResponse.json({ empresas: empresasConConteo })
  } catch (error) {
    console.error('Error obteniendo empresas:', error)
    return NextResponse.json(
      { error: 'Error al obtener empresas', details: String(error) },
      { status: 500 }
    )
  }
}

// POST - Crear empresa
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo ADMIN puede crear empresas
    if (session.user.rol !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo los administradores pueden crear empresas' }, { status: 403 })
    }

    // Rate limiting
    const rateLimitResult = await checkRateLimitAsync(
      getRateLimitIdentifier(request, session.user.id),
      'create'
    )
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: rateLimitResult.error },
        { status: 429, headers: rateLimitResult.headers }
      )
    }

    const body = await request.json()
    const data = EmpresaCreateSchema.parse(body)

    const empresa = await db.empresa.create({
      data,
    })

    return NextResponse.json(empresa, { status: 201 })
  } catch (error) {
    console.error('Error creando empresa:', error)
    return NextResponse.json(
      { error: 'Error al crear empresa', details: String(error) },
      { status: 500 }
    )
  }
}

// PUT - Actualizar empresa
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID de empresa requerido' }, { status: 400 })
    }

    const body = await request.json()
    const data = EmpresaUpdateSchema.parse(body)

    // Solo ADMIN puede actualizar cualquier empresa
    // GERENTE solo puede actualizar su empresa
    if (session.user.rol === 'GERENTE') {
      if (id !== session.user.empresaId) {
        return NextResponse.json({ error: 'No tienes permiso para editar esta empresa' }, { status: 403 })
      }
    } else if (session.user.rol !== 'ADMIN') {
      return NextResponse.json({ error: 'No tienes permiso para editar empresas' }, { status: 403 })
    }

    const empresa = await db.empresa.update({
      where: { id },
      data,
    })

    return NextResponse.json(empresa)
  } catch (error) {
    console.error('Error actualizando empresa:', error)
    return NextResponse.json(
      { error: 'Error al actualizar empresa', details: String(error) },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar empresa
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo ADMIN puede eliminar empresas
    if (session.user.rol !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo los administradores pueden eliminar empresas' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID de empresa requerido' }, { status: 400 })
    }

    // Verificar que no tenga datos asociados
    const empresa = await db.empresa.findUnique({
      where: { id },
      include: {
        _count: { select: { equipos: true, usuarios: true, vacantes: true } },
      },
    })

    if (!empresa) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })
    }

    if (empresa._count.equipos > 0 || empresa._count.usuarios > 0 || empresa._count.vacantes > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar una empresa con datos asociados' },
        { status: 400 }
      )
    }

    await db.empresa.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error eliminando empresa:', error)
    return NextResponse.json(
      { error: 'Error al eliminar empresa', details: String(error) },
      { status: 500 }
    )
  }
}
