// ATLAS GSE - API de Seed para datos demo

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, requireSession, safeErrorResponse } from '@/lib/api-security'

type FuenteCandidato = 'LINKEDIN' | 'OCC' | 'COMPUTRABAJA' | 'REFERIDO' | 'AGENCIA' | 'FERIA_EMPLEO' | 'UNIVERSIDAD' | 'RED_SOCIAL' | 'OTRO'
type EstatusCandidato = 'REGISTRADO' | 'EN_PROCESO' | 'ENTREVISTA' | 'CONTRATADO' | 'RECHAZADO'

export async function GET(_request: NextRequest) {
  try {
    const { user } = await requireSession()
    requireRole(user, ['ADMIN'])

    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Endpoint deshabilitado en producción' }, { status: 403 })
    }

    // Verificar si ya hay datos
    const existingUsers = await db.user.count()

    if (existingUsers > 0) {
      return NextResponse.json({
        message: 'La base de datos ya contiene datos',
        existingUsers,
      })
    }

    // Crear empresa
    const empresa = await db.empresa.create({
      data: {
        nombre: 'ATLAS Demo Corp',
        activa: true,
      },
    })

    // Crear equipos
    const equipo1 = await db.equipo.create({
      data: {
        nombre: 'Equipo de Tecnología',
        empresaId: empresa.id,
      },
    })

    const equipo2 = await db.equipo.create({
      data: {
        nombre: 'Equipo de Marketing',
        empresaId: empresa.id,
      },
    })

    // Crear usuarios demo
    const adminUser = await db.user.create({
      data: {
        email: 'admin@atlas.demo',
        name: 'Admin Principal',
        rol: 'ADMIN',
        empresaId: empresa.id,
        equipoId: equipo1.id,
      },
    })

    const gerenteUser = await db.user.create({
      data: {
        email: 'gerente@atlas.demo',
        name: 'Gerente de Reclutamiento',
        rol: 'GERENTE',
        empresaId: empresa.id,
        equipoId: equipo1.id,
      },
    })

    const reclutador1 = await db.user.create({
      data: {
        email: 'reclutador1@atlas.demo',
        name: 'Ana Reclutadora',
        rol: 'RECLUTADOR',
        empresaId: empresa.id,
        equipoId: equipo1.id,
      },
    })

    const reclutador2 = await db.user.create({
      data: {
        email: 'reclutador2@atlas.demo',
        name: 'Carlos Reclutador',
        rol: 'RECLUTADOR',
        empresaId: empresa.id,
        equipoId: equipo2.id,
      },
    })

    // Crear vacantes
    const vacantes = await Promise.all([
      db.vacante.create({
        data: {
          titulo: 'Senior Full Stack Developer',
          descripcion: 'Desarrollador con experiencia en React, Node.js y bases de datos SQL/NoSQL. Experiencia en metodologías ágiles.',
          ubicacion: 'Ciudad de México / Remoto',
          salarioMin: 45000,
          salarioMax: 75000,
          estatus: 'PUBLICADA',
          prioridad: 'URGENTE',
          empresaId: empresa.id,
          reclutadorId: reclutador1.id,
        },
      }),
      db.vacante.create({
        data: {
          titulo: 'UX/UI Designer',
          descripcion: 'Diseñador con experiencia en Figma, sistemas de diseño y user research. Portfolio demostrable.',
          ubicacion: 'Remoto',
          salarioMin: 30000,
          salarioMax: 50000,
          estatus: 'PUBLICADA',
          prioridad: 'ALTA',
          empresaId: empresa.id,
          reclutadorId: reclutador1.id,
        },
      }),
      db.vacante.create({
        data: {
          titulo: 'Product Manager',
          descripcion: 'PM con experiencia en productos SaaS, metodologías ágiles y análisis de datos.',
          ubicacion: 'Guadalajara',
          salarioMin: 50000,
          salarioMax: 80000,
          estatus: 'PUBLICADA',
          prioridad: 'MEDIA',
          empresaId: empresa.id,
          reclutadorId: reclutador2.id,
        },
      }),
      db.vacante.create({
        data: {
          titulo: 'DevOps Engineer',
          descripcion: 'Ingeniero con experiencia en AWS/GCP, Kubernetes, CI/CD y automatización.',
          ubicacion: 'Monterrey / Remoto',
          salarioMin: 40000,
          salarioMax: 65000,
          estatus: 'PUBLICADA',
          prioridad: 'ALTA',
          empresaId: empresa.id,
          reclutadorId: reclutador2.id,
        },
      }),
      db.vacante.create({
        data: {
          titulo: 'Data Analyst',
          descripcion: 'Analista con experiencia en SQL, Python, Power BI y visualización de datos.',
          ubicacion: 'Ciudad de México',
          salarioMin: 28000,
          salarioMax: 45000,
          estatus: 'PAUSADA',
          prioridad: 'BAJA',
          empresaId: empresa.id,
        },
      }),
    ])

    // Crear candidatos
    const candidatosData: { nombre: string; apellido: string; email: string; fuente: FuenteCandidato; estatus: EstatusCandidato }[] = [
      { nombre: 'María', apellido: 'García López', email: 'maria.garcia@email.com', fuente: 'LINKEDIN', estatus: 'ENTREVISTA' },
      { nombre: 'Carlos', apellido: 'Rodríguez Martínez', email: 'carlos.rodriguez@email.com', fuente: 'OCC', estatus: 'EN_PROCESO' },
      { nombre: 'Ana', apellido: 'Hernández Pérez', email: 'ana.hernandez@email.com', fuente: 'REFERIDO', estatus: 'ENTREVISTA' },
      { nombre: 'José', apellido: 'López Sánchez', email: 'jose.lopez@email.com', fuente: 'LINKEDIN', estatus: 'REGISTRADO' },
      { nombre: 'Laura', apellido: 'Martínez Ruiz', email: 'laura.martinez@email.com', fuente: 'COMPUTRABAJA', estatus: 'EN_PROCESO' },
      { nombre: 'Miguel', apellido: 'González Torres', email: 'miguel.gonzalez@email.com', fuente: 'LINKEDIN', estatus: 'CONTRATADO' },
      { nombre: 'Sofía', apellido: 'Ramírez Flores', email: 'sofia.ramirez@email.com', fuente: 'OCC', estatus: 'ENTREVISTA' },
      { nombre: 'Diego', apellido: 'Pérez Castro', email: 'diego.perez@email.com', fuente: 'REFERIDO', estatus: 'RECHAZADO' },
      { nombre: 'Valentina', apellido: 'Sánchez Morales', email: 'valentina.sanchez@email.com', fuente: 'LINKEDIN', estatus: 'REGISTRADO' },
      { nombre: 'Andrés', apellido: 'Torres Vega', email: 'andres.torres@email.com', fuente: 'COMPUTRABAJA', estatus: 'EN_PROCESO' },
      { nombre: 'Camila', apellido: 'Flores Ríos', email: 'camila.flores@email.com', fuente: 'LINKEDIN', estatus: 'ENTREVISTA' },
      { nombre: 'Roberto', apellido: 'Rivera Mendoza', email: 'roberto.rivera@email.com', fuente: 'OTRO', estatus: 'REGISTRADO' },
      { nombre: 'Isabella', apellido: 'Díaz Moreno', email: 'isabella.diaz@email.com', fuente: 'LINKEDIN', estatus: 'EN_PROCESO' },
      { nombre: 'Fernando', apellido: 'Mendoza Cruz', email: 'fernando.mendoza@email.com', fuente: 'OCC', estatus: 'RECHAZADO' },
      { nombre: 'Gabriela', apellido: 'Ortiz Jiménez', email: 'gabriela.ortiz@email.com', fuente: 'REFERIDO', estatus: 'CONTRATADO' },
    ]

    const candidatos = await Promise.all(
      candidatosData.map((c, i) =>
        db.candidato.create({
          data: {
            ...c,
            telefono: `+52 55 1234 ${String(5000 + i).slice(1)}`,
            notas: i % 3 === 0 ? 'Candidato destacado en entrevista técnica' : null,
            vacanteId: vacantes[i % vacantes.length].id,
            reclutadorId: i % 2 === 0 ? reclutador1.id : reclutador2.id,
            equipoId: i % 2 === 0 ? equipo1.id : equipo2.id,
          },
        })
      )
    )

    return NextResponse.json({
      message: 'Datos demo creados exitosamente',
      data: {
        empresa: empresa.nombre,
        equipos: 2,
        usuarios: 4,
        vacantes: vacantes.length,
        candidatos: candidatos.length,
      },
    })
  } catch (error) {
    return safeErrorResponse(error)
  }
}
