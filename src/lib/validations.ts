import { z } from 'zod'

// ====================
// ENUMS
// ====================

export const RolSchema = z.enum(['ADMIN', 'GERENTE', 'RECLUTADOR'])
export const EstatusCandidatoSchema = z.enum(['REGISTRADO', 'EN_PROCESO', 'ENTREVISTA', 'CONTRATADO', 'RECHAZADO'])
export const EstatusVacanteSchema = z.enum(['BORRADOR', 'PUBLICADA', 'PAUSADA', 'CERRADA'])
export const PrioridadVacanteSchema = z.enum(['BAJA', 'MEDIA', 'ALTA', 'URGENTE'])
export const FuenteCandidatoSchema = z.enum(['LINKEDIN', 'OCC', 'COMPUTRABAJA', 'REFERIDO', 'AGENCIA', 'FERIA_EMPLEO', 'UNIVERSIDAD', 'RED_SOCIAL', 'OTRO'])
export const TipoDocumentoSchema = z.enum(['CV', 'PORTAFOLIO', 'CERTIFICADO', 'CARTA_RECOMENDACION', 'CONTRATO', 'OTRO'])
export const TipoMetricaSchema = z.enum([
  'TIME_TO_HIRE',
  'COST_PER_HIRE',
  'QUALITY_OF_HIRE',
  'OFFER_ACCEPTANCE_RATE',
  'SOURCE_EFFECTIVENESS',
  'PIPELINE_VELOCITY',
  'CANDIDATES_PER_HIRE',
  'INTERVIEW_TO_OFFER_RATIO',
  'FIRST_YEAR_RETENTION',
  'REQUISITION_FILL_RATE'
])
export const PeriodoMetaSchema = z.enum(['SEMANAL', 'QUINCENAL', 'MENSUAL', 'TRIMESTRAL'])
export const EstatusMetaSchema = z.enum(['PENDIENTE', 'EN_PROGRESO', 'COMPLETADA', 'EXCEDIDA', 'VENCIDA'])

// ====================
// INFO METRICAS
// ====================

export const METRICAS_INFO = {
  TIME_TO_HIRE: {
    nombre: 'Tiempo de Contratación',
    descripcion: 'Días promedio desde la aplicación hasta la contratación',
    unidad: 'días',
    icono: 'clock',
  },
  COST_PER_HIRE: {
    nombre: 'Costo por Contratación',
    descripcion: 'Costo promedio por cada contratación realizada',
    unidad: 'MXN',
    icono: 'dollar-sign',
  },
  QUALITY_OF_HIRE: {
    nombre: 'Calidad de Contratación',
    descripcion: 'Puntuación promedio de rendimiento de los contratados',
    unidad: 'puntos',
    icono: 'star',
  },
  OFFER_ACCEPTANCE_RATE: {
    nombre: 'Tasa de Aceptación de Ofertas',
    descripcion: 'Porcentaje de ofertas aceptadas vs. enviadas',
    unidad: '%',
    icono: 'check-circle',
  },
  SOURCE_EFFECTIVENESS: {
    nombre: 'Efectividad de Fuentes',
    descripcion: 'Tasa de conversión por fuente de reclutamiento',
    unidad: '%',
    icono: 'target',
  },
  PIPELINE_VELOCITY: {
    nombre: 'Velocidad del Pipeline',
    descripcion: 'Candidatos que avanzan por etapa por período',
    unidad: 'candidatos/semana',
    icono: 'trending-up',
  },
  CANDIDATES_PER_HIRE: {
    nombre: 'Candidatos por Contratación',
    descripcion: 'Número promedio de candidatos evaluados por contratación',
    unidad: 'candidatos',
    icono: 'users',
  },
  INTERVIEW_TO_OFFER_RATIO: {
    nombre: 'Ratio Entrevista-Oferta',
    descripcion: 'Entrevistas realizadas por cada oferta enviada',
    unidad: 'ratio',
    icono: 'message-square',
  },
  FIRST_YEAR_RETENTION: {
    nombre: 'Retención Primer Año',
    descripcion: 'Porcentaje de empleados que permanecen después de 12 meses',
    unidad: '%',
    icono: 'user-check',
  },
  REQUISITION_FILL_RATE: {
    nombre: 'Tasa de Cobertura de Vacantes',
    descripcion: 'Porcentaje de vacantes cubiertas en el período',
    unidad: '%',
    icono: 'briefcase',
  },
}

// ====================
// USER SCHEMAS
// ====================

export const UserCreateSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  imagen: z.string().url().optional(),
  telefono: z.string().optional(),
  puesto: z.string().optional(),
  rol: RolSchema.default('RECLUTADOR'),
  empresaId: z.string().optional(),
  equipoId: z.string().optional(),
})

export const UserUpdateSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
  imagen: z.string().url().optional(),
  telefono: z.string().optional(),
  puesto: z.string().optional(),
  rol: RolSchema.optional(),
  empresaId: z.string().nullable().optional(),
  equipoId: z.string().nullable().optional(),
  activo: z.boolean().optional(),
})

// ====================
// EMPRESA SCHEMAS
// ====================

export const EmpresaCreateSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  logo: z.string().url().optional(),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  sitioWeb: z.string().url().optional().or(z.literal('')),
  industria: z.string().optional(),
  tamano: z.string().optional(),
})

export const EmpresaUpdateSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
  logo: z.string().url().optional().or(z.literal('')),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  sitioWeb: z.string().url().optional().or(z.literal('')),
  industria: z.string().optional(),
  tamano: z.string().optional(),
  activa: z.boolean().optional(),
})

// ====================
// EQUIPO SCHEMAS
// ====================

export const EquipoCreateSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  descripcion: z.string().optional(),
  color: z.string().optional(),
  empresaId: z.string().min(1, 'La empresa es requerida'),
  appsScriptUrl: z.string().url('URL inválida').optional().or(z.literal('')),
})

export const EquipoUpdateSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
  descripcion: z.string().optional(),
  color: z.string().optional(),
  appsScriptUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  activo: z.boolean().optional(),
})

// ====================
// CANDIDATO SCHEMAS
// ====================

export const CandidatoCreateSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  apellido: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  telefono: z.string().optional(),
  telefonoAlt: z.string().optional(),
  direccion: z.string().optional(),
  ciudad: z.string().optional(),
  estado: z.string().optional(),
  pais: z.string().optional(),
  codigoPostal: z.string().optional(),
  linkedin: z.string().url().optional().or(z.literal('')),
  portfolio: z.string().url().optional().or(z.literal('')),
  fuente: FuenteCandidatoSchema.default('OTRO'),
  estatus: EstatusCandidatoSchema.default('REGISTRADO'),
  notas: z.string().optional(),
  tags: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  salarioEsperado: z.number().positive().optional(),
  disponibilidad: z.string().optional(),
  googleSheetRowId: z.string().optional(),
  vacanteId: z.string().optional(),
  reclutadorId: z.string().optional(),
  equipoId: z.string().min(1, 'El equipo es requerido'),
})

export const CandidatoUpdateSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
  apellido: z.string().min(2, 'El apellido debe tener al menos 2 caracteres').optional(),
  email: z.string().email('Email inválido').optional(),
  telefono: z.string().optional(),
  telefonoAlt: z.string().optional(),
  direccion: z.string().optional(),
  ciudad: z.string().optional(),
  estado: z.string().optional(),
  pais: z.string().optional(),
  codigoPostal: z.string().optional(),
  linkedin: z.string().url().optional().or(z.literal('')),
  portfolio: z.string().url().optional().or(z.literal('')),
  fuente: FuenteCandidatoSchema.optional(),
  estatus: EstatusCandidatoSchema.optional(),
  notas: z.string().optional(),
  tags: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  salarioEsperado: z.number().positive().optional(),
  disponibilidad: z.string().optional(),
  vacanteId: z.string().nullable().optional(),
  reclutadorId: z.string().nullable().optional(),
})

export const CandidatoBulkActionSchema = z.object({
  ids: z.array(z.string()).min(1, 'Selecciona al menos un candidato'),
  action: z.enum(['cambiar_estatus', 'agregar_nota', 'eliminar', 'asignar_reclutador', 'asignar_vacante', 'agregar_tags']),
  estatus: EstatusCandidatoSchema.optional(),
  nota: z.string().optional(),
  reclutadorId: z.string().optional(),
  vacanteId: z.string().optional(),
  tags: z.string().optional(),
})

// Aplicación pública a vacantes (portal /jobs)
export const PublicApplySchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  apellido: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  telefono: z.string().optional(),
  vacanteId: z.string().min(1, 'La vacante es requerida'),
  mensaje: z.string().optional(),
})

// ====================
// VACANTE SCHEMAS
// ====================


export const AdminAsignarSchema = z.object({
  usuarioId: z.string().optional(),
  equipoId: z.string().optional(),
  candidatoIds: z.array(z.string()).optional(),
  reclutadorId: z.string().optional(),
  vacanteId: z.string().optional(),
  action: z.enum(['asignar_reclutador', 'asignar_vacante', 'desasignar_reclutador', 'desasignar_vacante']).optional(),
})

export const VacanteCreateSchema = z.object({
  titulo: z.string().min(3, 'El título debe tener al menos 3 caracteres'),
  codigo: z.string().optional(),
  descripcion: z.string().optional(),
  requisitos: z.string().optional(),
  beneficios: z.string().optional(),
  ubicacion: z.string().optional(),
  modalidad: z.string().optional(),
  tipoContrato: z.string().optional(),
  salarioMin: z.number().positive('El salario mínimo debe ser positivo').optional(),
  salarioMax: z.number().positive('El salario máximo debe ser positivo').optional(),
  salarioMostrar: z.boolean().default(true),
  estatus: EstatusVacanteSchema.default('BORRADOR'),
  prioridad: PrioridadVacanteSchema.default('MEDIA'),
  empresaId: z.string().min(1, 'La empresa es requerida'),
  reclutadorId: z.string().optional(),
  equipoId: z.string().optional(),
  fechaLimite: z.string().transform(v => v ? new Date(v) : undefined).optional(),
  vacantes: z.number().int().positive().default(1),
})

export const VacanteUpdateSchema = z.object({
  titulo: z.string().min(3, 'El título debe tener al menos 3 caracteres').optional(),
  codigo: z.string().optional(),
  descripcion: z.string().optional(),
  requisitos: z.string().optional(),
  beneficios: z.string().optional(),
  ubicacion: z.string().optional(),
  modalidad: z.string().optional(),
  tipoContrato: z.string().optional(),
  salarioMin: z.number().positive('El salario mínimo debe ser positivo').optional(),
  salarioMax: z.number().positive('El salario máximo debe ser positivo').optional(),
  salarioMostrar: z.boolean().optional(),
  estatus: EstatusVacanteSchema.optional(),
  prioridad: PrioridadVacanteSchema.optional(),
  reclutadorId: z.string().nullable().optional(),
  equipoId: z.string().nullable().optional(),
  fechaLimite: z.string().transform(v => v ? new Date(v) : null).optional().nullable(),
  vacantes: z.number().int().positive().optional(),
})

// ====================
// DOCUMENTO SCHEMAS
// ====================

export const DocumentoCreateSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  tipo: TipoDocumentoSchema.default('CV'),
  candidatoId: z.string().min(1, 'El candidato es requerido'),
})

// ====================
// INVITACION SCHEMAS
// ====================

export const InvitacionCreateSchema = z.object({
  email: z.string().email('Email inválido'),
  rol: RolSchema.default('RECLUTADOR'),
  empresaId: z.string().optional(),
  equipoId: z.string().optional(),
  mensaje: z.string().optional(),
  expiresInDays: z.coerce.number().int().min(1).max(30).default(7),
})

// ====================
// META SCHEMAS
// ====================

export const MetaCreateSchema = z.object({
  reclutadorId: z.string().min(1, 'El reclutador es requerido'),
  tipo: TipoMetricaSchema,
  valor: z.number().positive('El valor debe ser positivo'),
  periodo: PeriodoMetaSchema,
  fechaInicio: z.string().transform(v => new Date(v)),
  fechaFin: z.string().transform(v => new Date(v)),
  notas: z.string().optional(),
})

export const MetaUpdateSchema = z.object({
  valor: z.number().positive('El valor debe ser positivo').optional(),
  valorActual: z.number().optional(),
  notas: z.string().optional(),
  estatus: EstatusMetaSchema.optional(),
})

// ====================
// METRICA CONFIG SCHEMAS
// ====================

export const MetricaConfigCreateSchema = z.object({
  empresaId: z.string().min(1, 'La empresa es requerida'),
  tipo: TipoMetricaSchema,
  nombre: z.string().optional(),
  activa: z.boolean().default(true),
  peso: z.number().min(0).max(10).default(1),
  orden: z.number().int().default(0),
})

export const MetricaConfigUpdateSchema = z.object({
  nombre: z.string().optional(),
  activa: z.boolean().optional(),
  peso: z.number().min(0).max(10).optional(),
  orden: z.number().int().optional(),
})

// ====================
// AUTH SCHEMAS
// ====================

export const LoginSchema = z.object({
  identifier: z.string().min(3, 'Ingresa tu correo o usuario corporativo'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

export const InviteActivationSchema = z.object({
  email: z.string().email('Email inválido'),
  code: z.string().min(6, 'Código inválido'),
  name: z.string().min(2, 'Ingresa tu nombre completo').optional(),
  username: z.string().min(3, 'El usuario debe tener al menos 3 caracteres').max(32).optional(),
  password: z.string().min(10, 'La contraseña debe tener al menos 10 caracteres').optional(),
})

export const PasswordResetRequestSchema = z.object({
  email: z.string().email('Email inválido'),
})

export const PasswordResetSchema = z.object({
  token: z.string().min(1, 'Token requerido'),
  password: z.string().min(10, 'La contraseña debe tener al menos 10 caracteres'),
})

// ====================
// SYNC SCHEMAS
// ====================

export const SyncSchema = z.object({
  equipoId: z.string().min(1, 'El equipo es requerido'),
  contractVersion: z.enum(['v1']).default('v1'),
})

// ====================
// EMAIL SCHEMAS
// ====================

export const EmailSendSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  template: z.enum(['invitacion', 'entrevista', 'oferta', 'rechazo', 'bienvenida']),
  data: z.record(z.string(), z.any()),
})

// ====================
// QUERY SCHEMAS
// ====================

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(15),
})

export const CandidatoFilterSchema = z.object({
  estatus: EstatusCandidatoSchema.optional(),
  reclutadorId: z.string().optional(),
  vacanteId: z.string().optional(),
  fuente: FuenteCandidatoSchema.optional(),
  search: z.string().optional(),
  rating: z.coerce.number().min(1).max(5).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(15),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const VacanteFilterSchema = z.object({
  estatus: EstatusVacanteSchema.optional(),
  empresaId: z.string().optional(),
  reclutadorId: z.string().optional(),
  prioridad: PrioridadVacanteSchema.optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(15),
})

export const MetaFilterSchema = z.object({
  reclutadorId: z.string().optional(),
  tipo: TipoMetricaSchema.optional(),
  periodo: PeriodoMetaSchema.optional(),
  estatus: EstatusMetaSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(15),
})

// ====================
// TYPE EXPORTS
// ====================

export type UserCreate = z.infer<typeof UserCreateSchema>
export type UserUpdate = z.infer<typeof UserUpdateSchema>
export type EmpresaCreate = z.infer<typeof EmpresaCreateSchema>
export type EmpresaUpdate = z.infer<typeof EmpresaUpdateSchema>
export type EquipoCreate = z.infer<typeof EquipoCreateSchema>
export type EquipoUpdate = z.infer<typeof EquipoUpdateSchema>
export type CandidatoCreate = z.infer<typeof CandidatoCreateSchema>
export type CandidatoUpdate = z.infer<typeof CandidatoUpdateSchema>
export type CandidatoBulkAction = z.infer<typeof CandidatoBulkActionSchema>
export type PublicApplyInput = z.infer<typeof PublicApplySchema>
export type VacanteCreate = z.infer<typeof VacanteCreateSchema>
export type VacanteUpdate = z.infer<typeof VacanteUpdateSchema>
export type DocumentoCreate = z.infer<typeof DocumentoCreateSchema>
export type InvitacionCreate = z.infer<typeof InvitacionCreateSchema>
export type MetaCreate = z.infer<typeof MetaCreateSchema>
export type MetaUpdate = z.infer<typeof MetaUpdateSchema>
export type MetricaConfigCreate = z.infer<typeof MetricaConfigCreateSchema>
export type MetricaConfigUpdate = z.infer<typeof MetricaConfigUpdateSchema>
export type LoginInput = z.infer<typeof LoginSchema>
export type InviteActivationInput = z.infer<typeof InviteActivationSchema>
export type PasswordResetRequestInput = z.infer<typeof PasswordResetRequestSchema>
export type PasswordResetInput = z.infer<typeof PasswordResetSchema>
export type SyncInput = z.infer<typeof SyncSchema>
export type EmailSendInput = z.infer<typeof EmailSendSchema>
export type CandidatoFilter = z.infer<typeof CandidatoFilterSchema>
export type VacanteFilter = z.infer<typeof VacanteFilterSchema>
export type MetaFilter = z.infer<typeof MetaFilterSchema>

// Export enum types
export type TipoMetrica = z.infer<typeof TipoMetricaSchema>
export type PeriodoMeta = z.infer<typeof PeriodoMetaSchema>
